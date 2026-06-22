---
name: deploy-auxi-web
description: '"Sandbox" is THIS repo''s web-preview feature. Use whenever someone mentions sandbox — "sandbox", "sandbox đi", "deploy sandbox", "lên sandbox", "xem sandbox", "tạo sandbox", "sandbox là gì", or "deploy đi", "preview", "xem trên web", "ship a preview". It publishes the CURRENT working changes to Cloudflare Pages and returns a clickable preview URL. Works from ANY branch (the build tooling lives on web-base; handle that silently). Never touches main, never opens a PR. In this repo "sandbox" is NEVER a generic security/container sandbox.'
---

# Sandbox — web preview (designer flow)

**Sandbox** = this repo's web preview: the RN app built for the browser and
published to Cloudflare Pages so a designer sees their change at a URL — no
simulator, no local build. In this repo, "sandbox" ALWAYS means this (never a
generic security/container sandbox).

## If they're only ASKING ("sandbox là gì?")
Answer in 1–2 lines using the definition above, then offer to deploy one. Do NOT
explain container/bash/security sandboxes — that is the wrong meaning here.

## To deploy a sandbox — works from ANY branch

The build tooling (vite, `functions/`, `scripts/deploy-preview.sh`) lives on the
**`web-base`** branch. Handle branches FOR the designer — never make them switch
branches or read git output. Show them only a short "đang deploy…" and the final
🔗 link.

1. Pick a 1–3 word slug for what changed, e.g. `home-black-bg`.

2. **If the current branch already has `vite.config.ts` AND
   `scripts/deploy-preview.sh`** (it is web-base or based on it) — just run:
   ```bash
   yarn web:deploy:preview "<slug>"
   ```
   Give the designer the URL it prints. Done.

3. **Otherwise** (current branch has no web tooling, e.g. based on main) — replay
   the designer's edits onto a fresh `web-preview/*` branch cut from web-base:
   ```bash
   git add -A
   git diff --cached > /tmp/sbx.patch            # capture edits incl. new files
   git fetch -q origin web-base
   TS=$(date +%y%m%d-%H%M%S); SLUG=<slug, <=16 chars, a-z0-9->
   git worktree add -b "web-preview/${TS}-${SLUG}" /tmp/auxi-sbx origin/web-base
   git -C /tmp/auxi-sbx apply /tmp/sbx.patch      # if it fails: apply --3way
   git -C /tmp/auxi-sbx add -A
   git -C /tmp/auxi-sbx commit -q -m "preview: ${SLUG} (${TS})"
   git -C /tmp/auxi-sbx push -q origin "web-preview/${TS}-${SLUG}"
   git worktree remove --force /tmp/auxi-sbx
   ```
   The designer's edits stay staged on their branch (untouched). Preview URL =
   `https://` + `web-preview-${TS}-${SLUG}` (lowercased, non-alnum→`-`, cut to 28
   chars) + `.auxi-web-review.pages.dev`.

4. Reply with just: "🔗 <url> — xong sau ~1–2 phút, hard-refresh Cmd+Shift+R."
   Each deploy = its own URL; many designers in parallel never collide.

## Rules
- Deploy branch is ALWAYS under `web-preview/*` (Cloudflare builds only that
  prefix; production = `web-base`).
- NEVER push/merge `main` or `web-base`; NEVER open a PR. Promoting a change to
  the real app is a separate, human-reviewed step.
- No Cloudflare token / local build needed — `git push` triggers the server-side
  build. Real backend data shows (server-side auth proxy; no creds in bundle).
- Leave the designer's working changes intact on their branch afterwards.

## Notes
- Designer guide: `docs/designer-quickstart.md`. One-time infra:
  `docs/web-review-cf-git-setup.md`.
