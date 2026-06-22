#!/usr/bin/env bash
# Designer "deploy/preview": commit current edits to a fresh preview branch and
# push it. Cloudflare auto-builds it into a unique preview URL. No CF token, no
# local build toolchain needed — just git. Never touches main.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f vite.config.ts ] || { echo "✗ Not on the web-review base (no vite.config.ts). Run on the 'web-preview' branch (or a branch based on it)."; exit 1; }
DESC="${1:-home}"
SLUG=$(printf '%s' "$DESC" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-*//;s/-*$//' | cut -c1-16)
[ -z "$SLUG" ] && SLUG=home
TS=$(date +%y%m%d-%H%M%S)
BR="preview/${SLUG}-${TS}"
git checkout -q -b "$BR"
git add -A
git commit -q --allow-empty -m "preview: ${SLUG} (${TS})"
git push -q origin "$BR"
ALIAS=$(printf '%s' "$BR" | tr '/' '-' | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9-' '-' | cut -c1-28 | sed 's/-*$//')
echo ""
echo "✅ Pushed ${BR} — Cloudflare is building it now."
echo "🔗 Preview (ready ~1–2 min, hard-refresh Cmd+Shift+R):"
echo "   https://${ALIAS}.auxi-web-review.pages.dev"
