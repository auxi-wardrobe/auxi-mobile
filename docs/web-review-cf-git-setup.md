# Web Review — Cloudflare Pages Git Build (one-time setup)

Goal: Cloudflare builds the web target on **its own** infra (no GitHub Actions
billing, no designer toolchain). Designers just `git push` a `web-preview/*`
branch ("sandbox đi") and CF auto-builds it.

## Branch model (web build lives on `main`)

- **`main`** — holds the web build tooling (`vite.config.ts`, `web/`,
  `functions/`, `src/config/env.web.ts`, `scripts/deploy-preview.sh`,
  `.ruby-version`). It is the Cloudflare **production branch** →
  `auxi-web-review.pages.dev` (always the current app).
- **`web-preview/*`** — disposable per-deploy preview branches, cut from the
  designer's current branch (off main). Cloudflare builds **only** these (custom
  preview filter). Each push = its own preview URL; many designers never collide.
- There is **no longer a `web-base` branch** — it was retired once the web build
  moved onto main (no parallel branch → no drift).

> Why `.ruby-version`: CF auto-runs `bundle install` when a `Gemfile` is present,
> and that crashes on CF's default Ruby 3.4 (`untaint` removed). `.ruby-version`
> `3.1.6` makes it pass, so the Gemfile (needed for iOS) can stay on main.

## A. Connect the repo to a Git-backed Pages project (dashboard)

The project `auxi-web-review` is Git-connected to **auxi-wardrobe/auxi-mobile**
(CF dashboard > Workers & Pages > Create application > Pages > Connect to Git).

## B. Build settings

- Project name: `auxi-web-review`
- Production branch: **`main`**
- Preview deployments: **Custom** → include only **`web-preview/*`**
- Framework preset: **None**
- Build command: **`yarn web:build`**
- Build output directory: **`dist-web`**
- Root directory: **`/`**

Also settable via the CF API on the project's `source.config`:
`production_branch="main"`, `preview_deployment_setting="custom"`,
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

- **Designer:** on any branch (off main), edit, then "sandbox đi" →
  `yarn web:deploy:preview "<desc>"` → pushes `web-preview/<ts>-<desc>` → CF
  auto-builds → live in ~1–2 min. No branch setup, no CF token, no local build.
- **Production URL** (`auxi-web-review.pages.dev`) rebuilds automatically on every
  push to `main`.
- **Optional legacy path:** a Deploy Hook URL (`scripts/deploy-hook.sh` +
  gitignored `.env.deploy`) can POST-trigger a build without git. Not used by the
  default flow.
- Deploys never push `main` or open a PR — promoting a change to the real app is a
  separate, human-reviewed step (maintainer review intact).
