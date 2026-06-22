#!/usr/bin/env bash
# Legacy alt-path: POST-trigger a Cloudflare Pages build of web-base (production).
# Default designer flow is scripts/deploy-preview.sh (git push web-preview/*).
# Server-side build (Cloudflare infra) handles everything; this only POSTs a hook.
# No git, no local build env needed (just curl + the hook URL).
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env.deploy ]; then set -a; . ./.env.deploy; set +a; fi
if [ -z "${PAGES_DEPLOY_HOOK:-}" ]; then
  cat <<'MSG'
✗ PAGES_DEPLOY_HOOK is not set.
  Get it from: Cloudflare > Workers & Pages > auxi-web-review > Settings >
  Builds & deployments > Deploy hooks. Then add to auxi/.env.deploy:
     PAGES_DEPLOY_HOOK=https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/XXX
MSG
  exit 1
fi
echo "→ triggering Cloudflare build of web-base…"
curl -fsS -X POST "$PAGES_DEPLOY_HOOK" >/dev/null
echo "✅ Build triggered. Live in ~1–2 min at https://auxi-web-review.pages.dev"
echo "   (hard-refresh: Cmd+Shift+R). Watch progress in the Cloudflare dashboard."
