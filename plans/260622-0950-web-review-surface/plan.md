# Web Review Surface — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the existing auxi React Native app in a browser as a mocked
**visual review surface**, so the designer and Claude Code (via Playwright) can
view/screenshot any screen — Home first — without a mobile simulator.

**Architecture:** A second build target of the same `auxi` repo. Mobile keeps
building through Metro (untouched); web builds through **Vite + react-native-web**
over the same `src/`. ~6 native touch-points get `.web` overrides; backend calls
are intercepted by **MSW** returning fixtures; a mock auth boot drops the user
straight into Home. A web-only `/__screens` launcher deep-links every screen.
Deployed to **Cloudflare Pages behind Access**.

**Tech Stack:** Vite 5, react-native-web, `@react-navigation/stack` (web nav),
MSW 2, Playwright, Wrangler (Cloudflare Pages). Source spec:
`plans/260622-0950-web-review-surface/spec.md`.

## Global Constraints

- **Mobile build must stay green and untouched.** After every phase:
  `npx tsc --noEmit` passes (legacy `_HomeScreen.tsx` errors are pre-existing and
  expected), `yarn lint` keeps its current baseline (4 errors in
  `_HomeScreen.tsx`, 3 warnings — add none), and Metro still bundles iOS.
- **Web-only code is invisible to Metro.** It lives only in: `vite.config.ts`,
  `index.web.tsx`, `index.html`, `web/**`, `tsconfig.web.json`, and `*.web.ts(x)`
  sibling files. Metro never resolves `.web.*`; Vite resolves `.web.*` first.
- **MSW handlers match host-agnostically** (`*/api/...`) — `BASE_URL` is
  `http://localhost:5001/api` in dev but the Railway prod URL in a release build
  (`src/config/env.ts`), and the review build is a release build.
- **Mock mode is always ON** in the web build (no real auth/backend/native).
- **Do not edit `src/screens/_HomeScreen.tsx`** (legacy, pending deletion). Home
  = `src/screens/HomeScreen.tsx`.
- **No new hex in `src/`** (theme tokens rule). Web-only files under `web/` may
  use CSS/hex freely (they are not part of the design system surface).
- **`testID` on every interactive element** added (e.g. ScreenIndex links):
  `<feature>-<element>-<purpose>`.
- **No Mixpanel work required.** This is web-only review tooling, not a new
  mobile interaction; `analytics` is shimmed to no-op. This does not violate
  `.claude/rules/analytics-tracking-required.md` (no new mobile handler ships).
- Keep files focused (< ~200 lines); split by responsibility.

## Phases

| # | Phase | Deliverable | Status |
|---|---|---|---|
| 1 | [Bootstrap web](phase-01-bootstrap-web.md) | Vite + RNW + nav factory + SVG; a trivial screen renders in the browser inside the device frame | ☐ |
| 2 | [Home review-ready](phase-02-home-review-ready.md) | `HomeScreen` renders end-to-end with working swipe deck + all states (loading/full/empty/error) via MSW + mock auth | ☐ |
| 3 | [Shim sweep](phase-03-shim-sweep.md) | All ~6 native overrides; every one of the 41 screens boots crash-free | ☐ |
| 4 | [Screen Index + fixtures](phase-04-screen-index-and-fixtures.md) | `/__screens` launcher + fixture coverage for the remaining screens | ☐ |
| 5 | [Deploy + Playwright](phase-05-deploy-and-playwright.md) | Cloudflare Pages (behind Access) + Playwright smoke screenshotting every screen | ☐ |

**Dependency order:** 1 → 2 → 3 → 4 → 5. Phase 2 is the first shippable milestone
(a Home-only preview can deploy after it). Phases 3–4 widen coverage; Phase 5
automates capture + ships.

**Key risk gate (Phase 1):** if Vite cannot bundle the RN dependency set after
the documented config, fall back to the Expo-web / webpack path noted in
Phase 1 — decide before investing in Phase 2.
