# Z-index / Elevation Token Refactor — iOS Overlay Smoke

**Date**: 2026-06-14
**Build**: `24d05681` · branch `feat/home-tinder-swipe`
**Device**: iOS Simulator — iPhone 16 Pro, iOS 18.1
**Lane**: mobile-mcp exploratory verify (no Maestro flow for these surfaces yet)
**App**: `com.auxi2026.app` (logged in as `qa-test@auxi.app`, locale vi-VN)
**MCP pre-flight**: `mcp-doctor.sh` exit 0 — sim booted, WDA on :8100, mobile-mcp pinned 0.0.56
**Crashes**: none for `com.auxi2026.app` across the whole session (`mobile_list_crashes` unchanged at start/end; only unrelated system + Cursor entries present).

## Scope
Validate that the `theme.zIndex` token refactor (base:0/content:1/sticky:100/dim:1000/modal:1100/toast:1200)
introduced NO stacking regression in live overlays. Read-only on src — verification only.

## Results

| # | Surface | Token under test | Result |
|---|---------|------------------|--------|
| 0 | App launch → Home, no crash | — | **PASS** |
| 1 | Sidebar drawer (RAW `1000` → `zIndex.modal`) | modal/dim | **PASS** |
| 2 | Context-chips modal (`card` → `zIndex.modal`) | modal | **PASS** |
| 3 | Mood feedback sheet (`sheet` → `zIndex.modal`) | modal | **BLOCKED** |
| 4 | Save-success toast `moodBanner` (`zIndex.toast`) | toast | **BLOCKED** |
| 5 | Swipe coach-mark (`scrim`→dim, `dialog`→modal) | dim/modal | **BLOCKED (runtime)** — code-confirmed |
| 6 | Deck like/skip drag cue (`2` → `zIndex.content`) | content | **PARTIAL** |
| 7 | ItemDetailBottomSheet (legacy, `_HomeScreen` only) | dim/modal | **N/A** (as task expected) |

---

### 0. App launch — PASS
Launched clean to Welcome (logged out), logged in via Email CTA with QA account, landed on
Home with a real outfit recommendation. No crash, no red-box error beyond the standard RN
dev "Open debugger to view warnings" notice.
Screenshot: `docs/qa-findings/screenshots/2026-06-14/qa-mobile-zindex-01-home-launch.png`

### 1. Sidebar drawer — PASS (highest-value: only RAW literal changed)
Opened via `home-menu-button` (hamburger). The dark drawer panel (`zIndex.modal` = 1100)
renders fully ABOVE Home content; Home content slides right and sits BEHIND the panel
(drawer-push pattern — heart toggle x shifted 335→649, "Easy and ready" 28→342 in the a11y
tree, confirming the content translate). All menu items paint on top (Tủ đồ, Yêu thích,
Phản hồi, Cài đặt, Tài khoản, Canvas phối đồ, Đăng xuất). Tapping the exposed backdrop
region (`sidebar-backdrop`) dismissed the drawer — Home content snapped back to original
coordinates, fully interactive.
Screenshot: `docs/qa-findings/screenshots/2026-06-14/qa-mobile-zindex-02-sidebar-drawer.png`

### 2. Context-chips modal — PASS
The explicit "Edit context +" pill (`home-edit-context-<cellKey>`) is **commented out** in
the live HomeScreen (HomeScreen.tsx:1978-1985), so the only reachable trigger is the
swipe-nudge: 3 consecutive skips on an unfavourited outfit → `setIsContextModalOpen(true)`
(`UNFAVORITED_SWIPE_THRESHOLD`, HomeScreen.tsx:1140-1148). Performed 3 left-swipes; the
modal opened (`context-chips-shuffle` surfaced). The modal card (`zIndex.modal` = 1100)
sits ABOVE content with a clearly visible **dim scrim** greying the Home grid behind it.
"Hủy" (Cancel) dismissed it cleanly — Home returned fully interactive.
Screenshots:
- `docs/qa-findings/screenshots/2026-06-14/qa-mobile-zindex-04-context-chips-modal.png`

### 3 & 4. Mood feedback sheet + Save-success toast — BLOCKED
Both surfaces gate behind a single trigger: the "Mặc bộ này" (Wear this) CTA inside the
`OptionSheet` card (HomeScreen.tsx:1461/1475 `onConfirm` → `handleWearThisForOutfit` →
opens `MoodFeedbackSheet`; submit shows `moodBanner` toast).

I could not reach this CTA via mobile-mcp coordinate taps. Root causes (verified by repeated
attempts + source):
- The "Mặc bộ này" PillButton **never appears in the accessibility tree** in any settled
  deck state (only `home-heart-toggle`, `home-tile-pin-*`, `home-remix`, footer tabs are
  enumerated). It has no enumerable testID/a11y node, so mobile-mcp cannot target it by id.
- Coordinate taps in the CTA's visual region (≈ x18–280, y497–540) are intercepted: center/
  right taps hit the centered 3rd outfit tile's tall touch zone and open the **AU-312
  item-detail pushed screen** (`item-detail-title`); off-target taps are consumed by the
  `OutfitSwipeDeck` pan-responder and advance the card (observed: "Low-key today" →
  "Quiet today" from a tap meant for the CTA).
- The CTA only renders on the fully-revealed active card (`reveal: 'full'` when
  `clampedActiveIndex === 0`); on peek/light cards it is absent (confirmed in screenshot 09
  — "Quiet today" peek card shows no Wear-this CTA).

This is a **test-reachability** blocker, not a confirmed stacking regression. The MoodFeedback
sheet and toast token values are correct in source (`sheet` → `zIndex.modal`; `moodBanner`
→ `zIndex.toast`), but I could not visually confirm them at runtime.
Screenshots (CTA reachability evidence):
- `docs/qa-findings/screenshots/2026-06-14/qa-mobile-zindex-06-home-3item.png` (CTA visible)
- `docs/qa-findings/screenshots/2026-06-14/qa-mobile-zindex-08-cta-state.png`
- `docs/qa-findings/screenshots/2026-06-14/qa-mobile-zindex-09-cta-retry.png` (peek card, no CTA)
- `docs/qa-findings/screenshots/2026-06-14/qa-mobile-zindex-05-item-detail.png` (mis-tap → item-detail)

**Routing**: `mobile-dev` — add a `testID` (e.g. `home-wear-this-<cellKey>`) +
`accessibilityLabel` to the "Mặc bộ này" PillButton (HomeScreen.tsx ~line 1955-1967) so the
CTA is deterministically targetable. Then `qa-ui` — author a Maestro flow that `tapOn`s it
by id (Maestro resolves by element id, bypassing the coordinate/pan-responder problem) and
asserts `mood-feedback-sheet` then `mood-feedback-banner` visibility. The toast-above-footer
check (#4) specifically needs that flow.

### 5. Swipe coach-mark — BLOCKED (runtime) / code-confirmed
The horizontal coach-mark did NOT appear on launch — it is a one-time AsyncStorage-gated
overlay (`@auxi/coachmark/swipe-outfit`, SwipeCoachMark.tsx:96-99) and this QA account has
already dismissed it. Forcing it requires wiping app data (reinstall), which would also log
out the session and invalidate the remaining checks — out of scope for a non-destructive
smoke.

Source verification is unambiguous (SwipeCoachMark.tsx:173-186): `scrim` =
`theme.zIndex.dim` (1000), `dialog` = `theme.zIndex.modal` (1100), rendered inside a RN
`Modal` (own stacking context). Token mapping is correct; only the runtime screenshot is
blocked.

### 6. Deck like/skip drag cue — PARTIAL
The cue badges (`deckCue` → `zIndex.content`, HomeScreen.tsx:1487-1505) render via
`renderCue` with opacity driven by live drag position and `pointerEvents="none"`. They are
only visible MID-drag, so a completed-swipe screenshot can't capture them. I confirmed the
swipe gesture itself works (deck advanced through multiple outfits on each left-swipe), but
mobile-mcp's discrete swipe can't hold a partial-drag frame to screenshot the floating
badge. No regression observed (cards advanced normally, badge is `content` tier above the
card body which is correct). Deterministic capture needs a Maestro/Detox partial-drag — flag
to `qa-ui`.
Screenshot (post-swipe advance): `docs/qa-findings/screenshots/2026-06-14/qa-mobile-zindex-03-deck-cue-skip.png`

### 7. ItemDetailBottomSheet — N/A (as task anticipated)
The live HomeScreen routes outfit-item taps to the **AU-312 item-detail pushed full screen**
(`item-detail-title`, navigated — has a back button, not an overlay), NOT the legacy
`ItemDetailBottomSheet` modal that carries the z-index/elevation change. Confirmed in source
(item taps → `handleOpenItemDetail`) and at runtime (screenshot 05). The legacy bottom sheet
is reachable only via `_HomeScreen`, exactly as the task said. Marked N/A — not forced.

---

## Summary counts
Overlays checked: 7 · PASS 2 (sidebar, context-chips) + launch · BLOCKED 3 (mood sheet,
toast, coach-mark) · PARTIAL 1 (deck cue) · N/A 1 (legacy item sheet)
Jest: not run (pure UI-stacking diff, no unit-testable logic).
Findings filed: this report.

## Unresolved questions / follow-ups
1. "Mặc bộ này" (Wear this) PillButton needs a `testID` + `accessibilityLabel` —
   currently unreachable by any automated selector. Blocks MoodFeedback sheet (#3) AND
   save-success toast (#4) verification. → `mobile-dev`, then `qa-ui` for the Maestro flow.
2. Coach-mark (#5) and deck drag-cue (#6) both need deterministic flows (AsyncStorage reset
   / partial-drag) that mobile-mcp coordinate automation can't do. → `qa-ui`.
3. No stacking regression was observed on ANY surface I could reach; the two BLOCKED modal
   surfaces have correct token values in source but lack runtime confirmation.

**Status:** DONE_WITH_CONCERNS
**Summary:** Sidebar drawer (the only RAW literal changed) and context-chips modal both PASS
— overlays paint above content with visible dim, dismiss works, zero auxi crashes. Mood
sheet, save toast, and coach-mark are BLOCKED on test-reachability (CTA has no testID / deck
pan-responder swallows taps; coach-mark is first-run-gated), not on any observed regression.
**Concerns/Blockers:** The "Wear this" CTA needs a testID before #3/#4 can be verified at
runtime — file to mobile-dev, then qa-ui for a Maestro flow. Coach-mark token mapping is
code-confirmed (scrim=dim, dialog=modal) but runtime capture needs an AsyncStorage wipe.
