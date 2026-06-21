# Design Review — Pin-item flow (Figma-vs-mobile COMPARE)

**Date**: 2026-06-20
**Reviewer**: designer (step 6.5 gate, COMPARE mode — CEO request)
**Screen / flow**: Home → pin an item → confirm → reshuffle-around-pinned → unpin (+ error/fallback/unavailable states)
**Build**: round 1 `main` @ fcde8ad4 → round 2 `feat/pin-item-figma-flow` @ 35a5929c (warm sim, iPhone 16 Pro, iOS sim)
**Figma**: https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=3140-5959 — section "Pin an item flow" (3140:5959)

---

## ROUND 2 RE-GATE (2026-06-20 ~12:47) — VERDICT: PASS

mobile-dev shipped `feat/pin-item-figma-flow` (7 commits) closing the round-1 FAIL.
Re-ran the affected lenses on the changed surfaces (mechanical token lint + code read +
live sim after Metro reload onto the branch). All BLOCKER + MAJOR findings RESOLVED:

| Finding | Round-1 | Round-2 verification | Status |
|---|---|---|---|
| B1 pin affordance forked | badge+ring+band tooltip | new `PinTilePill.tsx`: on-tile labeled pill, idle=dark "Pin"/pinned=white "Tap to unpin", per Figma 3399:18412. Live: 57×28 idle pills + 101×28 pinned pill. | RESOLVED |
| B2 raw hex shadowColor | 2 hex literals | `auxi-lint-tokens.sh`: 0 raw shadowColor hex in all 4 B2-scope files; `ds.color.shadow`/`ds.shadow.*` added; `PinnedItemTooltip.tsx` deleted. | RESOLVED |
| M1 pinned not lead | landed top-right | `buildGridOutfitSheetWithPin` now reorders present-but-not-leading → slot 0 (real bug, not fallback-only). Live: pinned tee at index 0 / top-LEFT (`home-tile-pin-…-0-set`). | RESOLVED |
| M2 badge contrast | rgba white@30% invisible | idle pill = `ds.color.ink` dark fill; legible on black tee / brown trousers / tan loafers live. | RESOLVED |
| M3 dialog form + checkbox | centered 2-button card, no checkbox | rebuilt as full-width bottom sheet + grabber, single "Pin & build" CTA, "Don't show again" checkbox + AsyncStorage persist. Live confirmed. | RESOLVED |
| M4 no reduce-motion | none | `useReducedMotion` snap branch added; open/close `medium+enter`/`normal+exit` asymmetry preserved. | RESOLVED |
| M5 banner overlaps Remix | flex collision | banners now `pinBannerFloat` (own surface + `ds.shadow.card`, `box-none` host) above the deck/Remix. Code verified. | RESOLVED |
| MINOR copy/glyph | "Touch"/"Generating"/no glyph | "Tap to unpin", "Finding the mix", pin glyph (`currentColor`) on CTA + pills; 3 locales. | RESOLVED |
| ESCALATE dialog form / pin pattern | open | CEO confirmed: single-CTA bottom sheet + on-tile pill. Implemented. | RESOLVED (per CEO) |

Live round-2 evidence:
- `screenshots/260620/designer-regate-home-grid.png` — dark "Pin 📌" pills on every tile (legible on all garments)
- `screenshots/260620/designer-regate-confirm-sheet.png` — full-width bottom sheet + grabber + single "Pin & build" CTA + checkbox
- `screenshots/260620/designer-regate-pinned-leadposition.png` — pinned tee top-LEFT (slot 0) + white "Tap to unpin" pill

**Verdict change: FAIL → PASS.** The shipped pin flow now reads like Auxi — affordance,
lead position, dialog form, and motion all match the Figma flow and the design system.

### Carry-overs (non-blocking)
- ESCALATE remainder still open: error/network/item-unavailable/guest-blocker/pinned-gone
  states are built but were never *designed* in this Figma flow. They render correctly (on
  tokens, floated banners) but their visual treatment is the designer/CEO's to bless later
  — **not a blocker** for this PR.
- mobile-dev flagged single CTA reads "Pin & build" vs Figma label "Build around this"
  (built to CEO decision 2) — confirm copy with CEO; cosmetic, non-blocking.
- 3 unrelated AU-362 `2026-06-19/` screenshots still in the branch diff vs main despite the
  "unbundle" commit — housekeeping for mobile-dev/tech-lead, not a design finding.
- Not re-verified live: replace-pin variant, guest-blocker, item-unavailable, dont-show-again
  persistence across sessions — defer to qa-mobile smoke (step 7).

→ Proceed to qa-mobile smoke (step 7) → PR (step 8).

---

## ROUND 1 (original FAIL — retained for history)

### VERDICT: FAIL

Open BLOCKER (2) + MAJOR (5) → FAIL. Most are *experience/affordance* divergences from
the Figma flow, not a single-frame pixel gap (that's qa-ui's lane). Two are hard
design-system token violations the lint gate should have caught. One item (the
two-button vs single-CTA dialog shape) is a taste/scope call → **ESCALATE to CEO**.

---

## Figma flow as designed (5 frames)

| Frame | node | Role |
|---|---|---|
| Home 1/3 | 3140:5995 | grid entry (no pin yet) |
| touched the pin on an item | 3140:7577 | grid + **"noti" sheet** (3276:31736) = "Keep this item / Build around this" + **"don't show again" checkbox** |
| pin seletected | 3140:8026 | pinned grid: pinned tile carries a white **"Tap to unpin"** PILL (labeled, pin icon) at tile-top; action row = Remix / dots / Show another; "Wear this" CTA |
| Home - loading | 3171:9988 | reshuffle loading: title "Finding the mix" + spinner, grid placeholders |
| detail | 3140:7503 | item detail (Build-around entry) |

Pinned item in Figma sits in **position 0 (top-left)** and is signalled by the
on-tile **"Tap to unpin" pill** — NOT a ring, NOT an icon-only badge.

## Shipped flow as built (round 1)

- Pin affordance = icon-only 34×34 pin badge top-right of every non-system tile
  (`HomeScreen.tsx:2607`).
- Tap → centered `PinConfirmModal` (two buttons: Cancel + Build around this).
- Confirm → `Pinned: <label>` + `Generating` chips, skeleton tiles, then reshuffled grid.
- Pinned tile = 2px dark ring (`cardPinned`) + dark active icon badge, stays in its
  slot (landed **top-right**, not promoted to position 0).
- "Touch to unpin" nudge = band tooltip BELOW the grid, first 3 pins/session only.
- States built: confirm, replace, generating, fallback, error(generic/network),
  item-unavailable, guest-blocker, pinned-gone.

---

## Per-state Figma-vs-mobile diff (round 1)

| State | Figma | Mobile | Divergence | Sev |
|---|---|---|---|---|
| Pin affordance (idle) | implied tap target on tile | icon-only badge, very low-contrast (`rgba(255,255,255,0.3)` on light item) | affordance barely visible on light garments | MAJOR |
| Pinned-tile signal | white **"Tap to unpin"** labeled pill at tile-top + pin icon | 2px ring + dark icon badge; label moved OFF-tile to a band tooltip | affordance + copy + placement all differ | MAJOR |
| Unpin copy | "Tap to unpin" | "Touch to unpin" (`pin.tooltip_unpin`) | copy mismatch | MINOR |
| Pinned position | position 0 / top-left (lead) | stays in original slot (landed top-right) | pinned item not promoted to lead → hierarchy weaker | MAJOR |
| Confirm dialog shape | top-anchored full-width sheet, single full-width **"Build around this 📌"**, item shows "common" badge | centered narrow card, Cancel + Build-around-this two-button row, pin-circle indicator, no pin glyph on CTA | dialog form + CTA model differ | ESCALATE |
| "Don't show again" | checkbox present in noti sheet | **absent** | spec'd dismissal control missing | MAJOR |
| Reshuffle loading | "Finding the mix" + spinner, grid placeholders | "Generating" pill + skeleton tiles | copy + treatment differ (minor, both communicate progress) | MINOR |
| Build-around CTA glyph | pin icon (📌) on label | text-only | missing icon | MINOR |
| Error / fallback / unavailable | not designed in this Figma flow | built (inline banners) | extra states — good, but undesigned → flag | LOW/ESCALATE |

---

## Findings (round 1)

### BLOCKER 1 — Raw hex `shadowColor: '#000000'` in pin-flow components
**Lens**: 1 design-system / 4 color · **Rule**: color-rules.md §4 (no hex in `src/components/features/**`)
- `PinnedItemTooltip.tsx:89` — `shadowColor: '#000000'`
- `PinConfirmModal.tsx:196` — `shadowColor: '#000000'`
- `scripts/auxi-lint-tokens.sh` flags both as HEX. Lint gate (step 5) should have blocked.
- Fix: route to a `theme.ds.shadow.*` token (these define the dialog/sheet/floating
  shadows) or a `theme.colors.*` ink token, not a raw literal.
- Note: same pattern is pre-existing in `ContextChipsModal.tsx:268` + `AuthLayout.tsx:118`
  — a token-drift class; mobile-dev should sweep all four in one pass.
- **Routing → mobile-dev** · **R2: RESOLVED** (`ds.color.shadow` token; lint clean)

### BLOCKER 2 — Pinned-item affordance diverges from the design system pattern
**Lens**: 1 design-system / 6 cross-screen · **Rule**: design-system.md lens 1 (bypassed/forked component pattern)
- Figma's pin language is an **on-tile labeled "Tap to unpin" pill**. Shipped app uses a
  different language entirely: icon-only badge + 2px ring + an off-tile band tooltip.
  This is the canonical signal for the *entire pin feature* — a forked affordance is a
  system-consistency violation, not just a cosmetic gap.
- Evidence: Figma 3140:8026 (frame 3399:18412 "unpin" pill on the pinned tile) vs
  `HomeScreen.tsx:2607-2628` (badge) + `:3268` (`pinBadge`) + `PinnedItemTooltip.tsx`
  (band tooltip) + screenshot `designer-pin-reshuffled-fallback.png`.
- **Routing → mobile-dev** · **R2: RESOLVED** (new `PinTilePill.tsx`, verified live)

### MAJOR 1 — Pinned item not promoted to lead position (hierarchy)
**Lens**: 3 hierarchy / 8 recommendation
- Figma puts the pinned piece in position 0 (top-left) so "the thing you're building
  around" reads first. On the live reshuffle the pinned shorts stayed top-right
  (`home-tile-pin-...-1-set`). Pinned item competes instead of leading.
- Evidence: screenshot `designer-pin-reshuffled-fallback.png`; code `HomeScreen.tsx:328-347`.
- **Routing → mobile-dev** · **R2: RESOLVED** (reorder-to-slot-0 fix, verified live top-left)

### MAJOR 2 — Pin badge legibility on light garments
**Lens**: 1 design-system / 3 hierarchy (flagging; measurement → qa-ux)
- Idle pin badge fill is `rgba(255,255,255,0.3)` (`HomeScreen.tsx:3275`). Near-invisible
  on light items. Primary entry point to the whole feature is hard to find.
- Evidence: `designer-home-grid.png`; `HomeScreen.tsx:3275`.
- **Routing → mobile-dev + qa-ux** · **R2: RESOLVED** (dark `ds.color.ink` pill; qa-ux may still measure)

### MAJOR 3 — Missing "Don't show this popup again" control
**Lens**: 5 component states
- Figma noti sheet (3539:21337) has a checkbox; `PinConfirmModal.tsx` had none — every pin
  re-opened the dialog.
- Evidence: Figma 3539:21337 vs `PinConfirmModal.tsx`; `designer-pin-confirm-modal.png`.
- **Routing → mobile-dev** · **R2: RESOLVED** (checkbox + AsyncStorage persist; analytics event added)

### MAJOR 4 — No reduce-motion branch on pin animations
**Lens**: 2 motion · **Rule**: motion-rules.md §4 (required)
- `PinConfirmModal` slide-up had correct open/close token asymmetry BUT no `useReducedMotion`.
- Evidence: `grep useReducedMotion src/components/features/Pin*.tsx` → none.
- **Routing → mobile-dev** · **R2: RESOLVED** (`useReducedMotion` snap branch)

### MAJOR 5 — Fallback banner overlaps the Remix action row
**Lens**: 7 native-feel / 3 hierarchy
- Fallback banner rendered over the "Remix" control (flex collision).
- Evidence: `designer-pin-reshuffled-fallback.png`; `HomeScreen.tsx:2166-2222, 3485`.
- **Routing → mobile-dev** · **R2: RESOLVED** (`pinBannerFloat` floated above deck/Remix)

### MINOR — copy + glyph polish
**Lens**: 8 recommendation / 1 design-system
- "Touch to unpin" vs Figma "Tap to unpin"; "Generating" vs Figma "Finding the mix";
  Build-around CTA missing 📌 glyph.
- **Routing → mobile-dev** · **R2: RESOLVED** (all three, 3 locales)

### ESCALATE — Confirm dialog form + extra undesigned states (taste/scope → CEO)
**Lens**: 5 states / 6 cross-screen
1. Figma noti sheet vs shipped centered card — both valid; CEO call. → **R2: CEO chose sheet+single-CTA; implemented.**
2. error / network / item-unavailable / guest-blocker / pinned-gone built but undesigned. → **carry-over, non-blocking.**
3. Pin-signal pattern (Figma pill vs ring+badge+tooltip). → **R2: CEO chose pill; implemented.**
- **Routing → CEO**

---

## Journey continuity (where am I / where was I / what next)

- Round 1: *what do I do next to undo* was weak — unpin label lived off-tile in a 3s
  session-capped tooltip; after 3 pins no on-screen unpin cue.
- Round 2: persistent on-tile "Tap to unpin" pill restores the answer — the undo affordance
  is always visible on the pinned tile. RESOLVED.

---

## Screenshots
- Figma pin-selected: `screenshots/260620/figma-pin-selected.png`
- Figma noti (Keep this item / Build around this + checkbox): `screenshots/260620/figma-pin-touched-noti.png`
- R1 mobile home grid (icon badges): `screenshots/260620/designer-home-grid.png`
- R1 mobile confirm modal (centered card): `screenshots/260620/designer-pin-confirm-modal.png`
- R1 mobile generating/reshuffle: `screenshots/260620/designer-pin-generating.png`
- R1 mobile reshuffled + fallback (top-right pin, banner overlap): `screenshots/260620/designer-pin-reshuffled-fallback.png`
- R2 mobile home grid (dark "Pin" pills): `screenshots/260620/designer-regate-home-grid.png`
- R2 mobile confirm bottom sheet: `screenshots/260620/designer-regate-confirm-sheet.png`
- R2 mobile pinned top-left + "Tap to unpin": `screenshots/260620/designer-regate-pinned-leadposition.png`

## Routing summary
- **mobile-dev**: all R1 findings RESOLVED on `feat/pin-item-figma-flow`. Remaining: confirm "Pin & build" vs "Build around this" copy with CEO; clean up stray AU-362 screenshots from branch diff.
- **CEO**: ESCALATE items 1 & 3 decided (sheet + pill). Item 2 (undesigned error/fallback/guest treatments) still open — non-blocking, bless later.
- **qa-ux**: pill contrast + reduce-motion a11y measurement (optional confirm).
- **qa-mobile**: smoke the variants not re-verified live (replace-pin, guest, item-unavailable, dont-show persistence).
- **qa-ui**: residual pixel deltas vs frames now the pattern is settled.

---

## Round 3 — pin-button adjudication + CEO resolution (2026-06-21)

CEO disputed the R2 pin affordance ("nút pin cũ đang đúng design"). qa-ui ran an
independent Figma adjudication (`docs/qa-findings/260621-ui-pin-button-figma-adjudication.md`).
**Verdict: Figma is a SPLIT — both R1 designer and CEO were each half right:**

| State | Figma | R2 shipped | Correct | Action |
|---|---|---|---|---|
| **Pinned** | white "Tap to unpin" pill (`3399:18412`) | white pill ✅ | designer | keep |
| **Idle** | faint icon-only badge, top-right, no label (`3399:18455` / `3227:23868`) | dark "Pin" pill ❌ | **CEO** | revert idle → badge |
| Ring + off-tile band | none in Figma | dropped ✅ | designer | keep dropped |

**CEO decision:** idle → faint icon-only badge (100% Figma fidelity, accepts the
M2 light-garment legibility tradeoff); pinned → keep white pill.
**Implemented:** commit `713e80f3` (`PinTilePill.tsx` idle branch → `rgba(255,255,255,0.3)`
34×34 icon-only badge, top-right `top:8/right:9`, no label; pinned pill untouched;
dead `pin.pin_cta` key removed across 3 locales). tsc/lint/token-lint clean.
**Verify:** code + Figma token match only — live sim re-verify blocked by the
Xcode 26.5 ↔ RN 0.83.1 cold-launch redbox (infra blocker, devops/tech-lead);
deferred to follow-up once toolchain is fixed.
</content>
