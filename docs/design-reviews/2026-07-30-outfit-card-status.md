# Design Review — AU-392 4-State Card Status Badge

**Date:** 2026-07-30
**Gate:** step 6.5 (designer, hard gate) — after qa-ui Compare PASS, before qa-mobile smoke / PR
**Device:** iPhone 17 Pro simulator, iOS 26.5, `com.auxi2026.app`, real backend `:5001`
**Scope:** `TileStatusBadge.tsx` + `resolveTileStatus()` rendered across all 6 outfit-item
surfaces: Wardrobe grid, Home outfit grid, Home collage-play canvas, Favourite outfit
grid, Favourite collage, Remix editor (Outfit Canvas).
**Inputs read:** qa-ui consistency sweep (`docs/qa-findings/2026-07-30-au-392-outfit-card-status-sweep.md`),
qa-mobile fix-verify (`plans/reports/qa-mobile-260730-1226-au-392-smoke-and-fix-verify.md`),
plan decision log (D1/D2/D3, `plans/260730-1226-au-392-outfit-card-status/plan.md`).
**Pre-flight:** `./scripts/mcp-doctor.sh` exit 0. `./scripts/auxi-lint-tokens.sh` — 13
pre-existing violations, none in AU-392's changed files (clean for this ticket's scope).

## Method

Live sim walk (mobile-mcp read-only screenshot tier) across all 6 surfaces + code
read of every consumer (`GarmentPreview.tsx`, `FavouriteOutfitCard.tsx`
`Tile`/`CollageView`, `OutfitCanvasSurface.tsx` `DraggableItem`, `OutfitCanvasScreen.tsx`,
`useCanvasAddItems.ts`, `WardrobeGridTile.tsx`) plus `theme.ts` token trace for every
color the badge/component consumes. This pass does not re-run qa-ui's pixel-diff or
qa-mobile's functional regression — it judges product-experience craft on top of
their already-PASSed technical fixes, per the gate's mandate.

---

## Lens 1 — Design-system compliance — PASS

`TileStatusBadge.tsx` and `tile-status.ts` are clean: no raw hex, no raw `fontFamily`,
no raw `zIndex`. All colors trace to existing `theme.colors.*` aliases:
`figmaCardTag` (common), `figmaSnackbarSuccessBg` (new), `figmaTileLessUsedBadgeBg` +
`figmaItemDetailDanger` (less_use) — all pre-existing tokens, reused, not invented.
Typography uses `theme.typography.aliases.interCaptionXxs` throughout. Radius uses
`borderRadius: 9999` (round pill) consistent with other pill components in the same
files (`beautifyBadge`, `moodPill`). `collageBadgeAnchor`/`node.zIndex` reuse the
item's own passed-through z-index rather than a hardcoded literal.
`./scripts/auxi-lint-tokens.sh` shows 13 violations app-wide, **zero in AU-392's
changed files**.

## Lens 2 — Motion & interaction — **MAJOR finding (new)**

See Finding 1 below. The badge itself has no open/close transition (correctly — it's
a data-driven decoration, not a sheet/reveal, so no motion token is expected here).
The issue found is compositional: the badge shares a transform with the Remix
editor's pinch-zoom.

## Lens 3 — Visual hierarchy — **MAJOR finding (new)**

See Finding 2 below (Favourite collage — badge/garment ownership ambiguity).
Elsewhere hierarchy is solid: the badge is small, low-contrast-but-legible, sits
below the primary garment image and never competes with the "Wear this" CTA, the
mood pill, or the pin/favorite controls (opposite corners, D2 confirmed safe by
geometry in every surface reviewed).

## Lens 4 — Color & emphasis — PASS

Semantic mapping is sound and consistent with precedent: `new` → mint/success bg +
dark ink text (reuses success/200, matches the "fresh" connotation); `less_use` →
soft coral bg + danger-red text (explicitly reuses the existing Item Detail "Less
used" affordance color per the code comment at `TileStatusBadge.tsx:53-61` — not a
new invention); `common` → the existing dark `figmaCardTag` chip, unchanged. No
`red`/`#ff0000` off-system color. No contrast concerns beyond what's already shipped
elsewhere (dark-fill-white-text and coral-fill-danger-text pills are established
patterns in this app, not new pairings introduced by this ticket).

## Lens 5 — Component state coverage — PASS

4 states (`new` / `less_use` / `common` / none) are exhaustive per `resolveTileStatus`'s
precedence and covered by dedicated unit tests (`tile-status.test.ts`). The badge is
non-interactive (no pressed/disabled state needed — it's not a control). Graceful
degradation (pre-phase-03 backend, fields absent → falls back to "common" render)
is unit-tested; not concerning at this gate.

## Lens 6 — Cross-screen consistency — PASS (with the Lens 3 caveat above)

All 6 surfaces render the literal same `TileStatusBadge` component — confirmed via
code read, matching qa-ui's finding. Pixel/label/radius/fill are identical
side-by-side (Home tile vs Favourite tile vs Home collage — visually confirmed live,
screenshots below). The one place this breaks down is the collage anchor geometry
(Finding 2) — not a different component, but the same component anchored against a
frame whose relationship to the visible garment art varies per item, which is what
produces the inconsistency in how "connected" the badge reads.

## Lens 7 — Native feel — **Related to Finding 1**

Everywhere except the Remix editor's pinch-zoom, the badge feels native: it's a
static, crisp, constant-size overlay, `pointerEvents="none"` so it never fights a
drag/tap/pinch gesture (confirmed at code level for all 3 canvas consumers). The one
native-feel risk is the pinch-scaling side effect in Finding 1 — a raster-scaled
label is a "not quite native" tell (real iOS apps keep annotation/badge chrome at a
constant screen size when the user zooms content).

## Lens 8 — Recommendation experience — Directly relevant to Finding 2

Where the badge is anchored cleanly (Home grid, Favourite grid, Home collage,
Remix editor initial-seed) it reads exactly as intended: an unobtrusive, trustworthy
provenance marker that doesn't compete with the outfit recommendation itself. The
Favourite collage blazer case (Finding 2) is the one place this slips — a badge
floating in dead space between two garments reads as a rendering artifact rather
than curated craft, which is the opposite of what Lens 8 is protecting.

## Journey continuity — PASS

On every surface reviewed, a user can answer "where was I / where am I / what do I
do next" without the badge interfering — it's decorative provenance info, not a
navigational or action element, and its consistent bottom-centre position across
screens (Home ↔ Favourite ↔ Wardrobe ↔ Remix) reinforces rather than breaks
continuity (Lens 6 payoff).

---

## Finding 1 — Status badge scales (and can blur/oversize) under Remix-editor pinch-zoom

**Severity**: MAJOR
**Lens**: 2 motion & interaction / 7 native feel
**Rule doc**: motion-rules.md (interaction lifecycle) — no direct token violation,
this is an experiential/compositional gap
**Screen**: Remix editor (Outfit Canvas)
**Build**: main, AU-392 branch state as of 2026-07-30

### What's off

In `OutfitCanvasSurface.tsx`, `DraggableItem.renderItem()` renders the item's
`<Image>` **and** its `<TileStatusBadge>` as siblings inside the *same*
`Animated.View` that receives the pinch-zoom `scale` transform:

```
<Animated.View style={[styles.draggableItem, { ..., transform: [...,
  { scale: enablePinchZoom ? Animated.multiply(scale, lift...) : lift... } ] }]}>
  <View pointerEvents="none"><Image .../></View>
  {showStatusBadge && item.status ? (
    <View pointerEvents="none"><TileStatusBadge status={item.status} itemId={item.id} /></View>
  ) : null}
  <View ... {...panResponder.panHandlers} />
</Animated.View>
```

`OutfitCanvasScreen.tsx:498` passes `enablePinchZoom` **and** `showStatusBadge` to
the same `OutfitCanvasSurface` — the Remix editor is the one surface where both are
true simultaneously (Home collage-play's `CollageSheetCanvas.tsx` sets
`showStatusBadge` but never `enablePinchZoom`, so it isn't affected). The pinch
gesture clamps scale to `[0.5, 3]` (`OutfitCanvasSurface.tsx:234,239`). Because the
badge is inside the scaled subtree, pinching an item small shrinks the "Macgie"/
"New"/"less use" pill and its 10px caption text down to ~half size (readability
risk approaching the floor), and pinching an item large blows the pill up to ~3x —
raster-scaled text, not a re-rendered larger font, so it also looks soft/blurry at
the upper end. This is a "not quite native" tell: real annotation/badge chrome in a
pro editing surface (the closest UX analogue: pin/label overlays in a
photo/design tool) stays a constant on-screen size regardless of content zoom.

Not caught by qa-ui (pixel-diff, no gesture tool in their tier) or qa-mobile
(exploratory tier has swipe/tap but the fix-verify pass didn't specifically pinch
an item bearing a badge) — found here via code read + confirming the prop wiring,
since the `designer` role doesn't have a pinch-gesture tool either. Recommend
`qa-mobile` empirically re-verify the badge at both scale extremes once fixed.

### Evidence

- Source: `auxi/src/components/features/OutfitCanvasSurface.tsx:370-426` (badge
  inside the scaled `Animated.View`), `:228-243` (pinch scale, clamp `[0.5,3]`)
- Source: `auxi/src/screens/OutfitCanvasScreen.tsx:486-502` (`enablePinchZoom` +
  `showStatusBadge` both true — the only surface with this combination)
- Source (contrast — unaffected): `auxi/src/components/features/CollageSheetCanvas.tsx:89`
  sets `showStatusBadge` only, no `enablePinchZoom`
- Screenshot: `auxi/docs/design-reviews/screenshots/2026-07-30/designer-remix-editor.png`
  (badge correct at default/1x scale — the gap only manifests once a user pinches;
  not capturable with the screenshot-only tool tier, hence the code-level finding)

### Routing

- **mobile-dev**: keep the badge's on-screen size constant across pinch zoom —
  either counter-scale it (divide the badge's own transform by the live `scale`
  value so text always renders at 1x), or extract it from the scaled subtree
  entirely and position it as an absolutely-positioned sibling overlay computed
  from the item's live animated position/size (mirroring the
  `clampBadgeAnchorTop` pattern already used in `FavouriteOutfitCard.tsx` for the
  collage-clip fix — same idea, different axis).
- **qa-mobile**: re-verify empirically (pinch an item bearing a badge to both
  scale extremes) once the fix lands — outside this gate's tool tier.

---

## Finding 2 — Favourite collage: badge floats disconnected from its garment when the item's frame has empty margin below the visible art

**Severity**: MAJOR
**Lens**: 3 visual hierarchy / 8 recommendation experience
**Rule doc**: n/a (experiential lens — no direct token/motion rule; judged against
the lens question: is grouping/ownership clear? does it read as curated?)
**Screen**: Favourite → collage view
**Build**: main, AU-392 branch state as of 2026-07-30 (post qa-ui/mobile-dev clip fix)

### What's off

qa-ui's original HIGH finding (badge clipped at the canvas edge) is confirmed
**fixed** — re-verified live, no clipping on either saved outfit card, matching
qa-mobile's regression-verify. But the fix (`clampBadgeAnchorTop`, anchoring the
badge to a dedicated overlay layer keyed off the item's **frame** bounds, not its
rendered pixel silhouette) surfaces a different, subtler craft gap: for an item
whose collage frame extends well below its visible garment art (the blazer in the
"blazer + loafers" card — a portrait flat-lay `resizeMode="contain"` inside a frame
sized by the generic collage-layout formula, not the image's real aspect ratio),
the badge now renders in the **empty space between the blazer and the loafers**
below it — not touching the jacket hem, not touching the loafers either. A user
looking at this card cannot immediately tell which garment the top "Macgie" pill
describes; it reads as a rendering artifact floating in dead space rather than a
deliberate label. Contrast this with the same badge on the trousers in the Home
collage-play canvas (screenshot below) where the frame-to-art ratio is tighter and
the badge sits right at the visible hem — same code, materially different
readability depending on the item's own frame geometry. This is the concrete
manifestation of the D3 risk the ticket called out ("judge whether this DRY/reuse
choice reads as visually correct... on surfaces it was never designed for") — the
badge widget itself is fine; the anchor-to-frame (vs anchor-to-rendered-art) logic
is what needs another pass specifically for collage/canvas surfaces where
`resizeMode="contain"` can letterbox the image inside its frame.

Two badges stacked ~100pt apart with no connecting line/leader and no per-item
grouping cue compounds the ambiguity — the pair could be misread as "this whole
region is Macgie" rather than two independent per-garment tags.

### Evidence

- Screenshot: `auxi/docs/design-reviews/screenshots/2026-07-30/designer-favourite-collage.png`
  — blazer's "Macgie" pill sits ~100pt below the visible jacket hem, well above the
  loafers' own separate "Macgie" pill
- Contrast screenshot: `auxi/docs/design-reviews/screenshots/2026-07-30/designer-home-collage-play.png`
  — trousers' "Macgie" pill sits tight against the visible pant hem, reads cleanly
  connected (same component, tighter frame-to-art ratio)
- Source: `auxi/src/screens/favourite/FavouriteOutfitCard.tsx:71-85`
  (`clampBadgeAnchorTop`, frame-relative, not art-relative) and `:228-252`
  (`collageBadgeAnchor` overlay layer)
- Source: `auxi/src/components/features/collage-seed-layout.ts` (`CATEGORY_ANCHORS`,
  `contentBox`) — frame sizing is anchor/category-driven, not derived from the
  actual image's rendered (contain-fit) bounds, which is the root cause

### Routing

- **mobile-dev**: for collage/canvas surfaces specifically, anchor the badge to the
  item's **visually rendered** bottom edge (accounting for `resizeMode="contain"`
  letterboxing within the frame) rather than the frame's geometric bottom, OR — a
  cheaper fix — clamp the badge to sit no farther than a fixed max-gap (e.g. 1
  badge-height) below the frame's *visual content*, falling back toward the frame
  bottom only when the two coincide. Either approach keeps Finding 2's fix
  independent of Finding 1.
- **CEO** (if mobile-dev's fix doesn't fully resolve it): if perfect art-relative
  anchoring proves disproportionately expensive for the collage engine, this may
  come down to a product call on whether "badge in the general vicinity of the
  garment" is an acceptable trade — flag back to `designer` for a second pass
  rather than shipping either extreme unilaterally.

---

## Summary

| Surface | Cross-surface identity | New craft finding |
|---|---|---|
| Wardrobe grid | PASS (reference) | — |
| Home outfit grid | PASS | — |
| Home collage-play | PASS | — |
| Favourite outfit grid | PASS | — |
| Favourite collage | PASS (clip bug confirmed fixed) | **Finding 2 (MAJOR)** |
| Remix editor (initial items) | PASS | — |
| Remix editor (pinch-zoom composition) | n/a | **Finding 1 (MAJOR)** |

**2 open MAJOR findings, both new (not previously flagged by qa-ui/qa-mobile), both
routed to mobile-dev with concrete fix directions.** Neither is a design-system
token/component violation (Lens 1/4/6 mechanical checks are clean) — both are
experiential craft gaps the pixel-diff and functional-smoke gates structurally
can't catch, which is exactly this gate's job.

## VERDICT: FAIL

Per the severity ladder, any open MAJOR blocks the PR. Both findings are
independently fixable and scoped narrowly (one file/prop each) — re-run Lens 2/3/7/8
on the Favourite collage and Remix editor surfaces once mobile-dev lands the fixes;
the other 4 surfaces do not need re-review.

## Screenshots captured this pass

- `screenshots/2026-07-30/designer-home-outfit-grid.png`
- `screenshots/2026-07-30/designer-wardrobe-grid.png`
- `screenshots/2026-07-30/designer-home-collage-play.png`
- `screenshots/2026-07-30/designer-favourite-grid.png`
- `screenshots/2026-07-30/designer-favourite-collage.png`
- `screenshots/2026-07-30/designer-remix-editor.png`

---

## RE-REVIEW — 2026-07-30 (post mobile-dev fix)

**Trigger:** mobile-dev fix report
`plans/reports/mobile-dev-260730-1226-au-392-designer-fail-fixes.md`, addressing
both open MAJOR findings above.
**Method:** targeted re-check only (per dispatch — not a full 8-lens re-sweep):
code read of both diffs, live sim walk of the same 2 flagged surfaces
(Favourite → collage view; Remix editor / Outfit Canvas), `npx jest` on the
2 new/extended test files, `npx tsc --noEmit` scoped to the touched files.
Cross-screen consistency spot-check (Lens 6) on the same 2 surfaces since a
fix that's local to one surface can regress how it matches its siblings.
**Pre-flight:** `./scripts/mcp-doctor.sh` exit 0 (sim booted, WDA up, stack
already running per dispatch — backend `:5001`, Metro `:8081`).

### Finding 1 re-check — Remix editor badge scaling with pinch-zoom — **RESOLVED**

Code (`OutfitCanvasSurface.tsx:419-437`): the badge is now its own
`Animated.View` sibling, wrapped with `transform: [{ scale: Animated.divide(1,
scale) }]`. Because this wrapper sits *inside* the parent `Animated.View` whose
own transform is `Animated.multiply(scale, liftInterp)` when
`enablePinchZoom` is true, the transforms compose multiplicatively down the
tree: net on-screen scale of the badge = `scale × liftInterp × (1/scale)` =
`liftInterp` — i.e. the pinch `scale` term cancels out exactly, leaving only
the shared ~1.06x "lifted" drag bump every draggable item gets (correctly left
uncountered, per the fix's own comment — that's shared chrome, not a zoom
level). This is the right approach and the math is exact, not approximate.

Confirmed via the new test file
(`OutfitCanvasSurface.badge-scale.test.tsx`, 4 cases: 1x / 2x / 0.5x floor /
3x ceiling) — ran it directly: **4/4 pass**, asserting the badge's resolved
transform is exactly the inverse of the item's live `scale` at all 4 points
including both clamp extremes. `Animated.divide` has no divide-by-zero
exposure here since the pinch clamp floor is `0.5`, never `0`.

Tool-tier caveat (same as the original finding): this session's mobile-mcp
grant has no pinch-gesture tool, so I could not empirically pinch a live badge
on the simulator — same limitation the original Finding 1 noted. Verification
here is code-level (transform composition math) + the unit test's direct
assertion on the resolved `transform` value, which is a legitimate way to
close a MAJOR whose root cause was a compositional transform bug, not a
rendering-timing or gesture-recognition bug. Screenshot of the Remix editor at
rest (scale 1x, no pinch in progress) confirms the badge still renders
correctly with no regression to the un-pinched case (matches the original
`designer-remix-editor.png` framing).

**Recommend qa-mobile still do one empirical pinch pass** (their tool tier has
gesture support this gate's doesn't) before/alongside PR merge as a belt-and-
suspenders check — but this is not a condition for this gate's PASS; the fix
is correct at the code level and unit-tested at the exact boundary values the
finding called out.

**Verdict: RESOLVED.**

### Finding 2 re-check — Favourite collage badge floating in dead space — **RESOLVED**

Live sim walk, same blazer + loafers card originally flagged (Favourite →
collage view, "14 Jun" card, black blazer over tan loafers):

- **Before** (`screenshots/2026-07-30/designer-favourite-collage.png`): blazer's
  "Macgie" pill sits in the empty gap well below the jacket hem, closer to the
  loafers than to the blazer it labels.
- **After** (`screenshots/2026-07-30-rereview/designer-favourite-collage-after-fix.png`):
  same card, same items — the blazer's "Macgie" pill now sits directly against
  the jacket's visible hem, and the loafers' own pill sits directly at their
  visible bottom. The badge now reads unambiguously as "this label belongs to
  the blazer" — the floating-in-dead-space artifact is gone.

Code (`FavouriteOutfitCard.tsx:93-104`): `contentBottom()` now anchors to
`itemY + itemHeight × (1 + ITEM_HIT_AREA_RATIO) / 2` (i.e. the bottom of the
centered 72%-content-box already used for hit-testing) instead of the raw
frame bottom — pulling the badge up by 14% of the item's frame height
uniformly. This is exactly the "reuse the existing ratio, DRY" direction the
original finding suggested as the acceptable cheaper alternative to true
per-image `resizeMode="contain"` bounds math. `FavouriteOutfitCard.render.test.tsx`
new `describe` block (6 tests) passes, asserting the new anchor sits above the
old frame-relative one by the expected content-box gap and scales linearly
with item height.

Cross-screen consistency (Lens 6) sanity check: the fix is scoped to
`FavouriteOutfitCard.tsx`'s `clampBadgeAnchorTop`/`contentBottom`, which is
**not** shared with `CollageSheetCanvas.tsx` (Home collage-play) — confirmed
by code read, matching the original finding's own contrast note that Home
collage-play was never affected by this bug. No regression risk there and
none observed; the two collage surfaces still read as the same visual
language (rounded frame, same pill component, same anchoring principle now
that both are content-relative in spirit), which is what Lens 6 asks for. Did
not re-screenshot Home collage-play since it's provably out of this diff's
blast radius (single-file change, different call site).

One nuance carried forward, not a new blocker: the fix is a uniform 14%
heuristic shift, not true per-image art-bounds detection — for an item whose
actual transparent padding differs significantly from the 0.72 assumption,
the badge could still read slightly loose. Not observed on either saved
outfit checked live, and consistent with what the original finding accepted
as a reasonable trade-off ("cheaper fix... clamp to a fixed max-gap"). Not
reopening; noting for future awareness only if a wildly different aspect-ratio
garment surfaces this again.

**Verdict: RESOLVED.**

### Re-review summary

| Finding | Status | Evidence |
|---|---|---|
| Finding 1 (Remix editor pinch-zoom badge scale) | **RESOLVED** | Code (transform composition math checks out exactly) + 4/4 new unit tests pass + no regression at rest |
| Finding 2 (Favourite collage badge floating) | **RESOLVED** | Live sim screenshot before/after (badge now touches garment hem) + code read + 6/6 new/extended unit tests pass + no cross-screen regression |

Both MAJOR findings that blocked the gate are closed. No new BLOCKER/MAJOR
introduced by either fix (`npx tsc --noEmit` clean on both touched files;
`auxi-lint-tokens.sh` — from the original pre-flight — already clean for
AU-392's files and neither fix touches a token/color/motion literal).

## RE-REVIEW VERDICT: PASS

AU-392 is unblocked for PR at the step-6.5 gate. Routing: **qa-mobile** for
final smoke + the recommended empirical pinch-gesture spot-check (outside this
gate's tool tier); then **PR**.

## Screenshots captured this re-review pass

- `screenshots/2026-07-30-rereview/designer-favourite-collage-after-fix.png`
