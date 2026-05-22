# Home Collage View — Spec & Implementation Plan

**Date**: 2026-05-22
**Branch**: `fix/ios-archive-sentry-pbxproj` (auxi submodule)
**Status**: SPEC ONLY — not for build yet (per CEO decision 2026-05-22)
**Figma**: https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2850-13589&m=dev
**Templates section**: https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2852-23091&m=dev

---

## What is Collage View

A **VIEW MODE** alternative to Grid View (already shipped) for displaying recommended outfits on Home. Same backend data (Outfit + Items), different presentation.

| | Grid View (existing) | Collage View (new) |
|---|---|---|
| Composition | Cards in 2×2/hero+stack flex layout | Items absolute-positioned, overlapping flat-lay |
| Per-item chrome | Card border radius 12, pin badge 34×34, "common" label | None — items render directly on white bg |
| Image type | Original (may have background) | **REQUIRES transparent background** (BG removal) |
| Layout source | Item count → flex layout | Template selector → 10 named templates (`9, 4-1, 10, 11, 12, 13, 5-1, 6-1, 7-1, 14`) |
| Toggle UI | Footer pill (left icon active) | Footer pill (right icon active) |

The footer pill switch already appears in Grid View Figma frames (`mynaui:grid` icons, h-98 backdrop-blur footer) — confirmed in earlier audit. Toggling it would swap the content area.

---

## Files in this plan

- `00-index.md` (this file) — overview, dependencies, phases
- `01-spec.md` — 4 Home Collage frames + 10 layout templates (rect data)

---

## Dependencies (BLOCKERS)

### BE — Background removal
**Critical**: Items in Wardrobe currently store original photos. Collage View needs **transparent-background PNGs** to layer cleanly. Without BG removal, layered items show their photo backgrounds and the collage looks broken.

Options:
1. **Server-side BG removal pipeline** — on item upload, run RMBG/U2Net/SAM and persist transparent variant alongside original. Adds compute cost + storage. Recommended.
2. **On-demand client BG removal** — RN can call a service per render. Latency + cost per view. Not recommended.
3. **Mark items "collage-ready"** — only render Collage View when all outfit items have transparent variants. Show "Grid only" message otherwise. Partial fallback.

→ **backend-dev decision needed** before any FE work starts.

### FE — Layout engine
- New positioned-layout component (absolute children) — current Home uses flex, no overlap support.
- Template registry: 10 named templates, each is a list of `{x, y, width, height}` rects (see `01-spec.md`).
- Template selector: given `items.length` and outfit metadata, pick the right template. Heuristics needed (see Open Q #2).
- Image scaling: source images vary in dimensions; need to fit each into its rect while preserving aspect — likely `resizeMode="contain"` with item-specific overrides.

### Design — Item→position mapping
- Templates have positioning rects but NOT category mapping. Designer must specify: in template `11` (5 items), which rect = top, which = bottom, which = accessory.
- Some templates use placeholder names like `SYS_AC_BAG_BLK_SHO_01` suggesting BLACK SHOES go in that slot — implies category-aware positioning. Confirm with designer.

### View toggle (small)
- New state: `viewMode: 'grid' | 'collage'` in HomeScreen.
- Persist across sessions (AsyncStorage).
- Footer pill UI already in Figma spec (h-98, backdrop-blur 3.25, 2 icons in 158px pill).
- Default value: TBD with PM (Grid for now until BG removal lands?).

---

## Implementation phases (when unblocked)

### Phase 0 — Prereqs (NOT THIS REPO)
1. **wardrobe-backend**: add BG-removal pipeline on item upload. New column `image_url_transparent`. Backfill existing items (job).
2. **Designer**: confirm category→slot mapping per template, confirm fallback when item count doesn't match any template.

### Phase 1 — View toggle scaffold (`auxi/`)
- Add `viewMode` state to HomeScreen + AsyncStorage persistence.
- Add footer pill UI per Figma (h-98, 2 icons, active-state ring).
- Default to Grid; collage tab disabled with tooltip until backend ready.
- testIDs: `home-view-toggle-grid`, `home-view-toggle-collage`.

### Phase 2 — Layout engine
- New component `components/features/home/CollageGrid.tsx` (~150 LOC).
- Template registry: hardcode 10 templates from `01-spec.md` as `Record<TemplateName, ItemRect[]>`.
- `pickCollageTemplate(items)` selector — initial heuristic: match by `items.length`, prefer non-`-1` variants. Iterate with designer.
- Image renderer: absolute-positioned `<Image>` per rect, `resizeMode="contain"` on transparent variant URL.
- Sheet height: 509.3 px at Figma 382 width → scale to actual screen width preserving aspect 0.75.

### Phase 3 — Integration + polish
- Wire `viewMode` → render Grid vs Collage in `OptionSheet` body.
- "Wear this" + subtitle chip + pagination counter remain (shared chrome).
- Fallback: when no template matches `items.length`, fall back to Grid + log telemetry.
- Maestro flow: test toggle persistence + per-mode render.

### Phase 4 — Designer validation
- Sim screenshot pass with real transparent-bg images.
- Iterate template rect tweaks based on visual match.

**Estimate**: Phase 0 = unknown (BE owned). Phases 1–4 = ~5–8 days FE assuming designer iterations.

---

## Open questions

1. **Default view mode** — Grid (safe) or Collage (showcase) once BG removal ships?
2. **Template selection rule** — match by count alone, or by item categories too? E.g. "11" templates are 5-item; "5-1" is also 5-item. Which to pick?
3. **Fallback for unsupported counts** — current code handles 1, 2, 9+ items. Templates only cover 3–8. Fall back to Grid, hide toggle, or new template?
4. **Pinned item** — does pin affect collage placement? Grid View splices pin into pos 0; Collage might need hero-slot instead.
5. **Animation** — toggle Grid↔Collage with crossfade or hard swap?
6. **Per-item interactions** — Grid has long-press for ItemDetailSheet + pin tap. Does Collage retain these (touchables over absolute items)? testID strategy if yes.
7. **BG removal quality** — what threshold of edge artifacts is acceptable? Need designer pass on sample items.
8. **Performance** — 8 stacked `<Image>` per sheet × N sheets × prefetch lookahead = potentially 50+ image loads. Memory budget on iPhone 16?

---

## Out of scope

- Wardrobe screen Collage rendering (only Home).
- Item detail Collage view.
- Animated transitions inside a collage.
- User-editable collage (that's `OutfitCanvasScreen` — different feature).

---

## Next step

PM / tech-lead to decide:
- Is BG removal funded for backend? Without it, Phases 1–4 are wasted.
- If yes: kick off Phase 0 in `wardrobe-backend/` + designer category-mapping session.
- If no: archive this plan, defer Collage indefinitely.
