# Figma extraction — Pin an item flow (AU-307 redesign)

**Date**: 2026-06-20
**Figma**: https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=3140-5959
**Section**: "Pin an item flow" (3140:5959)
**Source of task**: designer COMPARE gate FAIL (`docs/design-reviews/260620-pin-item-flow-compare.md`) + 2 CEO-confirmed pattern decisions.
**Note**: This is a re-implementation of an EXISTING flow against Figma, not a net-new screen. Open questions on the two divergent patterns were already resolved by CEO sign-off (decisions 1 & 2 below) — so extraction → code proceeds without a separate qa-ui review-extraction pass.

## Frames

| Frame | node | Role |
|---|---|---|
| Home 1/3 | 3140:5995 | grid entry, no pin yet |
| touched the pin | 3140:7577 | grid + confirm "noti" sheet (3276:31736) |
| pin selected | 3140:8026 | pinned grid: pinned tile (slot 0) carries the "Tap to unpin" pill (3399:18412) |
| Home - loading | 3171:9988 | reshuffle loading: title "Finding the mix" + spinner |
| detail | 3140:7503 | item detail (Build-around entry) |

## Component 1 — "Tap to unpin" pill (node 3399:18412)

On the pinned tile, top-center.

- Layout: HORIZONTAL, gap 4, items-center. Pill ~100×32 (vector Rectangle 105 = white rounded bg).
- Text "Tap to unpin": `Text-xxs/Regular` = Inter/body 10/12, color `color/neutral/800` = `#1d1f23`.
- Icon: 17×17 pin glyph (instance "icons").
- Surface: white (`#ffffff`), fully-rounded, soft drop shadow.

### RN mapping (`PinTilePill.tsx`)
- One component, two states:
  - **pinned** → white pill, "Tap to unpin" + glyph, text/glyph = `ds.color.ink` (#1d1f23). Matches Figma exactly.
  - **idle** (not pinned) → DARK pill (ink bg), "Pin" + cream glyph/text. Figma only implies an idle tap target; the designer flagged the old idle badge as near-invisible on light garments (MAJOR 2), so idle uses the high-contrast dark pill. The pill IS high-contrast by design (subsumes M2).
- Tokens: `ds.color.white`/`ink`, `ds.radius.full`, `ds.shadow.floatingButton`, `spacing.s/xs/m`, `interCaptionXxs` (Inter 10/12).
- testID: `home-tile-pin-<key>-<i>` (idle) ↔ `…-set` (pinned) — always-defined, suffix flip. a11yLabel: "Pin item" / "Unpin item" (distinct from testID, per CLAUDE.md).

## Component 2 — confirm "noti" sheet (node 3276:31736 / 3539:21353)

Full-width, bottom-anchored, rounded top corners.

- Scrim: `rgba(25,27,34,0.3)`.
- Sheet: white (`background/neutral/subtlest`), `border-radius/2xl` (16) top corners, px 16 / py 24, gap 16.
- Headline "Keep this item": `Text-md/Semibold` = 16/24 weight 600, `text/neutral/base` (#1d1f23).
- Supporting "We'll keep this piece and remix the rest.": `Text-sm/Regular` = 14/20.
- Image 3:4, full width, radius 16, bg `background/primary/subtle_50` (#f2efec); "common" badge bottom-center on a dark pill (`#121212bf`).
- Button group: pt 16 / pb 36 / px 16, gap 12.
  - Single full-width CTA, 56h, radius 16, bg `background/neutral/base` (#1d1f23), label + 24px pin glyph. Figma label = "Build around this".
  - Checkbox 18px (ink fill, radius 2) + check + "Don't [not] show this popup again" (`Text-xxs`).

### RN mapping (`PinConfirmModal.tsx` rebuilt)
- Bottom sheet: `Modal transparent` + `justifyContent:'flex-end'`, slide-up (medium+enter) / slide-down (normal+exit), `+ reduce-motion snap branch (M4)`.
- Grabber handle added per CEO decision 2 (Figma omits it; CEO asked for it).
- Single CTA labeled **"Pin & build"** (CEO decision 2 overrides the Figma "Build around this" string for this CTA) + pin glyph.
- Checkbox + "Don't show this popup again".
- Tokens: `ds.color.surface/ink/black/white`, `ds.radius.md/xs/full`, `ds.shadow.sheet`, `figmaOverlayScrim`, `uacBodyMdSemibold`/`interBodySm`/`interCaptionXxs`/`poppinsButton`, `figmaCardSurface`, `figmaCardTag`.

## Tokens used (Figma → theme.ts)

| Figma var | theme path | status |
|---|---|---|
| color/neutral/800 #1d1f23 | `ds.color.ink` | exists |
| background/neutral/subtlest #ffffff | `ds.color.surface`/`white` | exists |
| background/primary/subtle_50 #f2efec | `figmaCardSurface` | exists |
| neutral/black Alpha300 #121212bf | `figmaCardTag` | exists |
| icon/primary/bold_700 #070707 | `ds.color.black` | exists |
| border-radius 2xl (16) | `ds.radius.md` | exists |
| border-radius xs (2) | `ds.radius.xs` | exists |
| scrim rgba(25,27,34,.3) | `figmaOverlayScrim` (rgba(38,36,33,.7)) | close existing scrim reused |
| shadow ink #000000 | `ds.color.shadow` (NEW) | added for B2 |

## Icons

- `icon_home_pin.svg` (already exists) — converted baked `fill="#C6BCB1"` → `currentColor` so it themes per state (pill ink/cream, sheet CTA cream). No new icon exported.
- Checkbox tick: rendered as a styled `✓` Text glyph (no new asset) — Figma's check_small instance had no matching plain-check SVG in the repo.

## Variants / states implemented

- Pill: idle / pinned (+ pressed via activeOpacity).
- Confirm sheet: confirm / replace variants, CTA pressed + debounced-disabled, reduce-motion branch, common-badge conditional.
- Deck states retained: generating skeletons, fallback / error(generic,network) / item-unavailable / guest-blocker / pinned-gone banners (now floated — M5).

## CEO-confirmed decisions (not open questions)

1. Pin affordance = Figma "Tap to unpin" pill; REPLACE icon-badge + 2px ring + off-tile band tooltip. (pill is high-contrast by design → subsumes light-garment contrast issue M2.)
2. Confirm = full-width top/bottom sheet, grabber, single "Pin & build" CTA (drop Cancel/Build two-button row), + "Don't show again" checkbox.

## Open questions for CEO / tech-lead

- None blocking — both divergent patterns were CEO-confirmed. Minor: the single CTA reads "Pin & build" (CEO decision 2) while the Figma frame label is "Build around this"; built to the CEO instruction. Confirm if Figma copy should follow.

## New backend fields (vs current API client)

- None — pin uses the existing `pinned_item_id` contract on `/build` + `/try_another`. M1 lead-position fix is FE-only (grid reorder in `buildGridOutfitSheetWithPin`); the BE-honours-`pinned_item_id` follow-up remains tracked (see code comment), but no new field is required.
