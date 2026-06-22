# Phase 02 — Home Review-Ready (priority #0)

**Goal:** `HomeScreen` renders end-to-end in the browser with a working swipe
deck and all states (loading / full-deck / empty / error), driven by MSW
fixtures and a mock auth boot. **First shippable milestone.**

**Prereq:** Phase 1. Spec: `spec.md` §1.1, §5.2, §5.4, §5.5.

**Why Home-only here:** `AppNavigator` statically imports all 41 screens, so
mounting the full app eagerly evaluates every screen's native imports before the
Phase 3 shim sweep. Phase 2 mounts a Home-only root whose import chain does not
touch blur/image-picker. Taps to other routes are no-ops until Phase 4.

**Type sources of truth:** `recommendationService.ts` (`Outfit`,
`RecommendationResponse`), `types/item.ts` (`Item`), `types/auth.ts`
(`User`, `StoredTokenData`).

---

### Task 1: `tokenStorage` web shim (localStorage)
Create `src/services/tokenStorage.web.ts` exporting the same surface as
`tokenStorage.ts` (`setTokens`, `getAccessToken`, `getRefreshToken`,
`getStoredEmail`, `getStoredTokens`, `clearTokens`, `migrateLegacyKeychain`,
`SetTokensInput`) backed by `localStorage` under `AUXI_AUTH/<field>` keys.
`migrateLegacyKeychain` is a no-op. Verify with `tsc -p tsconfig.web.json`.

### Task 2: `analytics` web shim (no-op)
`grep -nE "^export" src/services/analytics.ts`, then create
`src/services/analytics.web.ts` mirroring every export as a no-op (matching
arity). `AuthContext` calls `identifyUser`.

### Task 3: MSW worker + Home handlers + fixtures
- `yarn add -D msw && npx msw init public/ --save`
- `web/mocks/fixtures/user.json` (matches `User`), `web/mocks/fixtures/outfits.json`
  (array of `Outfit`, 3 cards, picsum image_urls).
- `web/mocks/handlers.ts`: `GET */api/me` → user; `POST */api/recommendation/start`
  → first outfit; `POST */api/recommendation/next` → cursor-advancing outfit;
  favourites endpoints (`POST /favourites`, `GET /favorites`, `DELETE /favorites/:id`).
  Variant via `?home=empty|error|loading`.
- `web/mocks/browser.ts`: `startMocks()` with `onUnhandledRequest:'warn'`.

### Task 4: Mock auth boot
`web/boot/MockAuthBoot.ts` → `seedMockAuth()` calls `setTokens(...)` with a
far-future expiry so `AuthContext.isAuthenticated()` is true and `/me` loads.

### Task 5: Home-only web root + wire `index.web.tsx`
- Mirror `App.tsx` providers in `web/HomeOnlyApp.tsx` (SafeAreaProvider,
  QueryClientProvider, AuthProvider, i18n init, Toast) + single-screen JS stack
  with `Home`.
- `index.web.tsx`: `await startMocks(); await seedMockAuth();` then render
  `<DeviceFrame><HomeOnlyApp/></DeviceFrame>`.
- Verify Home renders, no login gate, no crash.

### Task 6: Home states
Verify swipe (full), `?home=loading`, `?home=empty`, `?home=error`. Screenshot
each into `visuals/`.

**Done when:** Home renders in the browser with working swipe + all four states,
mock-authed, no crashes; `npx tsc --noEmit` shows no new mobile errors.
