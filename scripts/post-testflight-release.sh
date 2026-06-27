#!/usr/bin/env bash
# Zero-touch auto-chain after a successful TestFlight upload:
#   1. create the GitHub Release for the tag (idempotent)
#   2. fire a Slack notification to the team channel
#
# Invoked by the Fastfile `beta` lane after upload_to_testflight +
# write_release_metadata. Fire-and-forget: ALWAYS exits 0 — a notification
# failure must never fail a build that is already on Apple's servers.
#
# Inputs (env, falling back to the metadata file the lane wrote):
#   TAG, BUILD_NUMBER, MARKETING_VERSION   (else sourced from release-metadata.env)
# Slack creds (env first, else wardrobe-backend/.env):
#   SLACK_BOT_TOKEN, SLACK_DEFAULT_CHANNEL

set -uo pipefail
cd "$(dirname "$0")/.."   # auxi repo root

REPO="auxi-wardrobe/auxi-mobile"
ARCHIVE_DIR="${TMPDIR:-/tmp}/auxi-archive"
META="$ARCHIVE_DIR/release-metadata.env"

# Source build metadata (TAG / BUILD_NUMBER / MARKETING_VERSION) if not in env.
if [ -s "$META" ]; then set -a; . "$META"; set +a; fi
TAG="${TAG:-}"
if [ -z "$TAG" ]; then echo ">>> post-testflight: no TAG — skipping auto-chain"; exit 0; fi

strip_quotes() { local v="$1"; v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"; printf '%s' "$v"; }

# ---------- 1. GitHub Release (idempotent) ----------
RELEASE_URL="https://github.com/$REPO/releases/tag/$TAG"
if command -v gh >/dev/null 2>&1; then
  if gh release view "$TAG" -R "$REPO" >/dev/null 2>&1; then
    echo ">>> GH release $TAG already exists — skip"
  elif gh release create "$TAG" -R "$REPO" --title "TestFlight $TAG" --generate-notes >/tmp/ghrel.out 2>/tmp/ghrel.err; then
    echo ">>> Created GitHub Release for $TAG"
  else
    echo ">>> WARN: gh release create failed:" >&2; sed 's/^/    /' /tmp/ghrel.err >&2 || true
  fi
else
  echo ">>> gh CLI not installed — skipping GitHub Release"
fi

# ---------- 1b. "What's in this build" — PR list from the release notes ----------
# Pull the GitHub-generated notes (PR titles + numbers) so the Slack post shows
# the actual changelog, not just a bare link. API-based (gh release view) so it
# works on CI's shallow checkout, where `git log <prev>..<tag>` has no history.
CHANGES=""
if command -v gh >/dev/null 2>&1; then
  NOTES="$(gh release view "$TAG" -R "$REPO" --json body -q '.body' 2>/dev/null || true)"
  # "* <title> by @<user> in <url>/pull/<n>"  ->  "• <title> (#<n>)"
  ALL_CHANGES="$(printf '%s\n' "$NOTES" \
    | sed -nE 's|^\* (.+) by @[^ ]+ in https://github\.com/[^ ]+/pull/([0-9]+)$|• \1 (#\2)|p')"
  CHANGES="$(printf '%s\n' "$ALL_CHANGES" | head -30)"
  N_TOTAL=$(printf '%s' "$ALL_CHANGES" | grep -c '^•' || true)
  if [ "${N_TOTAL:-0}" -gt 30 ]; then
    CHANGES="${CHANGES}
• …and $((N_TOTAL - 30)) more — see the release"
  fi
fi

# ---------- 2. Slack notification ----------
BE_ENV="../wardrobe-backend/.env"
if [ -z "${SLACK_BOT_TOKEN:-}" ] && [ -f "$BE_ENV" ]; then
  SLACK_BOT_TOKEN="$(strip_quotes "$(grep -m1 '^SLACK_BOT_TOKEN=' "$BE_ENV" | cut -d= -f2-)")"
fi
if [ -z "${SLACK_DEFAULT_CHANNEL:-}" ] && [ -f "$BE_ENV" ]; then
  SLACK_DEFAULT_CHANNEL="$(strip_quotes "$(grep -m1 '^SLACK_DEFAULT_CHANNEL=' "$BE_ENV" | cut -d= -f2-)")"
fi

if [ -n "${SLACK_BOT_TOKEN:-}" ] && [ -n "${SLACK_DEFAULT_CHANNEL:-}" ] && command -v python3 >/dev/null 2>&1; then
  TEXT=":rocket: *Auxi ${MARKETING_VERSION:-?} (build ${BUILD_NUMBER:-?}) — TestFlight*
Release: <${RELEASE_URL}|${TAG}>
:hourglass_flowing_sand: Apple processing — internal testers get it shortly."
  if [ -n "$CHANGES" ]; then
    TEXT="${TEXT}

*What's in this build:*
${CHANGES}"
  fi
  PAYLOAD="$(CH="$SLACK_DEFAULT_CHANNEL" TXT="$TEXT" python3 -c 'import json,os;print(json.dumps({"channel":os.environ["CH"],"text":os.environ["TXT"],"unfurl_links":False}))')"
  curl -sS -X POST https://slack.com/api/chat.postMessage \
    -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
    -H "Content-Type: application/json; charset=utf-8" \
    --data "$PAYLOAD" -o /tmp/slack_notify.json 2>/dev/null || true
  OK="$(python3 -c 'import json;print(json.load(open("/tmp/slack_notify.json")).get("ok"))' 2>/dev/null || echo '?')"
  echo ">>> Slack notify ok=$OK (channel $SLACK_DEFAULT_CHANNEL)"
else
  echo ">>> Slack notify skipped — need SLACK_BOT_TOKEN + SLACK_DEFAULT_CHANNEL (env or wardrobe-backend/.env)"
fi

exit 0
