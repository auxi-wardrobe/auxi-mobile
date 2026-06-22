#!/usr/bin/env bash
# Build + deploy the auxi web review surface to Cloudflare Pages.
# Auth-aware: works with either `wrangler login` (OAuth) OR a CLOUDFLARE_API_TOKEN.
set -euo pipefail
cd "$(dirname "$0")/.."   # auxi root

# Load local, gitignored deploy env if present (CLOUDFLARE_API_TOKEN, ACCOUNT_ID).
if [ -f .env.deploy ]; then set -a; . ./.env.deploy; set +a; fi
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-b486fb51a808d6c53183f43594357793}"

# Auth gate: need either an API token in env, or an existing wrangler login.
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && ! npx wrangler whoami >/dev/null 2>&1; then
  cat <<'MSG'
✗ No Cloudflare auth on this machine. One-time setup (pick ONE):

  (a) Browser login (needs access to the Cloudflare account duc2820@gmail.com):
        npx wrangler login

  (b) API token (headless / recommended for the designer):
        1. Cloudflare dashboard > My Profile > API Tokens > Create Token
           > template "Cloudflare Pages — Edit"  (account: duc2820@gmail.com)
        2. Copy auxi/.env.deploy.example to auxi/.env.deploy and fill:
             CLOUDFLARE_API_TOKEN=<the token>
             CLOUDFLARE_ACCOUNT_ID=b486fb51a808d6c53183f43594357793

Then run the deploy again.
MSG
  exit 1
fi

echo "→ building web bundle…"
npx vite build
# NOTE: --commit-dirty is a wrangler flag (deploy with a dirty git tree).
# It does NOT create any git commit. This script never touches git.
echo "→ deploying preview to Cloudflare Pages (auxi-web-review)…"
npx wrangler pages deploy dist-web --project-name auxi-web-review --branch main --commit-dirty=true
