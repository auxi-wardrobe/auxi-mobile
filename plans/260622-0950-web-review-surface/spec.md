# Spec — Web Review Surface for auxi

> **Date:** 2026-06-22
> **Status:** Design approved, pending spec review → implementation plan
> **Owner:** duncan (CEO/dev)
> **Repo:** `auxi` (RN 0.83 submodule)

## 1. Problem & Goal

The auxi mobile app is React Native. Reviewing UI today requires a local mobile
simulator setup, which is **cực kỳ phức tạp** for the designer. The CEO/designer
wants to **view the real UI in a browser** so that:

1. The designer can open a URL and review visuals — no mobile toolchain.
2. **Claude Code (via Playwright)** can drive the web URL and screenshot any
   screen for visual review, instead of wrestling with the simulator + mobile-mcp.
3. Web becomes an easy-to-deploy artifact alongside each TestFlight release.

**Scope decision (confirmed):** This is a **visual review surface**, NOT a
production consumer web app. Data and auth are **mocked**. Native features only
need to *not crash* — they don't need to function for real. The architecture is
intentionally built so it *can* grow into a full web app later (swap mocks for
real implementations), but that is out of scope here.

**Non-goals:**
- Real user auth on web (Apple/Google web OAuth) — out of scope.
- Real camera / image upload, real geolocation, real secure storage — mocked.
- Real backend calls — intercepted by MSW.
- Storybook-style isolated component gallery — possible later add-on, not now.

### 1.1 Primary target: Home (priority #0)

**Home is the screen the designer edits most**, so it is the first-class target:
the web surface must bring `HomeScreen` to **full review fidelity before going
wide** to the other 40 screens. "Full fidelity" for Home means every state is
reviewable in the browser:

- The **Tinder swipe deck** (`OutfitSwipeDeck`) — swipe left/skip, right/save —
  works with real drag interaction.
- **Loading**: `MacgieLoader` + the "Finding the mix" status pill.
- **Full deck**: multiple outfit option sets to swipe through.
- **Context chips**: occasion / weather / time.
- **Actions**: favorite (heart) + try-on, the Figma action row ("set dots" +
  "Show another"), `SwipeCoachMark` first-run overlay.
- **Empty / error** states.

Home's swipe is **PanResponder + Animated (RN core, no extra dep)** — fully
supported by react-native-web, so the core interaction works on web with no
gesture-handler dependency on the critical path.

## 2. Approach (chosen: "Hướng A")

Web is a **second build target of the same `auxi` repo**, sharing `src/`:
- Mobile keeps building through **Metro** (untouched).
- Web builds through **Vite + react-native-web**.
- Same `src/screens` & components → web auto-tracks mobile. Only ~6 native
  touch-points get a `.web` override.

Rejected alternatives:
- **B — Storybook gallery:** no real flows; 41 screens worth of stories is its
  own grind. Good as a later supplement, weak as primary.
- **C — RNW shell wired to staging backend with real web auth:** heaviest;
  drifts into the full-web-app scope the user explicitly deferred.

## 3. Codebase facts (from survey)

- **41 screens** in `src/screens/`; 0 `.ios.tsx`/`.android.tsx` files; 17
  `Platform.OS` branches.
- Component layers: `src/components/{atoms,primitives,features,layout}` using
  standard RN primitives (View/Text/Pressable/ScrollView/FlatList/Image).
- Styling: `StyleSheet.create` throughout; theme tokens in `src/theme/theme.ts`
  (pure data, no platform branches).
- Services: plain `axios` via `apiClient.ts` (web-friendly).
- Bare RN (Metro), **no Expo**, no existing web config.

**Web-compatible as-is (via react-native-web):** react-native-svg (rendering),
safe-area-context, screens, async-storage, toast-message, axios, TanStack Query,
i18next.

**Home swipe deck** (`OutfitSwipeDeck`) is built on **PanResponder + Animated**
(RN core, no extra dep) — both fully supported by react-native-web. The priority
screen's core interaction works on web out of the box.

**`react-native-gesture-handler`** is used only by `OutfitCanvasSurface`
(pinch/rotate) — web support is experimental, but that is a low-priority screen,
not Home.

**The one real blocker:** `@react-navigation/native-stack` has no web support.

## 4. Architecture

```
auxi/
├── index.web.tsx              # web entry: start MSW, mount App in mock mode
├── index.html
├── vite.config.ts             # Vite + RNW alias + .web resolution + SVG plugin
├── tsconfig.web.json
├── web/                       # web-only, never in the mobile (Metro) bundle
│   ├── mocks/
│   │   ├── browser.ts         # MSW worker setup
│   │   ├── handlers.ts        # axios interception per backend endpoint
│   │   └── fixtures/*.json    # realistic data (full + empty states)
│   ├── boot/
│   │   └── MockAuthBoot.tsx   # seed token + AuthContext user → boot into Home
│   ├── screen-index/
│   │   └── ScreenIndex.tsx    # /__screens launcher: all 41 screens, deep-linked
│   └── device-frame/
│       └── DeviceFrame.tsx    # 390×844 phone frame on desktop + full-bleed toggle
└── src/                       # SHARED with mobile; web adds only .web overrides
    ├── navigation/
    │   ├── createStack.ts     # native → createNativeStackNavigator (unchanged behavior)
    │   └── createStack.web.ts # web → createStackNavigator (@react-navigation/stack)
    ├── services/
    │   ├── tokenStorage.web.ts        # keychain → localStorage
    │   ├── analytics.web.ts           # mixpanel → no-op
    │   └── oauth/{googleSignIn,appleSignIn}.web.ts  # fake login → mock token
    └── components/primitives/
        ├── BlurView.tsx               # wraps @react-native-community/blur
        └── BlurView.web.tsx           # CSS backdrop-filter
```

Mobile build never sees `web/`, `index.web.tsx`, or `*.web.ts(x)` (Metro keeps
its existing resolution; Vite resolves `.web` first).

## 5. Components / units

Each unit has one purpose, a clear interface, testable independently.

### 5.1 Vite build config
- `@vitejs/plugin-react`; alias `react-native` → `react-native-web`.
- `resolve.extensions`: `.web.tsx, .web.ts, .web.js, .tsx, .ts, .js, .json` so
  `.web` overrides win on web and are invisible to Metro.
- **SVG:** Metro's `react-native-svg-transformer` is not used by Vite. Add a
  Vite plugin that turns `import Icon from './icon.svg'` into a
  `react-native-svg` component, **preserving the existing import convention** so
  no screen/icon import changes. *(Highest-uncertainty setup item — verify early
  with a screen that has icons.)*
- `index.html` + `index.web.tsx` entry.

### 5.2 Native shim layer (`.web` overrides)
| Touch-point | Web override | Mechanism |
|---|---|---|
| `tokenStorage` (keychain) | localStorage | `.web.ts` sibling |
| Google/Apple sign-in | fake login returning a mock token | `.web.ts` sibling |
| image-picker usage | `<input type=file>` or placeholder asset | service wrapper `.web` |
| geolocation / `location` | fixed mock coordinates | `.web.ts` sibling |
| `@react-native-community/blur` | CSS `backdrop-filter` | `BlurView` wrapper + `.web.tsx` |
| `mixpanel-react-native`, `@sentry/react-native` | no-op | `.web.ts` sibling |

For node_modules packages that can't take a `.web` sibling (blur), introduce a
thin wrapper in `src` and provide its `.web` variant; swap the one screen import.

**Goal of this layer:** app boots and every screen renders without crashing.

### 5.3 Navigation factory
- `createStack.ts` (native) and `createStack.web.ts` (web) expose the **same
  API** consumed by `AppNavigator`/`AuthNavigator`.
- Web uses `@react-navigation/stack` (new dep). Navigators change only their
  import source. Real flow navigation works on web.

### 5.4 Mock data (MSW)
- `handlers.ts` intercepts every axios endpoint the screens hit; returns
  fixtures. Enumerate endpoints from `src/services/*`.
- `fixtures/*.json`: wardrobe items, outfit recommendations, body photos,
  favorites, user/profile — realistic, covering **full and empty states**.
- **Home fixtures first:** the recommendation endpoint (`valenGetRecommendation`)
  returns **multiple outfit option sets** so the deck has cards to swipe, plus
  context-chip data (occasion/weather/time) and favorites — enough to exercise
  loading, full-deck, empty and error states on Home before any other screen.
- MSW runs in dev + the deployed review build (mock mode is always on here).

### 5.5 Mock auth boot
- `MockAuthBoot` seeds a token in localStorage and a user into `AuthContext` so
  the app boots straight to Home, bypassing the login gate.

### 5.6 Screen Index launcher (designer/Claude Code entry)
- Web-only route `/__screens`: lists all 41 screens grouped (auth / main /
  nested), each deep-linking into the stack with mock params.
- Lets the designer and Playwright jump directly to any screen for view/capture
  without walking the whole flow. **This is the core value-delivery unit.**

### 5.7 Device frame
- Renders the app in a 390×844 phone frame centered on desktop (keeps the
  "hình hài mobile"); toggle for full-bleed.

### 5.8 Deploy + verify
- `yarn web:dev` (Vite dev server), `web:build` (static), `web:deploy`
  (`wrangler pages deploy` → Cloudflare Pages, behind **Cloudflare Access**).
- Playwright smoke: open `/__screens`, visit each screen, screenshot — doubles
  as crash-QA and an auto-generated visual gallery for review.

## 6. Data flow

```
Browser → index.web.tsx → start MSW → MockAuthBoot seeds auth
        → App (shared src/) renders in DeviceFrame
        → screens call axios → MSW returns fixtures → real query hooks render
Designer/Playwright → /__screens → deep-link → any screen → screenshot
```

## 7. Drift prevention (lockstep with mobile)

- Web imports the **same `src/`**, so screen/layout changes track automatically.
- Web-specific surface is small and isolated: `vite.config.ts`, `index.web.tsx`,
  `web/`, ~6 `.web` shims, navigation factory.
- **New rule:** adding a native module to mobile → add its `.web` shim, or the
  web build breaks. Document in `auxi/CLAUDE.md`.
- `auxi-lint-tokens.sh` still governs `src/`; `.web` shims stay tiny.

## 8. Error handling

- Any unmocked endpoint → MSW logs a clear warning (so missing fixtures are
  obvious), screen shows its normal error/empty state rather than crashing.
- Unshimmed native module imported on web → Vite build fails loudly; fix = add
  shim (matches the drift rule above).

## 9. Testing / verification

- `vite build` succeeds.
- App boots to Home in mock mode with realistic data.
- Playwright smoke navigates `/__screens` → every screen renders, no console
  crash, screenshot captured.
- Mobile unaffected: `npx tsc --noEmit` + `yarn lint` baseline unchanged;
  `yarn ios:sim` still builds via Metro.

## 10. Phasing (detail goes to the implementation plan)

Home is a **vertical slice delivered first** — the designer gets value on the
page they touch most before the surface goes wide.

1. **Bootstrap web** — Vite + RNW + navigation factory + SVG plugin; app mounts
   in DeviceFrame. Just enough shims for Home to import.
2. **Home review-ready (priority #0)** — MSW + Home fixtures + mock auth boot;
   `HomeScreen` renders end-to-end with working swipe deck and **all states**
   (loading / full-deck / empty / error). *This is the first shippable milestone
   — deploy a Home-only preview if useful.*
3. **Shim sweep** — remaining native overrides so all 41 screens boot crash-free.
4. **Screen Index `/__screens` + fixture coverage** for the other screens.
5. **Deploy (Cloudflare Pages + Access) + Playwright smoke** across all screens.

## 11. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Vite SVG plugin doesn't match svg-transformer output | Medium | Verify in Phase 1 with an icon-heavy screen before going wide |
| gesture-handler canvas (OutfitCanvas) misbehaves on web | Medium | Canvas screen is low review-priority; acceptable degraded; pointer-event fallback if needed |
| Hidden native imports in deep screens crash build | Medium | Build fails loudly; fix = add shim; Phase 2 sweeps all screens |
| Fixture surface larger than expected (41 screens) | Medium | Phase 3 covers Home first; Phase 4 expands incrementally per screen |
| react-native-web gaps vs RN 0.83 primitives | Low | Primitives used are all RNW-supported; theme is pure data |

## 12. Open questions

- None blocking. SVG plugin choice is the first thing to validate empirically in
  Phase 1.
