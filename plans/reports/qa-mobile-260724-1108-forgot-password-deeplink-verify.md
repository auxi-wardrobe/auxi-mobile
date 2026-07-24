# QA Mobile Verify — Forgot-Password Deep Link Fix

**Date**: 2026-07-24
**Device**: iOS Simulator — iPhone 17, iOS 26.5 (`42CF4135-AF17-4187-A71E-8EA96BA7C1F8`)
**App**: Macgie / `com.auxi2026.app` (bundle version 24, installed via native rebuild by user)
**Deep link under test**: `auxi://reset-password?token=<bogus>`
**Target screen**: `src/screens/auth/ResetNewPasswordScreen.tsx`

## Result summary

| Test | Result |
|---|---|
| Test 1 — Warm-start (app foregrounded, `RCTLinkingManager` URL forward) | **PASS** |
| Test 2 — Cold-start (app not running, `openurl` cold-launches into deep link) | **PASS** |

No crashes recorded (`mobile_list_crashes` → empty) on either run.

---

## Test 1 — Warm-start

1. Launched app (`com.auxi2026.app`) via mobile-mcp; landed on unauthenticated "Welcome to Macgie" screen (baseline, expected — QA account not logged in, irrelevant to routing test).
   - Screenshot (before): `auxi/docs/qa-findings/screenshots/2026-07-24/qa-mobile-warmstart-before.png`
2. Ran: `xcrun simctl openurl booted "auxi://reset-password?token=qa-warmstart-test-token"`
3. Waited ~2s, took screenshot (after): `auxi/docs/qa-findings/screenshots/2026-07-24/qa-mobile-warmstart-after.png`
4. `mobile_list_elements_on_screen` confirmed landing on the Reset Password screen:
   - `reset-password-back` (Button)
   - `reset-password-heading` — "Reset your password"
   - `reset-password-input` (SecureTextField, "New password")
   - `reset-password-input-visibility` — "Show" toggle
   - `reset-password-criteria-length` / `-lowercase` / `-digit` — validation checklist
   - `reset-password-submit` — "Save new password" button

App correctly forwarded the warm-start deep link (native `AppDelegate.swift` → `RCTLinkingManager` fix confirmed working) and routed to the reset screen.

## Test 2 — Cold-start

1. `mobile_terminate_app` — killed `com.auxi2026.app`.
2. Ran: `xcrun simctl openurl booted "auxi://reset-password?token=qa-coldstart-test-token"` — this cold-launched the app directly (no separate `mobile_launch_app` call).
3. Waited ~6s (auth bootstrap), then screenshot: `auxi/docs/qa-findings/screenshots/2026-07-24/qa-mobile-coldstart-after.png`
4. `mobile_list_elements_on_screen` returned the identical Reset Password screen element set as Test 1 (`reset-password-heading`, `reset-password-input`, `reset-password-submit`, etc.) — confirms the deep link was not dropped during the cold-start nav-tree race, and the stash/replay-on-`onReady` fix works.
5. `mobile_list_crashes` → `[]` (no crash).

Note: a dev-mode "Open debugger to view warnings" banner appeared at the bottom of the cold-start screenshot — this is a standard RN dev-build overlay, unrelated to the fix, not a defect.

## Screenshots

- `auxi/docs/qa-findings/screenshots/2026-07-24/qa-mobile-warmstart-before.png`
- `auxi/docs/qa-findings/screenshots/2026-07-24/qa-mobile-warmstart-after.png`
- `auxi/docs/qa-findings/screenshots/2026-07-24/qa-mobile-coldstart-after.png`

## Conclusion

Both root causes verified fixed:
1. Cold-start deep-link race (stash + replay on `onReady`) — confirmed via Test 2.
2. Warm-start native URL forwarding (`AppDelegate.swift` → `RCTLinkingManager`) — confirmed via Test 1.

No findings to file — no regressions, no crashes.
