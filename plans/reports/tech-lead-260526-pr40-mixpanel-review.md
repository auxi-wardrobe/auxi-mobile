# Tech-Lead Mode B Review — PR #40 (feat/mixpanel-analytics)

**Date:** 2026-05-26 · **Reviewer:** tech-lead · **Base:** main · **Head:** feat/mixpanel-analytics (413bb436)
**Scope:** auxi (React Native) — MOBILE-ONLY confirmed.

## Affected repos / files map
13 files, +463/-6 (merge-base diff matches `gh pr view` exactly). All in `auxi`. **Zero** wardrobe-backend / routers / `.py` / `API_DOCUMENTATION.md` files → **no HTTP contract impact.** Confirmed via `gh pr view 40 --files`.

Touched: `AGENTS.md`, `App.tsx`, `docs/analytics/mixpanel-tracking-plan.md`, `ios/Podfile.lock`, `jest.setup.js`, `package.json`, `src/config/analytics.ts`, `src/context/AuthContext.tsx`, `src/screens/{BodyScreen,HomeScreen,StylePickerScreen}.tsx`, `src/services/analytics.ts`, `yarn.lock`.

## Specific rulings

1. **CONTRACT** — No backend route or doc change. Mobile-only. PASS.
2. **CONSENT GATING** — Airtight. `mixpanel` singleton is `null` until `ensureInit()` runs, which only runs after consent (`initAnalytics` checks `readStoredConsent()`; `grantAnalyticsConsent` persists then inits). `track`/`identifyUser`/`resetAnalytics` all guard with `mixpanel?.` so they no-op pre-consent. `doInit` also bails on empty token. `ensureInit` does NOT memoize failures (nulls `initInFlight` on reject → retry-safe). `pendingIdentity` replay awaits `identify()` before `getPeople().set()`. No leak path found.
3. **IDENTITY** — `distinct_id = String(user.id)` (DB id, never email). `identify()` awaited before People `.set()` in both the inline path and replay path. `reset()` on logout/expiry via the `else` branch when `user` clears. `sign_in_completed` fires only after `identify()` lands and only for explicit logins (`justLoggedInRef`), not cold-start restores. Correct.
4. **SECRET CHECK** — `DEV_TOKEN='b402…f93'` is a 32-hex Mixpanel **project token** (public client write-only identifier), not a write/secret API key. No `api_secret`/service-account/private-key patterns anywhere in the diff. Committing a dev client token is acceptable. NOT a blocker.
5. **AUXI CONVENTIONS** — Single-seam service pattern honored (only `analytics.ts` imports the SDK). Token `__DEV__` split mirrors `env.ts` (DEV/PROD roots). No new nav routes. testID/theme rules N/A (no new interactive UI — consent UI deferred). PASS.
6. **RELEASE RISK** — `PROD_TOKEN=''` → release builds no-op by design (documented). `--ignore-engines` is an install-time artifact of mixpanel's `engines.node>=20` constraint, not runtime. Deferred consent UI means zero data flows until someone calls `grantAnalyticsConsent()`. All acceptable for merge; tracked as follow-ups.

## Verification
- `npx tsc --noEmit` (worktree @ PR head): 19 error lines, ALL in baseline files (`reactotron.config.ts`, `_HomeScreen.tsx`). **Zero** errors in any PR-touched file. Baseline preserved. ✅
- `yarn jest src/services/__tests__/analytics.test.ts`: 3 passed. ✅ BUT see MAJOR below — the test is the pre-existing shim test, unchanged by this PR.

## Findings

### critical
- None.

### major
- **M1 — Test coverage gap on changed code.** `src/services/analytics.ts` is rewritten from a ~13-line shim into ~166 lines of consent/init/identity logic, but `src/services/__tests__/analytics.test.ts` is **unchanged** (identical on main and PR branch; describe block still `'analytics shim'`). It exercises only `track()` console logging — none of: consent gate (no-op before grant), `initAnalytics` honoring stored consent, `grant/revokeAnalyticsConsent`, `ensureInit` failure-retry, `pendingIdentity` replay ordering (identify-before-People), `resetAnalytics`. The new jest mocks in `jest.setup.js` exist precisely to enable these tests, but none were written. The highest-value assertion — "no SDK construction / no `track` reaches SDK before consent" — is exactly the privacy guarantee this PR claims and is untested. Decision required before sign-off: add coverage now, or accept with a tracked follow-up ticket.

### minor
- **m1** — `docs/analytics/mixpanel-tracking-plan.md` §5 attributes `onboarding_completed` to `StylePickerScreen.tsx`; the AGENTS.md/plan elsewhere reference the screen generically. Minor doc-vs-code naming drift; harmless.
- **m2** — `sign_in_completed` hardcodes `method:'email'` even though OAuth (Google/Apple) routes may not pass through `AuthContext.login`. Already disclosed as a known follow-up in the tracking plan §6, so advisory only.
- **m3** — `revokeAnalyticsConsent` calls `optOutTracking()` then `reset()` then nulls the singleton; the inline comment explains the omitted `flush()`. Correct, just worth a one-line test later.

## VERDICT: APPROVE WITH COMMENTS

Zero critical. The single major (M1, test coverage) is a documented-decision item, not a correctness defect — the code itself is sound, types clean, contract untouched, consent gate verifiably airtight by inspection. Per the sign-off gate, a major may pass with a documented decision; I am approving on condition that M1 is resolved as either (a) coverage added in this PR, or (b) a filed follow-up ticket referenced in the PR description.

### Next actions
- **mobile-dev**: extend `analytics.test.ts` to cover the consent gate (pre-consent `track` does not reach the SDK), `grant/revoke` lifecycle, and `pendingIdentity` replay ordering — OR file the follow-up ticket and link it in the PR. Also wire the deferred consent UI (Settings toggle vs first-run prompt) before any prod token is set.
- **pm**: track the prod-token + consent-UI + OAuth-method follow-ups from the tracking plan §6/§7 as backlog items; nothing here blocks merge.
- **tech-lead**: re-confirm sign-off once M1 has a documented resolution.
