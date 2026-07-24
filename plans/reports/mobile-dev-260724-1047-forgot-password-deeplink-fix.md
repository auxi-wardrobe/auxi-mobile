# Forgot-password deep-link fix — report

Date: 2026-07-24
Scope: `auxi/` only.

## Summary

Fixed both root causes of "tapped reset-password link opens the app but
reset-password UI never appears":

1. **Cold-start race** — a deep link resolved via `getInitialURL()` before the
   nav tree was ready was silently dropped. Now stashed and replayed once
   `onReady` fires.
2. **Warm-start native wiring gap** — neither iOS nor Android forwarded a
   re-tapped link into RN's `Linking` module, so the JS `url` event listener
   (already correct) never fired. Both platforms now wired.

## Changes

### Bug 1 — cold-start replay (TDD)

- `auxi/src/services/deepLinkHandler.ts`
  - Added module-scope `pendingDeepLink` slot (single-slot — this only needs
    to survive one mount cycle, per YAGNI).
  - `dispatchDeepLink` (line ~157): when nav isn't ready, stashes the link
    into `pendingDeepLink` instead of silently returning.
  - New export `replayPendingDeepLink(navRef)` (line ~197): no-op if nothing
    pending or nav still not ready; otherwise clears the slot and re-dispatches.
- `auxi/src/navigation/AppNavigator.tsx`
  - Imports `replayPendingDeepLink` (line 49-52).
  - `onReady` callback (line ~147) now calls
    `replayPendingDeepLink(navigationRef.current)` alongside the existing
    `applyPendingScreenIntent()` / `handleNavStateChange()` calls.
- `auxi/src/services/__tests__/deepLinkHandler.test.ts`
  - New `describe('dispatchDeepLink / replayPendingDeepLink — cold-start race')`
    block (4 tests), using `jest.resetModules()` + `require()` per test for a
    clean module-scope slot (same pattern as `analytics.test.ts`).
  - **TDD verified**: ran the new tests before implementing — all 3 behavior
    tests failed with `TypeError: replayPendingDeepLink is not a function`
    (RED, expected reason — feature missing, not a typo). Implemented the
    minimal fix, re-ran — all green.

### Bug 2 — native URL-open wiring

- **iOS**
  - `auxi/ios/auxi/auxi-Bridging-Header.h` (new) — `#import <React/RCTLinkingManager.h>`.
  - `auxi/ios/auxi/AppDelegate.swift` — added
    `application(_:open:options:)` forwarding to `RCTLinkingManager.application(...)`.
  - `auxi/ios/auxi.xcodeproj/project.pbxproj` — added
    `SWIFT_OBJC_BRIDGING_HEADER = "auxi/auxi-Bridging-Header.h"` to both the
    Debug (`13B07F941A680F5B00A75B9A`) and Release (`13B07F951A680F5B00A75B9A`)
    build configs of the `auxi` target (verified these are the only configs
    carrying `PRODUCT_BUNDLE_IDENTIFIER`, i.e. the one app target). Also
    added the header as a `PBXFileReference` + group entry (not a
    `PBXBuildFile` — headers aren't compiled) for Xcode navigator visibility.
    `plutil -lint` confirms the pbxproj is still well-formed.
  - No `pod install` was run or needed — `RCTLinkingManager` ships as part of
    the already-vendored `React-Core` pod; this is purely project/build-setting
    wiring, per the task's explicit instruction not to run `pod install`.
- **Android**
  - `auxi/android/app/src/main/java/com/auxi/MainActivity.kt` — added
    `import android.content.Intent` and an `onNewIntent(intent: Intent)`
    override calling `super.onNewIntent(intent)` then `setIntent(intent)`.

## Verification

- **TDD RED→GREEN**: confirmed (see above). Final targeted run:
  ```
  yarn jest src/services/__tests__/deepLinkHandler.test.ts
  Test Suites: 1 passed, Tests: 28 passed
  ```
- **`npx tsc --noEmit`**: 16 pre-existing errors remain, all in
  `src/screens/capsule/**` and `src/screens/wardrobe/WardrobeSwitcherSheet.tsx`
  (`theme.text.*` token drift — `poppinsH4SemiBold` etc. missing from the
  theme type). Confirmed via `git diff --stat HEAD -- src/screens/capsule/
  src/screens/wardrobe/WardrobeSwitcherSheet.tsx` that these files are
  untouched by this change — pre-existing baseline, not introduced here.
  Zero errors in any file this task touched. No `_HomeScreen.tsx` errors
  present (expected exemption not needed this run).
- **`yarn lint`**: 2 errors / 23 warnings, none in files this task touched
  except one **pre-existing** warning in `deepLinkHandler.test.ts:117`
  (`Script URL is a form of eval` on the pre-existing
  `javascript:alert(1)` fixture in the `resolveNotificationData` external-kind
  test, unchanged by this diff — confirmed by reading the file before editing).
  `AppNavigator.tsx` and `deepLinkHandler.ts` produce zero lint findings.
  (Note: the documented baseline of "4 errors + 3 warnings, all in
  `_HomeScreen.tsx`" is stale relative to current `main` — the repo now also
  lints `web/` and other files with a wider baseline than documented; this
  predates and is unrelated to this change.)
- **Full jest suite** (`yarn jest --testPathIgnorePatterns='/.claude/worktrees/'`):
  11 suites / 31 tests fail, all pre-existing. Verified via `git stash` +
  re-run that `AuthContext.checkAuth.test.tsx` and `HomeScreen.test.tsx` (and
  by extension the RevenueCat-import-chain failures across the other failing
  suites: `react-native-purchases` ESM parse error, `@revenuecat/purchases-js-hybrid-mappings`)
  fail identically with this change stashed out — confirmed pre-existing,
  unrelated to deep-link work. Stash was popped immediately after the check;
  working tree is back to the 6 modified + 1 new file listed below.

## Files touched

- `auxi/src/services/deepLinkHandler.ts`
- `auxi/src/services/__tests__/deepLinkHandler.test.ts`
- `auxi/src/navigation/AppNavigator.tsx`
- `auxi/ios/auxi/AppDelegate.swift`
- `auxi/ios/auxi/auxi-Bridging-Header.h` (new)
- `auxi/ios/auxi.xcodeproj/project.pbxproj`
- `auxi/android/app/src/main/java/com/auxi/MainActivity.kt`

## Native rebuild — required before on-device/simulator verification

**Not run.** Both iOS (`AppDelegate.swift`, bridging header, pbxproj build
setting) and Android (`MainActivity.kt`) native source changed, which
requires a native rebuild to take effect (JS Fast Refresh does not cover
native/Swift/Kotlin edits). Per this project's iOS build workflow rule, I did
not run `pod install`, `yarn ios:clean`, or any other rebuild/global op —
those are shared-machine destructive ops requiring explicit user coordination
with other concurrent Claude Code sessions. `pod install` should not even be
necessary here (no new pod), but the rebuild itself (Xcode build / Gradle
build) is required.

**Status: code complete, native rebuild + on-device/simulator verification
pending** — the user should coordinate a native rebuild manually
(`yarn ios:clean` interactively, or an Xcode build for iOS; Android via
`yarn android` / Gradle) and then verify: (a) cold-start — tap a
`auxi://reset-password?token=…` link from a fully-quit app state, confirm
`ResetNewPassword` appears; (b) warm-start — with the app already running in
the foreground/background, tap the same link again, confirm it navigates
without needing an app restart.

## Unresolved questions

- None blocking. The lint/tsc baseline drift noted above (stale docs vs.
  actual current `main`) is a pre-existing documentation gap, not something
  this task should fix — flagging for awareness only.
