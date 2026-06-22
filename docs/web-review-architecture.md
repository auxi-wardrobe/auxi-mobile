# auxi Web Review Surface — Architecture

A second, browser-viewable build of the RN app for design review, plus a
server-side build/deploy pipeline so the designer needs no local toolchain.

## 1. One source, two build targets

```
                       auxi/src/  (SINGLE source of truth)
                screens · components · theme · services · hooks
                                   │
                 ┌─────────────────┴──────────────────┐
                 ▼                                     ▼
        Metro  (mobile)                        Vite + react-native-web (web)
        iOS / Android                          + thin .web overrides
        (unchanged)                            (build target added)
```

Editing shared `src/` changes BOTH platforms. Only ~a dozen web-only files differ.
(RNW renders ~95% like native — verify blur/shadow/gesture/fonts on a real sim.)

## 2. Web build composition (what Vite produces)

```
index.web.tsx ──▶ DeviceFrame (iframe, iPhone 12–18 selector)
                      └─▶ <App/>  (the real shared app)

Vite config:
  • alias  react-native → react-native-web
  • resolve .web.* first  ──▶  env.web.ts  (BASE_URL = /api)
                               createStack.web.ts (JS stack, not native-stack)
  • stubs (web/stubs/*) for native-only pkgs:
        keychain · blur · image-picker · oauth(google/apple) ·
        geolocation · mixpanel · sentry · localize · toast
  • @svgr svg plugin (import .svg → react-native-svg component)
  • fonts.css  (@font-face for every theme family)
  → output: dist-web/  + functions/ (the proxy)
```

## 3. Runtime (deployed) — auth & data flow

```
  Designer browser
      │  GET https://auxi-web-review.pages.dev      (static: dist-web, iframe frame)
      │  app boots, seeds a DUMMY client token (AuthContext = "authed")
      │  every API call → SAME-ORIGIN  /api/*
      ▼
  Cloudflare Pages Function   functions/api/[[path]].js
      │   ▲ secrets: REVIEW_EMAIL / REVIEW_PASSWORD  (stored on Cloudflare)
      │   • auto-login once, cache token, INJECT real Bearer server-side
      │   • browser NEVER sees real creds or token
      ▼
  Railway backend  (Valen API)  ──▶  Postgres + R2 images   (REAL data)
```

Result: real account data on a public link, with **no credentials in the bundle**.

## 4. Build & deploy pipeline (the "worker")

```
  "deploy đi"  (designer, any machine, zero toolchain)
      │   yarn web:deploy:remote  →  POST  <Deploy Hook URL>
      ▼
  Cloudflare Pages — Git Build   (runs on CF infra, NOT GitHub Actions)
      │   env: NODE_VERSION=20, REVIEW_*  (held by Cloudflare)
      │   git pull  web-preview  →  yarn install  →  yarn web:build
      │   publish  dist-web/ + functions/
      ▼
  https://auxi-web-review.pages.dev   (live in ~1–2 min)
```

- The deploy **only triggers a rebuild** of the `web-preview` branch HEAD — it
  touches **no git** (no commit/push/PR/merge).
- Build is server-side → designer needs no Node/RN/wrangler/CF auth locally.
- No GitHub Actions (the org's Actions billing is blocked) — CF builds instead.

## 5. Git / promotion flow (review gate preserved)

```
  feature branches ──(reviewed PR)──▶  main          ← maintainer review (unchanged)
                                         │
                          (merge / rebase, reviewed) │
                                         ▼
                                   web-preview        ← what CF builds for review
                                         │  deploy đi (trigger only)
                                         ▼
                                   live review URL
```

Deploys are decoupled from source control. Code reaches `main` only via your
reviewed PRs; `web-preview` is the disposable build branch for previews.

## 6. Component inventory

| Concern | Where | Notes |
|---|---|---|
| Shared UI | `src/**` | one codebase, mobile + web |
| Web entry / frame | `index.web.tsx`, `web/device-frame/` | iframe → true device width; iPhone 12–18 |
| Web overrides | `src/config/env.web.ts`, `src/navigation/createStack.web.ts` | API base, JS stack |
| Native stubs | `web/stubs/*` | aliased in `vite.config.ts` |
| Fonts / svg | `web/fonts.css`, `public/fonts/*`, `web/svg-plugin.ts` | @font-face + svgr |
| Runtime auth proxy | `functions/api/[[path]].js` | injects auth from CF secrets |
| Mock mode (optional) | `web/mocks/*` | MSW fixtures; unused when proxy is live |
| Build worker | Cloudflare Pages Git build (`web-preview`) | server-side build |
| Deploy trigger | `scripts/deploy-hook.sh` + skill `deploy-auxi-web` | "deploy đi" → hook |
| Backend | Railway (Valen) + Postgres + R2 | real data |

## 7. Key decisions & trade-offs

- **Shared `src/`** → mobile/web never drift in code; web is a fast "magnifying
  glass" for design, not a separate app. Trade-off: RNW ≠ native pixel-for-pixel.
- **Server-side auth proxy** (not baked creds) → safe public link, designer-
  triggered deploys need no secrets. Trade-off: a Pages Function + CF secrets.
- **CF Pages Git build** (not GitHub Actions) → no Actions-billing dependency,
  no designer toolchain. Trade-off: one-time dashboard Git connect.
- **Deploy = trigger only** → never mutates git; review gate on `main` intact.
