# QA Smoke — Pin-Item Figma Flow (Step 7)

**Date**: 2026-06-20
**Branch**: `feat/pin-item-figma-flow`
**Build**: warm app `com.auxi2026.app` on Metro :8081, backend :5001
**Device**: iOS Simulator iPhone 16 Pro (iOS 18.1)
**Lane**: mobile-mcp exploratory verify (functional smoke, not visual fidelity)
**Tester**: qa-mobile

## Overall verdict: PASS-WITH-NOTES (2 FAILs — both functional, both reproducible)

Core happy path (pin → confirm → slot-0 promotion → reshuffle), unpin, CTA
copy, and crash-free all PASS. Two deferred sub-states FAIL:
- **F1 — pin visual state desyncs from internal pin state** after reshuffle
  (major).
- **F2 — "Don't show again" preference never persists** (major; never written
  to AsyncStorage).

No crashes. Env blocker (AsyncStorage redbox) NOT hit — warm relaunch clean.

## Per-checklist results

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | Happy path (pin→sheet→confirm→slot0→reshuffle) | PASS | 01,02,03 |
| 2 | Unpin via "Tap to unpin" pill | PASS | 03→04 |
| 3 | Replace-pin (B replaces A, one pin) | PASS (dialog) / see F1 | 05,06 |
| 4 | Don't-show-again (in-session + cross-session) | **FAIL (F2)** | 07,08; AsyncStorage manifest |
| 5 | Guest blocker | N/A | only reachable via logout (destructive) |
| 6 | Item-unavailable banner (410) | N/A | needs backend 410; not reproducible |
| 7 | CTA copy "Build around this" | PASS | every dialog: `pin-confirm-modal-confirm` |
| 8 | Crash check | PASS | no auxi crashes in `mobile_list_crashes` |

## Detail

### 1. Happy path — PASS
- Home → tapped idle "Pin" pill (`home-tile-pin-*-0`, black tee).
- Confirm sheet appeared with all required elements: grabber, title "Keep this
  item", subtitle, item image (`pin-confirm-modal-image`), full-width CTA
  `pin-confirm-modal-confirm` reading "Build around this", and "Don't show this
  popup again" checkbox.
- Confirmed → pinned tile rendered at **slot 0 (top-left)** with light
  **"Tap to unpin"** pill (testID `home-tile-pin-<id>-0-set`, a11y "Unpin item",
  101px wide vs 57px idle). Header gained a **"Pinned: Top  Clear"** chip.
  Outfit reshuffled around the pin (new pants + boots vs original).
- Screenshots: 01-home-initial, 02-confirm-sheet, 03-pinned-slot0.

### 2. Unpin — PASS
- Tapped the "Tap to unpin" pill → all three tiles returned to idle "Pin"
  (`-set` suffix gone, 57px), "Pinned:" header chip gone, grid normal.
- Screenshot: 04-unpinned.

### 3. Replace-pin — PASS on dialog behavior, but exposes F1
- Pinned item A (slot 0), then tapped idle pill on item B.
- Sheet correctly switched to context-aware title **"Replace pinned item?"**
  (vs "Keep this item") with B's image ("Wide Trousers · Rust"). Good.
- Confirmed → only-one-pin semantics hold internally (next tap still says
  "Replace"). BUT the resulting grid showed **no pinned tile** — see F1.
- Screenshots: 05-replace-pin-sheet, 06-after-replace.

### 7. CTA copy — PASS
- `pin-confirm-modal-confirm` literally reads "Build around this" in en locale
  across all first-pin and replace dialogs observed.

### 8. Crash check — PASS
- `mobile_list_crashes`: zero entries for `com.auxi2026.app` / `auxi`. The
  listed crashes are unrelated system/IDE procs (IDECacheDeleteAppExtension,
  AccessibilityControlsExtension, Cursor Helper, tipsd).
- Warm terminate+relaunch did NOT hit the known Xcode-26.5 AsyncStorage redbox;
  app reconnected to Metro and reached Home (skeleton loader → outfit) cleanly.

## FAILs

### F1 — Pinned visual state desyncs after reshuffle (MAJOR)
**Severity**: major
**Repro rate**: 2/2 replace-pin attempts; also seen on first-pin reshuffles
**Failing surface**: HomeScreen grid render after a `/build` reshuffle whose
returned batch omits the pinned item.

**Symptom**: After confirming a pin/replace, the new recommendation batch
frequently comes back WITHOUT the pinned item in any slot. When that happens,
the grid shows **all idle "Pin" pills, no `-set` tile, no slot-0 promotion, and
no "Pinned:" header chip** — yet the internal pin state is still set (the next
pin tap opens "Replace pinned item?", proving `pinnedItemId` persists). The user
is left with an **invisible, uncleared pin and no grid affordance to unpin it**
(the only unpin path is the pill, which isn't rendered).

**Root cause** (`src/screens/HomeScreen.tsx`):
- `pinnedItem` (the resolved `Item`) is derived by searching `listOutfits` for
  `id === pinnedItemId` (lines 1320-1331). When the new batch omits the item,
  this resolves to `null`.
- `buildGridOutfitSheetWithPin(outfit, null)` (line 1357) then falls straight
  through to `buildGridOutfitSheet` — the "absent → splice into slot 0" branch
  (lines 369-376) is dead because it needs a non-null `Item` object to splice.
- Tile pin state is `item.id === pinnedItemId` (line 2621); with no matching
  rendered item, `isPinned` is false everywhere → pill/promotion/header chip all
  vanish while the reducer's `pinnedItemId` stays set.

**Why it slipped past the designer gate**: the gate reviewed the *crafted* pinned
state, which renders correctly when the batch DOES include the pinned item (my
first happy-path run, batch `4d89bcdb8358`, was correct). The desync only
appears on the *next* reshuffle that drops the item — exactly the deferred
sub-state.

**Suggested fix (mobile-dev)**: retain the last-known pinned `Item` object in a
ref/state (don't re-derive solely from `listOutfits`) so the slot-0 splice
fallback can fire even when the new batch omits it. Reducer (`usePinReducer.ts`)
is sound — no change needed there.

**Routing**:
- mobile-dev (UI/state) — primary. Retain pinned Item; restore splice fallback.
- backend-dev (API) — secondary. `pinned_item_id` IS sent to `/build` &
  `/try_another` (recommendationService.ts:108,139); confirm BE is supposed to
  echo the pinned item back in the reshuffled set. If BE intentionally omits it,
  the mobile fix above is the contract-correct path.

### F2 — "Don't show again" preference never persists (MAJOR)
**Severity**: major
**Repro rate**: in-session AND cross-session, every time
**Failing surface**: pin-confirm sheet "Don't show this popup again" checkbox.

**Symptom**: Checked the box (screenshot 08 confirms the box rendered checked) +
confirmed. The confirm dialog still re-appears on the next pin — both in the same
session and after a warm terminate+relaunch. Cross-session is a hard FAIL per the
dispatch.

**Hard evidence**: the AsyncStorage backing file for the app
(`.../com.auxi2026.app/RCTAsyncLocalStorage_V1/manifest.json`) does NOT contain
the key `@auxi/pin/dont_show_confirm` after checking+confirming. The write never
landed. Manifest only holds: swipe-outfit coachmark, analytics consent, language,
last_known_weather.

**Code path** (`src/screens/HomeScreen.tsx`):
- Persistence is gated on `pinDontShowAgainPending` being true at confirm time
  (`handleConfirmPinFromModal`, lines 1652-1657 → `AsyncStorage.setItem`).
- The bypass that suppresses the sheet only fires for a **first pin**
  (`pinnedItemIdRef.current === null && pinDontShowAgainRef.current`, line 1582)
  — replaces always show the sheet by design (acceptable).
- The toggle (`handleToggleDontShowAgain`, line 1668) flips
  `pinDontShowAgainPending`, but `handleToggleItemPin` resets it to `false`
  (line 1591) when opening a non-bypassed sheet. Suspect the persist closure
  observed a stale/false `pinDontShowAgainPending`, so `setItem` never ran.

**Suggested fix (mobile-dev)**: verify `pinDontShowAgainPending` is true at the
moment `handleConfirmPinFromModal` runs (stale-closure / reset-timing bug between
`handleToggleDontShowAgain` and confirm). Add a unit test asserting
`AsyncStorage.setItem(@auxi/pin/dont_show_confirm,'true')` fires when the box is
checked at confirm, plus a mount-hydration test that a persisted 'true' bypasses
the first-pin sheet.

**Routing**: mobile-dev (UI/state).

## N/A items
- **#5 Guest blocker**: app is logged in (QA account). Only reachable guest path
  is logout (clears Keychain JWT) — destructive, would leave sim logged-out for
  later dispatches. Guest block is reducer-level (`AUTH_BLOCK` →
  `outfit:'auth_required'`), not triggerable while authenticated. Mark N/A.
- **#6 Item-unavailable banner**: needs a backend 410 Gone on the pinned item
  mid-session. Component (`PinnedItemUnavailableNotice`, HomeScreen.tsx:114) and
  reducer action (`PINNED_ITEM_GONE`) exist and are wired, but not reproducible
  without server manipulation. Mark N/A. NOTE: a sibling partial-match fallback
  notice DID fire ("We couldn't fully match this item, but here's the closest
  fit") during testing — that graceful-degradation surface works.

## Other observations (non-blocking)
- Dev-mode warning banner "Open debugger to view warnings" appeared (yellow,
  bottom). Not a crash; RN dev warnings only. Worth a mobile-dev glance at the
  Metro warning log given the state-desync above, but does not gate this smoke.
- New home skeleton loader ("Building your next looks" + `home-loading-macgie`)
  rendered correctly on warm relaunch.

## Screenshots
`auxi/docs/design-reviews/screenshots/260620/qa-pin-smoke/`
- 01-home-initial.png — 3 idle "Pin" tiles
- 02-confirm-sheet.png — first-pin sheet (grabber/CTA/checkbox)
- 03-pinned-slot0.png — pinned tile at slot 0, "Tap to unpin" pill, "Pinned:" chip
- 04-unpinned.png — back to all-idle after unpin
- 05-replace-pin-sheet.png — "Replace pinned item?" dialog
- 06-after-replace.png — desync: no pinned tile post-replace (F1)
- 07-dsa-checkbox.png — checkbox unchecked
- 08-dsa-checked.png — checkbox checked
- 09-drawer.png — push-drawer (no quick guest path)

## Unresolved questions
1. Is the backend `/build` supposed to echo `pinned_item_id` back as a distinct
   item in the reshuffled set? If yes → BE bug (F1 secondary). If no → mobile
   must retain the Item (F1 primary). tech-lead to confirm contract.
2. F2: confirm whether the stale-closure on `pinDontShowAgainPending` is the
   exact cause vs a missed dependency — mobile-dev to repro with a unit test.
