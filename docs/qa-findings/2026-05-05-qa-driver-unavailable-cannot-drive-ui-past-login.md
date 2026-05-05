# QA driver unavailable — cannot drive iOS sim UI past Login screen

**Severity**: blocker (for this QA pass — every flow in `HOME_SWIPE_PLAN.md` §6 needs Home, which needs login)
**Repro rate**: 1/1 (driver probing exhausted)
**Build**: branch `main`, working-tree HEAD `9306047f0e10127de74d3c8e763d1f1fd9f91710`
**Device**: iOS Simulator iPhone 16 (UDID `6371F8E8-893E-4D7C-8683-8A128B7996F8`)

## Steps

1. Sim is booted, auxi.app is installed and running on the Login ("Welcome
   Back") screen — confirmed via `xcrun simctl io booted screenshot`
   (saved to `auxi/docs/screenshots/home-swipe/02-precheck-current.png`).
2. Tried each driver in turn:
   - `mobile-mcp`: `claude mcp list` shows it is NOT in the active server
     set for this subagent session. Tools are not surfaced. The `auxi-qa-test`
     skill mandates this as the UI driver.
   - `osascript` System Events keystroke: returns error `-1002` ("osascript
     is not allowed to send keystrokes"). Accessibility permission not
     granted to the host process. Parent already confirmed this earlier.
   - `xcrun simctl io <udid> input` — no such subcommand (`io` only does
     `enumerate`, `poll`, `recordVideo`, `screenshot`).
   - `xcrun simctl ui` — only handles appearance/contrast/etc., not input.
   - `idb` / `idb_companion` (Facebook iOS bridge): not installed.
   - WebDriverAgent process: not running (`ps aux` clean).
   - `xcrun simctl pbcopy` works (can push text to sim pasteboard) but
     without a way to *tap* the email field and *paste*, it is useless on
     its own.

## Expected

Per `auxi-qa-test` "Sign-off rule": evidence (screenshot OR test output OR
log excerpt) per asserted flow. To produce that for the 5 swipe flows the
QA agent needs to type `test@example.com` / `testPassword123` into the
Login form and tap Sign In, then drive the Home flows.

## Actual

No tap or keystroke driver available in this session. Only screenshots
(read-only) work. I will not fabricate "verified" without evidence.

## Suspected area

Environment, not application code.

## Routing

- **parent / human-in-the-loop**: either
  - register `mobile-mcp` for this subagent session (per
    `docs/MOBILE_MCP_MAC_IOS_SIM.md` §3 — note the Codex command vs Claude
    command, this is Claude Code so use
    `claude mcp add mobile-mcp -- npx -y @mobilenext/mobile-mcp@latest`,
    then start WDA per §4), OR
  - grant Accessibility to the controlling terminal/Claude process and
    re-invoke (then `osascript` keystroke will work), OR
  - drive Login by hand (type the credentials, tap Sign In) and reply
    `done` so QA can pick up from Home.
- **NOT mobile-dev / backend-dev** — this is a QA-tooling gap, not an app
  bug.

## Static-only verification we CAN do without a driver

Even without UI driving, we have evidence for these:
- `npx tsc --noEmit` clean (matches baseline — only legacy
  `_HomeScreen.tsx`, `reactotron.config.ts`, and `translations/index.ts`
  errors which pre-exist this branch).
- `yarn lint` produces 4 errors + 3 warnings, all matching the baseline
  in `auxi/CLAUDE.md` (`_HomeScreen.tsx` legacy + 2 inline-style warnings
  in `DatabaseScreen.tsx` + 1 `void` in `translations/index.ts`). NO new
  errors introduced by Phase A/B/C edits.
- Cold-launch screenshot (`01-cold-launch.png`) plus current screenshot
  (`02-precheck-current.png`) confirm the app boots without a JS crash and
  reaches the Login screen — so Phase A/B/C imports/JSX did not break the
  bundle.
- Wire-shape review of `recommendationService.ts` confirms `mode` and
  `pinned_item_id` are correctly conditionally appended (Phase B/C
  on-the-wire spec). See finding
  `2026-05-05-valen-get-recommendations-contract-drift.md` for what then
  happens at the backend.
