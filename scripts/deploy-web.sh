#!/usr/bin/env bash
# Build + deploy the auxi web review surface to Cloudflare Pages (PREVIEW ONLY).
# Each run publishes a versioned URL tied to the git commit hash, AND refreshes
# a stable "latest" alias. NEVER touches git (no commit/push/PR/merge).
set -euo pipefail
cd "$(dirname "$0")/.."   # auxi root

# Load local, gitignored deploy env if present (CLOUDFLARE_API_TOKEN, ACCOUNT_ID).
if [ -f .env.deploy ]; then set -a; . ./.env.deploy; set +a; fi
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-b486fb51a808d6c53183f43594357793}"

# Auth gate: need either an API token in env, or an existing wrangler login.
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && ! npx wrangler whoami >/dev/null 2>&1; then
  cat <<'MSG'
✗ No Cloudflare auth on this machine. One-time setup (pick ONE):
  (a) npx wrangler login        # browser OAuth (needs the CF account duc2820@gmail.com)
  (b) Cloudflare dashboard > My Profile > API Tokens > Create Token
        > "Cloudflare Pages — Edit", then:
        cp .env.deploy.example .env.deploy   # fill CLOUDFLARE_API_TOKEN
Then run the deploy again.
MSG
  exit 1
fi

echo "→ building web bundle…"
npx vite build

# --- version label tied to commit hash (+ timestamp for uniqueness) ---
SHORT=$(git rev-parse --short=8 HEAD 2>/dev/null || echo nogit)
if git rev-parse HEAD >/dev/null 2>&1 && ! { git diff --quiet && git diff --cached --quiet; }; then
  DIRTY="-wip"   # working tree has uncommitted edits (preview of base commit + changes)
else
  DIRTY=""
fi
STAMP=$(date +%y%m%d-%H%M)
VERSION=$(printf '%s' "${SHORT}${DIRTY}-${STAMP}" | tr 'A-Z' 'a-z' | tr -cs 'a-z0-9-' '-' | sed 's/-*$//' | cut -c1-28)
HEADHASH=$(git rev-parse HEAD 2>/dev/null || true)

META=()
if [ -n "$HEADHASH" ]; then META=(--commit-hash "$HEADHASH" --commit-message "web preview $VERSION"); fi

# NOTE: --commit-dirty is a wrangler flag (deploy with a dirty git tree).
# It does NOT create any git commit. This script never touches git.
echo "→ deploying versioned preview: $VERSION"
npx wrangler pages deploy dist-web --project-name auxi-web-review --branch "$VERSION" --commit-dirty=true "${META[@]}"

echo "→ refreshing 'latest' alias…"
npx wrangler pages deploy dist-web --project-name auxi-web-review --branch main --commit-dirty=true "${META[@]}" >/dev/null 2>&1 || echo "  (latest alias update skipped)"

echo ""
echo "✅ Preview deployed (no git touched):"
echo "   🔗 This version: https://${VERSION}.auxi-web-review.pages.dev"
echo "   🔗 Latest:       https://auxi-web-review.pages.dev"
