# AU-392 — 4-State Tile Status Badge: Consistency Sweep

**Date:** 2026-07-30
**Mode:** Compare (consistency sweep, no Figma frame — see phase-06 D3)
**Scope:** `auxi/src/components/features/TileStatusBadge.tsx` +
`auxi/src/utils/tile-status.ts` rendered across every outfit-item surface.
**Backend:** real, on `:5001` (per `qa-boot.sh`), no mocks.
**Device:** iPhone 17 Pro simulator, iOS 26.5, `com.auxi2026.app`.

## Method

1. Code review of all 4 consumers of `TileStatusBadge` +
   `resolveTileStatus`/`CanvasItemData.status` to confirm every surface
   renders the literal same component (not a re-styled copy).
2. Sim walk (mobile-mcp, read-only screenshot tier — no swipe/drag tool
   available) across: Home outfit grid → Home collage-play → Wardrobe
   grid → Favourite outfit grid → Favourite collage → Remix editor
   (Outfit Canvas).
3. Cross-referenced live findings against the existing unit-test suites
   (`tile-status.test.ts`, `garment-preview.render.test.tsx`,
   `FavouriteOutfitCard.render.test.tsx`) for the states I could not
   trigger live with the seed data available.

## Code-level consistency (PASS)

All 4 render sites import and render the identical `TileStatusBadge`
component — no forked/duplicated pill implementation exists:

| Surface | File | Status source |
|---|---|---|
| Wardrobe grid tile | `src/screens/wardrobe/WardrobeGridTile.tsx:92` | `resolveTileStatus(item)` |
| Home outfit grid tile | `src/screens/HomeScreen/components/GarmentPreview.tsx:28` | `resolveTileStatus(item)` |
| Favourite outfit card grid tile | `src/screens/favourite/FavouriteOutfitCard.tsx:114` | `resolveTileStatus(item)` |
| Favourite collage view | `src/screens/favourite/FavouriteOutfitCard.tsx:202` | `resolveTileStatus(item)` via `seedCanvasLayout` |
| Home collage-play canvas | `src/components/features/OutfitCanvasSurface.tsx:424` (via `CollageSheetCanvas` → `seedFromOutfit`) | `resolveTileStatus(item)` (`collage-seed-layout.ts:634`) |
| Remix editor canvas (initial items) | `src/screens/OutfitCanvasScreen.tsx:94` | `resolveTileStatus(it)` |

`grep badge_common` returns exactly `TileStatusBadge.tsx` +
`PinConfirmModal.tsx` — matches the phase-06 "exactly one implementation"
success criterion.

"Your Piece" badge (top-left, `OptionSheet.tsx:128-136` /
`styles.ts:191-201`) vs the new status pill (bottom-centre,
`TileStatusBadge.tsx:22-28`) — confirmed no positional collision at the
style level (D2, resolved). Not empirically triggered on sim (no
`isExploration: true` item in the current seed data landed in a badge-
bearing outfit) — code-level PASS only for this specific pairing.

## Surface-by-surface result

### 1. Home outfit grid — PASS

Screenshot: `screenshots/2026-07-30/qa-ui-home-outfit-grid.png`

Outfit of 3 items: dress (no badge), trousers ("Macgie" pill,
bottom-centre, dark fill/white text), heels (no badge). This is the
literal regression the ticket was filed against — a prior build showed
"Macgie" unconditionally on every tile. Confirms **conditional**
rendering is live against the real `:5001` backend.

### 2. Favourite outfit card grid — PASS

Screenshot: `screenshots/2026-07-30/qa-ui-favourite-grid.png`

Two saved outfits: loafers + blazer both show "Macgie"; pink dress and
blue loafers on the second card show "Macgie" only on the loafers, no
badge on the dress. Pixel-identical pill styling (fill colour, corner
radius, bottom-centre position, caption typography) to the Home tile —
side-by-side crop comparison shows byte-identical treatment (as
expected, same component).

### 3. Wardrobe grid (baseline) — PASS with a caveat

Screenshot: `screenshots/2026-07-30/qa-ui-wardrobe-grid-1.png`

All 12 visible tiles show **no** badge. This is a correct result, not a
gap: every visible item is a user-owned item that is neither common,
new, nor demoted (`resolveTileStatus` → `null`), which is a valid state.
**Caveat:** I could not scroll (the qa-ui read-only mobile-mcp tier has
no swipe tool) or find "new" / "less_use" / "common" wardrobe items
within the single visible screen, so the wardrobe-grid badge itself
wasn't visually re-confirmed live in this sweep. Not silently skipped —
flagging explicitly. Confidence is still high because `WardrobeGridTile`
calls the exact same `resolveTileStatus` + `TileStatusBadge` and the
resolver has full dedicated unit coverage (`tile-status.test.ts`,
all states, `WardrobeItem` shape).

### 4. Favourite collage view — **FAIL (new occlusion bug)**

Screenshots:
`screenshots/2026-07-30/qa-ui-favourite-collage.png` (full),
`screenshots/2026-07-30/qa-ui-favourite-collage-occlusion-crop.png` (crop)

Toggled the Favourite screen to collage view (`favourite-view-toggle`).
The blazer's "Macgie" pill renders correctly, fully visible. The
loafers underneath — seeded near the bottom edge of the collage
canvas — has its "Macgie" pill **clipped**: only the rounded top ~15px
of the pill is visible, the label text is cut off entirely.

Root cause: `FavouriteOutfitCard.tsx`'s `collageSurface` style sets
`overflow: 'hidden'` (`FavouriteOutfitCard.tsx:369`), intentionally, so
that hand-placed garment art that bleeds past the canvas edge is
clipped (existing, pre-AU-392 behavior, matches Figma section
`2850:13589`). The AU-392 badge is anchored `bottom: 8` **within the
item's own absolutely-positioned box** (`TileStatusBadge.tsx:22-28`), so
when an item's seeded position places it near/at the surface's bottom
edge, the badge inherits the same clip — but unlike a garment silhouette
bleeding off-canvas (visually fine), a badge that's half-cut is
illegible and reads as broken.

**Severity: HIGH.** This is a real, reproducible visual defect on a
surface AU-392 explicitly extended coverage to (D1: "the status badge
now renders here too — reversing the earlier omission").
**Route to mobile-dev:** either (a) keep the badge inside the visible
canvas bounds regardless of the item's seeded y-position (clamp the
badge's own absolute position to the surface bounds, not the item box),
or (b) exclude badges from the intentional-bleed clip via a dedicated
overlay layer that isn't inside the `overflow:hidden` boundary. Do not
just move the affected item — any future seed near the bottom edge will
repeat this.

### 5. Home collage-play canvas — PASS

Screenshot: `screenshots/2026-07-30/qa-ui-home-collage-play.png`

Same outfit as the Home grid, toggled to collage view
(`HomeHeader`'s `HomeViewTogglePill`, top-right). Trousers' "Macgie"
badge renders fully, correctly positioned, not occluded by the
overlapping dress/heels in this particular layout. Pixel-identical
pill styling to grid/Home/Favourite. Drag-interaction non-interference
**not empirically tested** (no swipe/drag tool available in the
qa-ui read-only tier) — confirmed at code level only:
`OutfitCanvasSurface.tsx:419-426` wraps the badge in
`<View pointerEvents="none">`, so a drag/pinch/tap gesture cannot be
captured by the badge overlay. This matches the explicit R3/phase-05
comment in the code.

### 6. Remix editor (Outfit Canvas) — **FAIL (badge gap on added items)**

Screenshot: `screenshots/2026-07-30/qa-ui-remix-canvas-missing-badge.png`

Opened Outfit Canvas from the drawer (fresh/blank canvas — not entered
via "Remix" from an existing outfit, so no initial seeded items).
Used the in-editor "+" (`canvas-tool-add`) → "Add to Canvas" picker to
add the same trousers item that shows "Macgie" on every other surface.
**No badge rendered on the canvas item.**

Root cause (confirmed by code read): `OutfitCanvasSurface` **is**
configured with `showStatusBadge` on the Remix editor
(`OutfitCanvasScreen.tsx:501`, explicitly commented "AU-392 D1: status
badge is in scope for the Remix editor too"). But the in-editor
add-item flow (`src/screens/canvas/useCanvasAddItems.ts`,
`handlePickerConfirm`, lines 67-82 building `prepared`, and lines
109-113 building `newSeeds`) never calls `resolveTileStatus` on the
picked `WardrobeItem` — the `status` field is simply never set on
newly-added `CanvasItemData`, so `DraggableItem`'s
`showStatusBadge && item.status` guard is always false for these items.

This is distinct from `collage-seed-layout.ts:634`'s `seedFromOutfit`
(used for the Home collage-play initial seed) and
`OutfitCanvasScreen.tsx:94`'s initial-items mapping (used when Remix is
entered from an existing outfit) — both of those DO call
`resolveTileStatus`. Only the **"+"-add-mid-session** path is missing
it.

**Severity: HIGH.** Reproduced live, 100% repro (any item added via the
in-editor picker loses its badge regardless of its real status).
**Route to mobile-dev:** in `useCanvasAddItems.ts`, add
`status: resolveTileStatus(item)` to the `newSeeds` mapping (the `item`
there is the full `WardrobeItem` from the picker — it structurally
satisfies `TileStatusInput`, no cast required, matching the existing
convention in `tile-status.ts`'s doc comment). No test currently covers
`useCanvasAddItems` — flag for a regression test alongside the fix.

## Manual verification scenarios (phase-06 §"Manual verification scenarios")

| # | Scenario | Result |
|---|---|---|
| 1 | CEO's literal example (1 seen + 2 catalog → 0 + 2 Macgie) | Confirmed via unit test (`garment-preview.render.test.tsx`, exact scenario name) + observed analogous mixed-badge outfit live on Home/Favourite (different data, same conditional behavior) |
| 2 | Precedence (demote → less_use wins over common) | Confirmed via unit test only (`tile-status.test.ts`, `FavouriteOutfitCard.render.test.tsx`) — could not demote a live item on sim (no Item Detail "less use" toggle exercised in this pass; out of scope for a read-only screenshot sweep) |
| 3 | "New" badge + reviewed-state clear across all 3 surfaces | Confirmed via unit test only (`garment-preview.render.test.tsx`'s "is_new" case + `FavouriteOutfitCard.render.test.tsx`'s parity case). Not triggered live — would require uploading a fresh item and not opening its detail, then checking 3 screens before/after — out of scope for this pass, flag for `qa-mobile` full exploratory tier |
| 4 | Cross-surface identity (pixel/text/radius/label identical) | **PASS**, confirmed live — Home tile, Favourite grid tile, Home collage all show byte-identical pill treatment (same component, same tokens: `figmaCardTag` fill, `white` text, `borderRadius: 9999`, `bottom: 8`) |
| 5 | Graceful degradation (pre-phase-03 backend → all "Macgie") | Confirmed via unit test only (`garment-preview.render.test.tsx` "fields-absent" case) — not tested against a real degraded backend in this pass |

## Summary

| Surface | Result |
|---|---|
| Home outfit grid tile | PASS |
| Favourite outfit card grid | PASS |
| Wardrobe grid (baseline) | PASS (visually unconfirmed for badge-bearing states — no swipe tool / no matching seed data on the visible page; high confidence via shared resolver + its unit tests) |
| Favourite collage view | **FAIL — badge clipped when item bleeds to the canvas edge** |
| Home collage-play canvas | PASS (drag-safety confirmed at code level, not empirically drag-tested) |
| Remix editor canvas | **FAIL — badge missing on items added via the in-editor "+" picker** |
| Cross-surface pixel identity | PASS |
| "Your Piece" + status pill coexistence | PASS at code level, not empirically triggered |

**2 HIGH findings, both routed to mobile-dev, both root-caused with a
concrete fix location.** Neither is a regression of the ORIGINAL bug
(unconditional "Macgie") — the core fix holds everywhere it was
verified. Both are edge-case gaps in the AU-392 rollout's newer
surfaces (collage occlusion, editor add-item flow) that should block
the phase-06 designer gate until fixed, since they're visually broken
states on surfaces AU-392 explicitly claims to cover.

## Tool limitations encountered (for the record)

- qa-ui's mobile-mcp grant is read-only screenshot tier (per
  `CLAUDE.md`'s tool-grant table) — no swipe/scroll, no drag gesture, no
  text input. Several manual-verification scenarios (precedence via
  Item Detail demotion, "new" badge clearing via Item Detail open, degraded-
  backend check) require either a fuller tool tier or `qa-mobile`'s
  exploratory grant. Flagging rather than skipping silently.
- `mobile-mcp list_elements_on_screen` did not expose several custom
  touchables (wardrobe grid tiles, the grid/collage `MFloatingPill`
  toggle, canvas toolbar icons) — worked around via pixel-cropped
  screenshots + coordinate math, but this is itself a testability gap
  worth a note to `mobile-dev`: these interactive elements may be
  missing `accessible`/`accessibilityRole` props that would otherwise
  surface them to the accessibility tree (relevant to `qa-ux`, not
  actioned here — out of scope for this task).
