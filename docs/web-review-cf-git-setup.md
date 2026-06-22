# Web Review — Cloudflare Pages Git Build (one-time setup)

Goal: Cloudflare builds the `web-preview` branch on **its own** infra (no GitHub
Actions billing, no designer toolchain). "deploy đi" just hits a Deploy Hook URL.

## A. Connect the repo to a Git-backed Pages project (dashboard)

The current `auxi-web-review` project is **Direct Upload** — Pages can't convert
it to Git. Pick ONE:
- **Keep the URL** `auxi-web-review.pages.dev`: delete the existing project first
  (CF > Workers & Pages > auxi-web-review > Settings > Delete), then reuse the name.
- **Or** create a new project with a new name (new `*.pages.dev` URL).

Then: CF dashboard > **Create application > Pages > Connect to Git** >
authorize the Cloudflare GitHub App for the **auxi-wardrobe** org > pick
**auxi-mobile**.

## B. Build settings

- Project name: `auxi-web-review` (if you deleted the old one) — else new.
- Production branch: **`web-preview`**
- Framework preset: **None**
- Build command: **`yarn web:build`**
- Build output directory: **`dist-web`**
- Root directory: **`/`**

## C. Environment variables (Production)  — needed by the proxy at runtime

- `NODE_VERSION` = `20`
- `REVIEW_EMAIL` = `duc2820@gmail.com`   (Encrypt)
- `REVIEW_PASSWORD` = `Chunga2820@`       (Encrypt)

(If you also want preview-branch builds to load data, add the two REVIEW_* vars
to the **Preview** scope too.)

Save & Deploy → first build runs → confirm the live URL works.

## D. Deploy Hook (the "deploy đi" trigger)

CF > the project > Settings > **Builds & deployments > Deploy hooks** > Add:
- Name: `designer-deploy`
- Branch: `web-preview`
- Create → **copy the URL** and hand it to Claude (it goes into the gitignored
  `auxi/.env.deploy` as `PAGES_DEPLOY_HOOK`, or hardcode it for zero designer setup
  since this repo is private).

## E. How it runs after setup

- **Designer:** "deploy đi" → `yarn web:deploy:remote` → POSTs the hook → CF
  builds `web-preview` server-side → live in ~1–2 min. No git, no local build.
- **Update what the preview shows:** bring new app changes into `web-preview`
  (merge/rebase), which is a normal reviewed step — CF auto-builds on push too.
- `main` / PRs / merges are untouched by deploys (maintainer review intact).
