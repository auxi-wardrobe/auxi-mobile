# auxi — Claude Operating Notes

Personal-wardrobe + AI outfit recommender. RN 0.83 + TypeScript 5.
Backend "Valen" generates outfits given the user's wardrobe + weather/occasion/time.

## Stack at a glance
- React Native 0.83.1, React 19.2, TypeScript 5.8
- Navigation: `@react-navigation/native` 7 (native-stack)
- Server state: TanStack React Query 5 — no Redux/Zustand
- Auth: JWT stored in `react-native-keychain`
- HTTP: axios via `src/services/apiClient.ts`
- SVG via `react-native-svg-transformer` (import `.svg` as React components)
- i18n via `i18next` (locales in `src/translations/`)
- Package manager: **yarn** (see scripts in `package.json`)

## Conventions
- New screens **must** be added to `src/types/navigation.ts` `AppStackParamList`
  AND registered in `src/navigation/AppNavigator.tsx`. Skip either and you get
  silent runtime breakage on cold start.
- Onboarding screens read copy/artwork from `src/onboarding/config.ts`. Don't
  inline strings — add them there so they're easy to lift into i18n later.
- Service files (`src/services/*.ts`) wrap axios via `apiClient`. Never import
  axios directly from screens or hooks.
- Theme tokens live in `src/theme/theme.ts`. No literal hex in screens (a few
  legacy ones exist — don't add more).
- SVG icons: `import IconFoo from '../assets/icons/icon_foo.svg'` then render
  `<IconFoo width={20} height={20} />`. Don't use `<Image>` for SVG.

## Don'ts
- Don't add Redux, Zustand, or MobX — TanStack Query covers server state and
  `AuthContext` covers user state. If you think you need more, ask first.
- Don't edit `src/screens/_HomeScreen.tsx` — it's the legacy variant pending
  deletion. Edit `HomeScreen.tsx`. Lint errors in `_HomeScreen.tsx` are known
  and will disappear when the file is deleted.
- Don't hardcode API URLs. The `http://localhost:5001/api` in
  `services/apiClient.ts` and `services/auth.ts` is a known TODO; don't copy
  the pattern into new files.

## Verification (run before claiming done)
- `npx tsc --noEmit` — must pass. Legacy `_HomeScreen.tsx` errors are expected.
- `yarn lint` — current baseline has 4 errors (all in `_HomeScreen.tsx`) and
  3 warnings; don't add more.
- iOS smoke test: `yarn ios:sim`. For deterministic UI verification via
  mobile-mcp + WebDriverAgent see `docs/MOBILE_MCP_MAC_IOS_SIM.md`.

## Active work / known unfinished
- **Onboarding redesign (PreferenceSeed → FitPreference → OutfitApproval →
  OnboardingConfirmation)**: screens exist and are now registered as routes,
  but the entry point (`Welcome → LocationPermission → ?`) still points at the
  legacy `GenderPreference → StylePreference` flow. The new screens cover the
  same data (gender + style_direction). **Product decision pending**: swap the
  flow, run both, or delete the legacy two. Do not remove the legacy screens
  without confirmation.
- **Dual HomeScreen**: `HomeScreen.tsx` (current) and `_HomeScreen.tsx`
  (legacy, ~941 LOC) coexist. Migration in progress; legacy file is slated
  for deletion once the new flow is verified in production.
- **API config**: `localhost:5001` is hardcoded. Externalising via `.env` /
  `react-native-config` is queued but not started.

## Project layout pointers
- `src/screens/` — all screen components (15 + 4 new onboarding)
- `src/services/` — API clients (`apiClient`, `auth`, `wardrobe`, `item`,
  `recommendation`, `favorite`, `try-on`, `body`)
- `src/components/` — `atoms/`, `layout/`, `features/`, `primitives/`
- `src/onboarding/config.ts` — copy + artwork for onboarding screens
- `src/context/AuthContext.tsx` — user, login, register, `completeOnboarding`
- `docs/` — project docs (icons, mobile-mcp setup)
- `docs_agent/` — backend API references

## Domain features (so you can orient quickly)
1. Auth: email/password, JWT in Keychain
2. Onboarding: walks new users through preference + fit + first outfit
3. Home: outfit recommendations from `valenGetRecommendation`, context chips
   (occasion, weather, time), favorite + try-on actions
4. Wardrobe: 4-column grid, category filters, photo upload, item editing
5. Body: user body reference photos for try-on context
6. Settings: daily reminders, style direction, preference reset
