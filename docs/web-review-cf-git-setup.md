# Web Review — Cloudflare Pages Git Build (one-time setup)

Goal: Cloudflare builds the web target on **its own** infra (no GitHub Actions
billing, no designer toolchain). Designers just `git push` a `web-preview/*`
branch ("deploy đi") and CF auto-builds it.

## Branch model

- **`web-base`** — the web build base (has `vite.config.ts` + all web infra).
  It is the Cloudflare **production branch** → `auxi-web-review.pages.dev`.
  Maintainer keeps it in sync with `main`; nobody edits it directly.
- **`web-preview/*`** — disposable per-deploy preview branches. Cloudflare is
  set to build **only** these (custom preview filter). Each push = its own
  preview URL; two designers never collide.
- `main` / PRs are untouched by deploys (maintainer review intact).

> Git note: a branch literally named `web-preview` **cannot** coexist with
> `web-preview/x` (ref file/dir conflict) — that's why the base is `web-base`.

## A. Connect the repo to a Git-backed Pages project (dashboard)

The project `auxi-web-review` is Git-connected to **auxi-wardrobe/auxi-mobile**
(CF dashboard > Workers & Pages > Create application > Pages > Connect to Git).

## B. Build settings

- Project name: `auxi-web-review`
- Production branch: **`web-base`**
- Preview deployments: **Custom** → include only **`web-preview/*`**
- Framework preset: **None**
- Build command: **`yarn web:build`**
- Build output directory: **`dist-web`**
- Root directory: **`/`**

These are also settable via the CF API on the project's `source.config`:
`production_branch="web-base"`, `preview_deployment_setting="custom"`,
`preview_branch_includes=["web-preview/*"]`.

## C. Environment variables — needed by the proxy at runtime

Set in **both** Production and Preview scopes (previews need data too):

- `NODE_VERSION` = `20`
- `REVIEW_EMAIL` = `<review account email>`  (Encrypt)
- `REVIEW_PASSWORD` = `<set in CF dashboard — keep the value in the password
  manager, NEVER in git>`  (Encrypt)

The Pages Function (`functions/api/[[path]].js`) reads these at runtime to inject
auth server-side, so credentials never reach the browser bundle.

## D. How it runs after setup

- **Designer:** on `web-base`, edit, then "deploy đi" →
  `yarn web:deploy:preview "<desc>"` → pushes `web-preview/<ts>-<desc>` → CF
  auto-builds → live in ~1–2 min. No git knowledge, no CF token, no local build.
- **Update what previews show:** bring new app changes from `main` into
  `web-base` (a normal reviewed step) — CF auto-builds `web-base` (production)
  on push.
- **Optional legacy path:** a Deploy Hook URL (`scripts/deploy-hook.sh` +
  gitignored `.env.deploy`) can POST-trigger a build without git. Not used by the
  default flow.
- `main` / PRs / merges are untouched by deploys (maintainer review intact).
