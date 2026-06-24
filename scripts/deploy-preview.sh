#!/usr/bin/env bash
# Designer "deploy/preview": snapshot the current edits onto a fresh
# web-preview/* branch and push it. Cloudflare auto-builds it into a unique
# preview URL. No CF token, no local build toolchain needed — just git.
# Never touches main or web-base.
#
# The branch MUST live under the web-preview/ prefix: Cloudflare is configured to
# build ONLY web-preview/* branches (production = web-base). Any other branch is
# ignored, so two designers never collide — every deploy is its own branch+URL.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f vite.config.ts ] || { echo "✗ Not on a web base (no vite.config.ts). Switch to 'web-base' (or an existing web-preview/* branch) first."; exit 1; }
DESC="${1:-home}"
SLUG=$(printf '%s' "$DESC" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-*//;s/-*$//' | cut -c1-16)
[ -z "$SLUG" ] && SLUG=home
TS=$(date +%y%m%d-%H%M%S)
# Timestamp FIRST: the "web-preview-" alias prefix is long, and Cloudflare caps
# the branch alias at 28 chars. Putting the unique TS up front guarantees the
# preview URL stays unique even when the (decorative) slug gets truncated.
BR="web-preview/${TS}-${SLUG}"
git checkout -q -b "$BR"
# Strip iOS-only toolchain files from this disposable preview branch so Cloudflare
# does NOT detect Ruby. Otherwise CF spends ~2.5 min compiling Ruby from source
# (asdf, not cached) + running `bundle install` (cocoapods/activesupport) that the
# web build never uses. Safe: web-preview/* is throwaway and never builds iOS; the
# Gemfile stays intact on main for the iOS toolchain.
git rm -q --ignore-unmatch Gemfile Gemfile.lock .ruby-version .tool-versions >/dev/null 2>&1 || true
git add -A
git commit -q --allow-empty -m "preview: ${SLUG} (${TS})"
git push -q origin "$BR"
ALIAS=$(printf '%s' "$BR" | tr '/' '-' | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9-' '-' | cut -c1-28 | sed 's/-*$//')
echo ""
echo "✅ Pushed ${BR} — Cloudflare is building it now."
echo "🔗 Preview (ready ~1–2 min, hard-refresh Cmd+Shift+R):"
echo "   https://${ALIAS}.auxi-web-review.pages.dev"
