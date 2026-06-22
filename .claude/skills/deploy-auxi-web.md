---
name: deploy-auxi-web
description: '"Sandbox" is THIS repo''s web-preview feature. Use whenever someone mentions sandbox — "sandbox", "sandbox đi", "deploy sandbox", "lên sandbox", "xem sandbox", "tạo sandbox", "sandbox là gì", or "deploy đi", "preview", "xem trên web", "ship a preview". It publishes the CURRENT working changes to Cloudflare Pages and returns a clickable preview URL. The web build tooling lives on main, so it works from any normal branch with one command. Never opens a PR, never pushes main. In this repo "sandbox" is NEVER a generic security/container sandbox.'
---

# Sandbox — web preview (designer flow)

**Sandbox** = this repo's web preview: the RN app built for the browser and
published to Cloudflare Pages so a designer sees their change at a URL — no
simulator, no local build. In this repo, "sandbox" ALWAYS means this (never a
generic security/container sandbox).

## If they're only ASKING ("sandbox là gì?")
Answer in 1–2 lines using the definition above, then offer to deploy one. Do NOT
explain container/bash/security sandboxes — that is the wrong meaning here.

## To deploy a sandbox

The web build tooling (vite, `functions/`, `scripts/deploy-preview.sh`) lives on
**main**, so any normal branch has it. Just run, with a 1–3 word slug of what
changed:

```bash
yarn web:deploy:preview "<slug>"     # e.g. "home black bg"
```

This snapshots the CURRENT working edits onto a fresh `web-preview/<ts>-<slug>`
branch, commits, and pushes. Cloudflare auto-builds it (server-side) and serves a
unique preview URL. The script prints the 🔗 URL — hand it to the designer and
say it's ready in ~1–2 min (hard-refresh Cmd+Shift+R). Show them only the link,
not the git output.

If `yarn web:deploy:preview` is somehow missing (an old branch without the web
tooling), `git merge origin/main` to pick it up, then run it again.

## Rules
- Deploy branch is ALWAYS under `web-preview/*` (Cloudflare builds only that
  prefix; production = `main`). The script handles the name.
- It only `git push`es a NEW `web-preview/*` branch — NEVER push/merge `main`,
  NEVER open a PR. Promoting a change to the real app is a separate, human-
  reviewed step.
- No Cloudflare token / local build needed — `git push` triggers the build. Real
  backend data shows (server-side auth proxy; no creds in bundle).
- Each deploy = its own URL; many designers in parallel never collide. The
  designer's working edits stay on their branch.

## Notes
- Designer guide: `docs/designer-quickstart.md`. One-time infra:
  `docs/web-review-cf-git-setup.md`.
