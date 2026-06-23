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

# ---------- 2. Slack notification ----------
BE_ENV="../wardrobe-backend/.env"
if [ -z "${SLACK_BOT_TOKEN:-}" ] && [ -f "$BE_ENV" ]; then
  SLACK_BOT_TOKEN="$(strip_quotes "$(grep -m1 '^SLACK_BOT_TOKEN=' "$BE_ENV" | cut -d= -f2-)")"
fi
if [ -z "${SLACK_DEFAULT_CHANNEL:-}" ] && [ -f "$BE_ENV" ]; then
  SLACK_DEFAULT_CHANNEL="$(strip_quotes "$(grep -m1 '^SLACK_DEFAULT_CHANNEL=' "$BE_ENV" | cut -d= -f2-)")"
fi

if [ -n "${SLACK_BOT_TOKEN:-}" ] && [ -n "${SLACK_DEFAULT_CHANNEL:-}" ] && command -v python3 >/dev/null 2>&1; then
  # Pull the GitHub release notes (generated changelog) and reshape into a
  # Slack bullet list of what shipped — "• <PR title> (#NN)", capped to 25.
  NOTES=""
  if command -v gh >/dev/null 2>&1; then
    NOTES="$(gh release view "$TAG" -R "$REPO" --json body --jq '.body' 2>/dev/null || true)"
  fi
  CHANGES="$(printf '%s\n' "$NOTES" | python3 -c '
import sys, re
out = []
for ln in sys.stdin:
    m = re.match(r"\s*[*-]\s+(.*)", ln.rstrip("\n"))
    if not m:
        continue
    item = m.group(1)
    pm = re.search(r"/pull/(\d+)", item)
    pr = " (#%s)" % pm.group(1) if pm else ""
    item = re.sub(r"\s+by @\S+.*$", "", item).strip()
    if item:
        out.append("• " + item + pr)
print("\n".join(out[:25]))
' 2>/dev/null || true)"
  [ -z "$CHANGES" ] && CHANGES="• See full notes: ${RELEASE_URL}"

  TEXT=":rocket: *Auxi ${MARKETING_VERSION:-?} (build ${BUILD_NUMBER:-?}) — TestFlight*
Release: <${RELEASE_URL}|${TAG}>
:hourglass_flowing_sand: Apple processing — internal testers get it shortly.

*What's in this build:*
${CHANGES}"
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
