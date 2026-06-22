---
name: deploy-auxi-web
description: When the designer wants to preview their changes in the browser — e.g. "deploy đi", "deploy", "preview", "xem trên web", "tôi muốn xem thử", "ship a preview" — publish the CURRENT working changes as a Cloudflare preview and give back a clickable URL. Auto-creates a preview branch and pushes it; Cloudflare builds it server-side. Never touches main, never opens a PR.
---

# Deploy a Web Preview (designer flow)

When the designer asks to deploy / preview / "see it on web", do this — no
questions needed:

1. Make sure you're in the auxi repo root on the **web-preview** base (a branch
   with `vite.config.ts`). The cloud session should already be on `web-preview`.
2. Run, with a 1-3 word description of what changed:
   ```bash
   yarn web:deploy:preview "home layout"
   ```
   (= `scripts/deploy-preview.sh` → creates `preview/home-layout-<ts>`, commits
   the current edits, pushes; Cloudflare auto-builds it.)
3. Give the designer the **🔗 preview URL** it prints. Tell them it's ready in
   ~1–2 minutes and to hard-refresh (Cmd+Shift+R). Each deploy = its own URL.

## Rules
- This only `git push`es a NEW `preview/*` branch. NEVER push/merge `main`, never
  open a PR — promoting to main is a separate, human-reviewed step.
- No Cloudflare token or local build is needed; `git push` triggers the build.
- Build runs server-side on Cloudflare (Yarn 1, Node 20, output `dist-web`,
  proxy auth from CF secrets). Real backend data shows on the preview.
- If `vite.config.ts` is missing, you're not on the web base — switch to
  `web-preview` first.

## Notes
- Preview data comes from a server-side auth proxy (`functions/api/[[path]].js`)
  using Cloudflare secrets — no credentials in the bundle.
- One-time infra setup: `docs/web-review-cf-git-setup.md`.
