# Design Review — Pin-item flow (Figma-vs-mobile COMPARE)

**Date**: 2026-06-20
**Reviewer**: designer (step 6.5 gate, COMPARE mode — CEO request)
**Screen / flow**: Home → pin an item → confirm → reshuffle-around-pinned → unpin (+ error/fallback/unavailable states)
**Build**: `main` @ fcde8ad4 (auxi submodule), warm sim (iPhone 16 Pro, iOS sim)
**Figma**: https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=3140-5959 — section "Pin an item flow" (3140:5959)

## VERDICT: FAIL

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

## Shipped flow as built

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

## Per-state Figma-vs-mobile diff

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

## Findings

### BLOCKER 1 — Raw hex `shadowColor: '#000000'` in pin-flow components
**Lens**: 1 design-system / 4 color · **Rule**: color-rules.md §4 (no hex in `src/components/features/**`)
- `PinnedItemTooltip.tsx:89` — `shadowColor: '#000000'`
- `PinConfirmModal.tsx:196` — `shadowColor: '#000000'`
- `scripts/auxi-lint-tokens.sh` flags both as HEX. Lint gate (step 5) should have blocked.
- Fix: route to a `theme.ds.shadow.*` token (these define the dialog/sheet/floating
  shadows) or a `theme.colors.*` ink token, not a raw literal.
- Note: same pattern is pre-existing in `ContextChipsModal.tsx:268` + `AuthLayout.tsx:118`
  — a token-drift class; mobile-dev should sweep all four in one pass.
- **Routing → mobile-dev**

### BLOCKER 2 — Pinned-item affordance diverges from the design system pattern
**Lens**: 1 design-system / 6 cross-screen · **Rule**: design-system.md lens 1 (bypassed/forked component pattern)
- Figma's pin language is an **on-tile labeled "Tap to unpin" pill**. Shipped app uses a
  different language entirely: icon-only badge + 2px ring + an off-tile band tooltip.
  This is the canonical signal for the *entire pin feature* — a forked affordance is a
  system-consistency violation, not just a cosmetic gap.
- Evidence: Figma 3140:8026 (frame 3399:18412 "unpin" pill on the pinned tile) vs
  `HomeScreen.tsx:2607-2628` (badge) + `:3268` (`pinBadge`) + `PinnedItemTooltip.tsx`
  (band tooltip) + screenshot `designer-pin-reshuffled-fallback.png`.
- This one straddles design-system + taste: the *pattern* is wrong vs Figma (BLOCKER on
  consistency), but whether to adopt the Figma pill or keep the ring is partly a CEO call
  → see ESCALATE below. Filed BLOCKER because as-is it does not match the documented flow.
- **Routing → mobile-dev (implement Figma pill) — pending CEO confirm on the pattern**

### MAJOR 1 — Pinned item not promoted to lead position (hierarchy)
**Lens**: 3 hierarchy / 8 recommendation
- Figma puts the pinned piece in position 0 (top-left) so "the thing you're building
  around" reads first. `buildGridOutfitSheetWithPin` (`HomeScreen.tsx:328-347`) DOES splice
  the pinned item to index 0 — but on the live reshuffle the pinned shorts stayed top-right
  (`home-tile-pin-...-1-set`). The lead-position intent isn't reaching the rendered grid
  (the spliced sheet may not be the one rendered post-generation, or grid layout overrides
  ordering). Pinned item competes instead of leading.
- Evidence: screenshot `designer-pin-reshuffled-fallback.png`; code `HomeScreen.tsx:328-347`.
- **Routing → mobile-dev**

### MAJOR 2 — Pin badge legibility on light garments
**Lens**: 1 design-system / 3 hierarchy (flagging; measurement → qa-ux)
- Idle pin badge fill is `rgba(255,255,255,0.3)` (`HomeScreen.tsx:3275`). On the live grid
  it's near-invisible on light items (white tee / grey shorts). The primary entry point to
  the whole feature is hard to find. Figma's affordance is high-contrast (labeled pill).
- Evidence: `designer-home-grid.png` (top-right badges barely visible); `HomeScreen.tsx:3275`.
- Designer flags the legibility/hierarchy concern; **contrast measurement → qa-ux**.
- **Routing → mobile-dev (raise contrast) + qa-ux (measure)**

### MAJOR 3 — Missing "Don't show this popup again" control
**Lens**: 5 component states
- Figma noti sheet (3539:21337) has a checkbox "Don't [not] show this popup again".
  `PinConfirmModal.tsx` has no such control — every pin re-opens the dialog. Repeated
  friction on the core build-around action; the spec'd dismissal escape hatch is absent.
- Evidence: Figma 3539:21337 vs `PinConfirmModal.tsx:105-177`; `designer-pin-confirm-modal.png`.
- (If wired, needs a `track()` + tracking-plan entry per analytics rule.)
- **Routing → mobile-dev**

### MAJOR 4 — No reduce-motion branch on pin animations
**Lens**: 2 motion · **Rule**: motion-rules.md §4 (required)
- `PinConfirmModal.tsx:57-88` animates a slide-up (`translateY`) with correct open/close
  token asymmetry (`medium`+`enter` / `normal`+`exit` — good) BUT no `useReducedMotion`
  branch. `PinnedItemTooltip` appears with no reduce-motion consideration either.
- Evidence: `grep useReducedMotion src/components/features/Pin*.tsx` → none.
- Designer flags the motion-system miss; a11y verdict → qa-ux.
- **Routing → mobile-dev**

### MAJOR 5 — Fallback banner overlaps the Remix action row
**Lens**: 7 native-feel / 3 hierarchy
- After a fallback ("We couldn't fully match this item…"), the `pinInlineBanner`
  (`HomeScreen.tsx:3485`, `marginBottom:8`) renders over/against the "Remix" control —
  "Remix" is partially occluded in the live shot. Reads as a layout collision, not a
  composed native screen.
- Evidence: `designer-pin-reshuffled-fallback.png` (Remix clipped behind banner);
  `HomeScreen.tsx:2166-2222, 3485`.
- **Routing → mobile-dev**

### MINOR — copy + glyph polish
**Lens**: 8 recommendation / 1 design-system
- "Touch to unpin" vs Figma "Tap to unpin" (`pin.tooltip_unpin`).
- Reshuffle copy "Generating" vs Figma "Finding the mix" — Figma reads warmer/curated.
- Build-around CTA missing the 📌 glyph Figma shows.
- **Routing → mobile-dev (logged, non-blocking)**

### ESCALATE — Confirm dialog form + extra undesigned states (taste/scope → CEO)
**Lens**: 5 states / 6 cross-screen
1. Figma noti = top-anchored full-width sheet, single full-width "Build around this" CTA,
   item shows "common" badge. Shipped = centered narrow card, two-button Cancel+Build row,
   pin-circle indicator. Both are valid patterns; which is "Auxi" is a CEO call.
2. error / network / item-unavailable / guest-blocker / pinned-gone are built but NOT in
   this Figma flow — robust engineering, but their visual treatment is undesigned. CEO to
   confirm copy/treatment or hand to Product Designer.
3. The whole pin-signal pattern (Figma pill vs shipped ring+badge+tooltip, BLOCKER 2) —
   confirm the target pattern before mobile-dev rebuilds.
- **Routing → CEO**

---

## Journey continuity (where am I / where was I / what next)

- "Pinned: <label>" + "Generating" chips answer *where am I* well during reshuffle — good.
- *What do I do next to undo* is weak: unpin label lives off-tile in a 3s session-capped
  tooltip; after 3 pins there's no on-screen unpin cue except the low-contrast badge
  (the a11y label "double-tap to unpin" exists but isn't visible). Figma's persistent
  on-tile "Tap to unpin" pill solves this. Ties to BLOCKER 2 + MAJOR 2.

---

## Screenshots
- Figma pin-selected: `screenshots/260620/figma-pin-selected.png`
- Figma noti (Keep this item / Build around this + checkbox): `screenshots/260620/figma-pin-touched-noti.png`
- Mobile home grid (idle badges): `screenshots/260620/designer-home-grid.png`
- Mobile confirm modal: `screenshots/260620/designer-pin-confirm-modal.png`
- Mobile generating/reshuffle: `screenshots/260620/designer-pin-generating.png`
- Mobile reshuffled + fallback: `screenshots/260620/designer-pin-reshuffled-fallback.png`

## Routing summary
- **mobile-dev**: BLOCKER 1 (hex sweep), MAJOR 1–5, MINOR copy/glyph; implement Figma pin pill (BLOCKER 2) once CEO confirms pattern.
- **CEO (ESCALATE)**: dialog form (sheet vs card / single vs two-button), pin-signal pattern, undesigned error/fallback/guest treatments.
- **qa-ux**: badge contrast + reduce-motion a11y measurement.
- **qa-ui**: any residual pixel deltas vs frames once the pattern is settled.
</content>
</invoke>
