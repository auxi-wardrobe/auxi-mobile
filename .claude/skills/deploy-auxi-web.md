---
name: deploy-auxi-web
description: When the designer wants to preview their changes in the browser — this feature is called the **Sandbox**. Triggers: "sandbox", "sandbox đi", "deploy sandbox", "lên sandbox", "xem sandbox", "tạo sandbox", plus the older "deploy đi", "deploy", "preview", "xem trên web", "tôi muốn xem thử", "ship a preview". Any of these = publish the CURRENT working changes as a Cloudflare preview and give back a clickable URL. Auto-creates a web-preview/* branch (from the web-base base) and pushes it; Cloudflare builds it server-side. Never touches main, never opens a PR.
---

# Sandbox — Deploy a Web Preview (designer flow)

Designers call this feature the **Sandbox**. When they say "sandbox", "sandbox
đi", "deploy sandbox", "deploy đi", "preview", "xem thử" (or similar), do this —
no questions needed:

1. Make sure you're in the auxi repo root on a **web base** — the branch
   **`web-base`** (source of truth, has `vite.config.ts`) or an existing
   **`web-preview/*`** branch. A fresh cloud session should `git checkout
   web-base` first.
2. Run, with a 1-3 word description of what changed:
   ```bash
   yarn web:deploy:preview "home layout"
   ```
   (= `scripts/deploy-preview.sh` → snapshots the current edits onto a fresh
   **`web-preview/<ts>-home-layout`** branch, commits, pushes; Cloudflare
   auto-builds it.)
3. Give the designer the **🔗 preview URL** it prints. Tell them it's ready in
   ~1–2 minutes and to hard-refresh (Cmd+Shift+R). Each deploy = its own URL.

## Rules
- The deploy branch is ALWAYS under the **`web-preview/*`** prefix — Cloudflare
  builds ONLY `web-preview/*` (production = `web-base`). The script names it; if
  you ever create one by hand, keep the `web-preview/` prefix or it won't build.
- This only `git push`es a NEW `web-preview/*` branch. NEVER push/merge `main`
  or `web-base`, never open a PR — promoting is a separate, human-reviewed step.
- No Cloudflare token or local build is needed; `git push` triggers the build.
- Build runs server-side on Cloudflare (Yarn 1, Node 20, output `dist-web`,
  proxy auth from CF secrets). Real backend data shows on the preview.
- Many designers at once is safe: every deploy is its own timestamped
  `web-preview/*` branch + URL, so nobody overwrites anybody.
- If `vite.config.ts` is missing, you're not on a web base — `git checkout
  web-base` first.

## Notes
- Preview data comes from a server-side auth proxy (`functions/api/[[path]].js`)
  using Cloudflare secrets — no credentials in the bundle.
- One-time infra setup: `docs/web-review-cf-git-setup.md`.
- Hand designers the step-by-step guide: `docs/designer-quickstart.md`.
