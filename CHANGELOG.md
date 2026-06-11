# Changelog

All notable changes to the auxi iOS mobile app are documented here. Format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). Versioned as `v<MARKETING_VERSION>-build<N>` to match TestFlight build identifiers.

Auto-appended by the `auxi-launch-notify` skill after each TestFlight upload. See `docs/release-checklist.md` for the release pipeline.

## [Unreleased]

## [v1.0-build16] - 2026-06-11

### Added
- item-detail redesign, auth email routing, app icon/name
- rebuild wardrobe + add-item flow to match Figma

### Fixed
- observable, cold-safe weather fallback (AU-306)
- two-axis outfit/set swipe per AU-303

### Changed
- cache item images with force-cache to avoid reload on re-entry


## [v1.0-build11] - 2026-05-28

### Added
- sync try_another cycled flag into v05Api client
- add Home Remix entry and align Outfit Canvas with Figma


## [v1.0-build9] - 2026-05-27

### Added
- step-3 style tiles + dev sign-in test scaffolds
- per-wardrobe Step 3 style tiles + downsize tile assets

### Fixed
- flush events in dev so they reach Mixpanel immediately
- render tile artwork + Figma fidelity polish

### Changed
- restore main's pre-existing QA screenshot
- drop QA screenshots from PR, gitignore them


## [v1.0-build8] - 2026-05-26

### Added
- integrate Mixpanel with consent gating
- redesign Settings screen, dialogs + body-photo detail (Figma 2850:15839)
- redesign navigation drawer to dark theme (Figma 2852:24670)
- surface V05 reasoning_human as outfit card caption
- redesign Home as outfit grid view (AU-253)
- wire Welcome OAuth CTAs to Google + Apple sign-in

### Fixed
- set Google OAuth client IDs + valid REVERSED_CLIENT_ID URL scheme (AU-242)
- prevent try_another spam + eager outfit prefetch
- resolve theme.ts conflict + address PR #37 review
- render condition-driven icon via SVG instead of static PNG
- correct doubled /api prefix in weather request path

### Changed
- wip snapshot before main merge (analytics/settings/body/nav)
- extract SettingsDialog + RadioOptionList; disable Dark Mode stub; confirm I2 deep-merge
- add Google Sign-In URL scheme placeholder to Info.plist
- install Google + Apple Sign-In SDKs


## [v1.0-build7] - 2026-05-22


## [v1.0-build6] - 2026-05-19

### Fixed
- declare ITSAppUsesNonExemptEncryption=false

### Changed
- fill v1.0-build5 sections
- record v1.0-build5 launch


## [v1.0-build5] - 2026-05-19

### Added
- Fastlane lane (`bundle exec fastlane beta`) replaces bespoke release script; Apple TestFlight history is now source of truth for build numbers
- Home screen wired to V05 `buildRecommendation` endpoint

### Fixed
- Info.plist now declares `NSLocationAlwaysAndWhenInUseUsageDescription` (resolves ITMS-90683 from build 4 delivery)
- Bundle RN build phase backtick → escaped quotes (unbreaks archive); Sentry sourcemap upload disabled when creds missing

### Changed
- Release pipeline: archive smoke + Sentry preflight added to CI


## [v1.0-build4] - 2026-05-13

### Added
- Weather widget in home header — day/temp/icon via backend `/api/weather` proxy (OpenWeather, 4h cache)
- Poppins-Regular + Poppins-Medium fonts linked to iOS and Android (matches Figma `font-family/body`)

### Changed
- HomeScreen: "This works" button changed to outlined secondary style with trailing heart icon (Figma spec)
- HomeScreen: "Show another" moved to bottom of action cluster (Figma y=785 peek layout)
- HomeScreen: sheet horizontal padding 12→16, card borderRadius 16→12, action cluster gap 8→12
- HomeScreen: app background, card tile bg, card tag overlay converted to Figma warm tokens
- HomeScreen: "Edit context +" trailing plus added per Figma
- All button text: ArchivoNarrow → Poppins-Medium (Figma `font-family/body`)
- theme.ts: add `figmaBackground #f2efec`, `figmaCardSurface`, `figmaCardTag`, `poppinsBody/Button` tokens

### Fixed
- Removed all literal hex values from HomeScreen.tsx; converted to theme tokens
- WeatherWidget: whitelist `iconCode` before URL interpolation (security)

## [v1.0-build3] - 2026-05-12

### Added
- AU-252 ContextChipsModal refine flow wireup (cold-start + prefetch threading via `styleFeedbackRef`)
- Analytics telemetry seam at `src/services/analytics.ts`
- Reproducible TestFlight pipeline at `scripts/release-testflight.sh` (archive → export → validate → upload → tag)
- Release runbook at `docs/release-checklist.md`

### Changed
- Renamed `ASC_API_KEY` → `ASC_API_KEY_ID` env var (matches Apple's `xcrun altool --apiKey` terminology, which expects the Key ID not the key content)
- Upload prompt now accepts y/Y/yes/Yes case-insensitively (was strict y/Y only)

### Fixed
- `release-testflight.sh` validates build-number arg as positive integer before `sed` on `project.pbxproj` (PR #14 review)
- Removed literal App Store Connect Key ID + Issuer UUID from `docs/release-checklist.md` (replaced with `<your-key-id>` placeholders)

## [v1.0.0-build2] - 2026-05-10

### Added
- `src/config/env.ts` — single source of truth for API host, `__DEV__` switches between `localhost:5001` (dev) and `https://wardrobe-backend-production-c8d9.up.railway.app` (release)

### Changed
- `src/services/apiClient.ts` and `src/services/auth.ts` import `BASE_URL` from `config/env` (DRY — removed two hardcoded localhost duplicates)
- Bumped `CURRENT_PROJECT_VERSION` 1 → 2 to permit re-upload after the localhost-bricked build 1

## [v1.0.0-build1] - 2026-05-10

### Added
- **First TestFlight upload** of the auxi mobile app
- Bundle ID `com.auxi2026.app`, Apple Team `9Z32ZJK4A5`
- iOS 26 SDK build via Xcode 26.4.1
- fmt 11.0.2 consteval workaround in `ios/Podfile` post_install (`FMT_USE_CONSTEVAL=0` define + idempotent `base.h` ifndef guard patch — required for compatibility with Apple clang in Xcode 26)
- `ENABLE_USER_SCRIPT_SANDBOXING = NO` for Hermes `replace_hermes_version.js` script phase
- App icon asset catalog with 9 sliced sizes (40, 58, 60, 80, 87, 120 ×2, 180, 1024) — placeholder rose-A monogram pending designer master
- `CFBundleIconName = AppIcon` in `Info.plist` (required since iOS 11 SDK)
- `ios/ExportOptions.plist` for `app-store-connect` distribution method, signing style automatic
- V05 onboarding flow (AU-249): gender → fit picker → 5-vocab style picker → V05 generation API
- Typed `v05Api.ts` service stubs
- Maestro V05 onboarding flow under `maestro/flows/` for E2E coverage
- testIDs across onboarding screens for deterministic Maestro selectors

### Fixed
- `LocationPermission` "Not now" path now routes to `GenderPreference` instead of dead-ending (AU-249)
- Replaced racy `onboarding-style-loading` Maestro assertion with deterministic state check (AU-249)

### Known issues
- App icon is a placeholder (rose-gradient "A" monogram) — designer brand asset pending
- Some service paths drift between mobile and backend (favourites vs favorites, try-on vs tryon/lowres, recommendation/start vs start2) — flagged for follow-up PR
