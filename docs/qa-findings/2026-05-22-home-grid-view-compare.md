# Figma Compare: Home | Grid View (new section)

**Date:** 2026-05-22
**Figma file:** `0nXXMAR4Arf1ZfjtQvtBh0` (Auxi)
**Section node:** `2849:11340` — "Home | Grid View" (10 frames)
**Direct URL:** https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2849-11340&m=dev
**Source files:**
- `auxi/src/screens/HomeScreen.tsx`
- `auxi/src/components/primitives/FigmaPrimitives.tsx`
- `auxi/src/components/features/WeatherWidget.tsx`
- `auxi/src/theme/theme.ts`
**Auditor:** qa-ui (compare mode)
**Prior baseline:** `2026-05-13-figma-audit-home-screen.md` (vs node `1666:9723`)

---

## Pass status

| Pass | Status |
|---|---|
| 1. Figma extraction | **BLOCKED** — figma MCP read tools (`get_metadata`, `get_design_context`, `get_variable_defs`) not registered in this subagent's tool surface. Could not call them; could not call `use_figma` for read-only inspection either. See "Unresolved questions" #1. |
| 2. Code vs spec | Partial — inferred Figma intent from (a) frame names (b) prior baseline tokens (c) code references to Figma node IDs in comments |
| 3. Visual verification | SKIPPED (no iOS sim running, per user) |

This report flags **shape of the delta** the designer is publishing in this new section. A second pass with Figma MCP access is required to lock down exact tokens, paddings, and node-level coordinates before mobile-dev acts on anything labeled HIGH/MEDIUM here.

---

## What's in the new section (10 frames)

| Node | Frame name | Inferred purpose | Net new vs current code? |
|---|---|---|---|
| 2849:11960 | "Home for option 3/3" | Sheet 3 of 3 (pagination indicator state) | NEW behaviour — see Finding 1 |
| 2850:9125 | "Home 1/3" | Sheet 1 of 3 (pagination indicator state) | NEW behaviour — see Finding 1 |
| 2850:9250 | "Home 2/3" | Sheet 2 of 3 (pagination indicator state) | NEW behaviour — see Finding 1 |
| 2852:20899 | "Home 1/3" | Variant of 1/3 (likely different mode / inner content state) | Confirm intent |
| 2850:9508 | "outfit with 6 items" | Grid layout for 6-item outfit | NEW shape — see Finding 2 |
| 2850:9542 | "outfit with >6 items" | Grid layout when items > 6 (likely scrollable / overflow handling) | NEW shape — see Finding 2 |
| 2850:9580 | "outfit with 5 items" | Grid layout for 5-item outfit | NEW shape — see Finding 2 |
| 2850:9613 | "outfit with 3 items" | Grid layout for 3-item outfit | Partial — current code handles 3 items via H2 fix (placeholderCard) but layout may not match |
| 2850:11913 | "note" | Designer annotation (sticky) | n/a — read for designer intent |
| 2850:12005 | "note" | Designer annotation (sticky) | n/a — read for designer intent |

---

## Per-frame deltas

### Frame group A — "Home 1/3 · 2/3 · 3/3" (sheet pagination indicator)

**Figma shows (inferred):**
A pagination affordance somewhere on screen reading "1/3", "2/3", "3/3" reflecting which outfit-sheet the user is currently viewing in the snap-paged stack.

**What code does:**
No pagination indicator. Snap-paged `ScrollView` over `optionSets` exists with `activeSheetIndex` state — could be wired to render a "(activeSheetIndex+1)/(optionSets.length)" badge but nothing renders it today.

**Delta:** **NEW UI element — missing.**
- No `<Text>` like "1/3" anywhere in HomeScreen.tsx
- `activeSheetIndex` is held in state but never displayed
- Position: likely header band (next to weather widget) or near the action cluster — Figma extraction required to lock down

**testID gap:** new `home-sheet-counter` element would need `testID="home-sheet-counter"` for Maestro to assert pagination state during swipe flows.

---

### Frame group B — "outfit with 3 / 5 / 6 / >6 items" (variable item count grids)

**Figma shows (inferred):**
The designer is now spec'ing **distinct grid layouts per item count**. Possibilities:
- 3 items → 2-col, 2-row with one transparent placeholder (matches current code's H2 fix)
- 5 items → 2-col with 3 rows (one row half-filled) OR 3-col with 2 rows (one slot transparent)
- 6 items → 2-col × 3 rows, or 3-col × 2 rows
- \>6 items → overflow handling: scroll within tile? "+N more" badge? Truncate?

**What code does:**
- Backend request: `count: 3` outfits per fetch (`HomeScreen.tsx:404`)
- Per outfit: tiles = `items.length` (`buildGrid`, line 116)
- Layout: hard 2-column rows via `for (i+=2)` loop (line 1018-1025); last odd row pads with transparent `placeholderCard`
- Tile size: `CARD_WIDTH = (screenWidth - 32 - 4) / 2` and `CARD_HEIGHT` derived to fit **exactly 2 rows** inside `OPTION_SHEET_HEIGHT - OPTION_ACTIONS_HEIGHT - GRID_GAP` (line 92-94)
- `gridScroll` is a nested `ScrollView` (line 1029) — would scroll if rows overflow, but tile height is sized so only 2 rows fit comfortably

**Delta:** **NEW shapes — current grid system is hardcoded to ~2 rows × 2 cols.**
- 5 items: with 2-col layout = 3 rows = `(items.length/2)*CARD_HEIGHT` exceeds `OPTION_SHEET_HEIGHT - OPTION_ACTIONS_HEIGHT - GRID_GAP`. The nested `gridScroll` would activate vertical scroll inside the snap-paged outer scroll — exactly the bug the 2026-05-18 fix was avoiding (see line 86-94 comment block).
- 6 items: same issue — 3 rows in a viewport sized for 2.
- \>6 items: completely unspec'd in code.
- Tile *width* still computed for 2 columns regardless of count.

**Behavioural change:** Backend item-count varies per outfit now? Today, V05 returns whatever the recommender slots emit — `Item[]` length is not capped at 4 anywhere in `v05Api.ts`. So the variable counts may already be hitting from BE but the UI is silently clipping / scrolling. Need to verify against a live sim.

---

### Frame B1 — "outfit with 3 items"

**Figma shows (inferred):** balanced 3-tile layout.

**What code does:** 2-col, 2-row, last cell transparent (`placeholderCard`, line 1097). The H2 fix on 2026-05-05 deliberately made this "balanced".

**Delta:** Likely close to spec but **needs visual confirmation** — could be the designer wants:
- 1 large tile + 2 stacked half-height tiles (asymmetric)
- 3 equal tiles in a single row (3-col)
- 2 on top + 1 centered below

Code only supports the third option (with transparent slot).

---

### Frame B2 — "outfit with 5 items"

**Delta:**
- 5 items in current 2-col layout = 3 rows (last row has 1 item + 1 transparent placeholder)
- `CARD_HEIGHT` math (line 92) sizes tiles for **2 rows**, so 3 rows overflows and `gridScroll` becomes scrollable
- Designer almost certainly does NOT intend an internal scroll inside an outfit sheet on iPhone — needs a different grid shape (e.g. 5 = 2-2-1 with smaller tiles, or 2-3 with mixed column widths)

**Severity if confirmed:** **HIGH** — current code would render 5-item outfits with hidden content behind the action cluster on smaller phones.

---

### Frame B3 — "outfit with 6 items"

**Delta:**
- 6 items → 3 rows × 2 cols → same overflow problem as 5 items
- Designer may want 2 rows × 3 cols (smaller tiles) OR a different grid template
- Current `CARD_WIDTH` hardcoded to 2 columns — does not adapt to count

**Severity if confirmed:** **HIGH** — same as B2.

---

### Frame B4 — "outfit with >6 items"

**Delta:**
- Completely unspec'd in code
- Likely shows: scrollable grid? "+N" overflow badge? "Show all" CTA?
- Current code would just keep adding rows and the inner `gridScroll` would scroll silently

**Severity if confirmed:** **HIGH** — unhandled case, likely visually broken.

---

### Frame group C — "note" annotations (2850:11913, 2850:12005)

**Figma shows (inferred):** designer sticky-notes explaining the variants. Not UI to implement; READ THESE to understand intent for frames A and B.

**Action:** During Pass 1 re-run with figma MCP, dump the text content of both notes into this report's "Designer intent" section.

---

## Token deltas (inferred — needs Pass 1 confirmation)

| Token | Prior baseline (1666:9723) | Current code (theme.ts) | New section likely uses | Confirmed? |
|---|---|---|---|---|
| `background/primary/subtle_50` | `#f2efec` | `figmaBackground: '#f2efec'` (fixed in audit 2026-05-13 #5 — verify in current theme.ts? line 15 still shows `#f2efec` ✅) | same | ✅ |
| `border-radius/xl` | 12 | `card.borderRadius: 12` (line 1351 ✅) | same | ✅ |
| Sheet padding | 16 | `SHEET_PADDING = 16` (line 61 ✅) | likely same | ✅ |
| Action gap | `dimension/12 = 12` | `actionCluster.gap: 12` (line 1425 ✅) | same | ✅ |
| Card placeholder bg | `#f2efec` | `figmaCardSurface: '#f2efec'` (line 16 ✅) | same | ✅ |

**Good news:** the baseline audit's outstanding MEDIUMs from 2026-05-13 (#5, #6, #7, #8, #10) all appear FIXED in the current code. Those checkboxes in the prior report should be marked done.

---

## Net new features (not in code today)

| # | Feature | Source | Severity |
|---|---|---|---|
| F1 | Sheet pagination indicator ("1/3", "2/3", "3/3") | Frame group A | MEDIUM — visible UX gap, easy fix |
| F2 | Variable-item-count grid layouts (3/5/6/>6) | Frame group B | HIGH — current 2-col fixed math breaks for 5+ items |
| F3 | ">6 items" overflow handling | Frame B4 | HIGH — completely unhandled |
| F4 | (possibly) Sheet 1/3 has variant `2852:20899` — could be mode-specific or empty-state | Frame A | LOW — confirm |

---

## testID gaps (Maestro impact)

For the new section to be testable via deterministic Maestro flows, the following testIDs need to be added when implemented:

| Element | Proposed testID | Maestro use |
|---|---|---|
| Sheet pagination text | `home-sheet-counter` | `assertVisible: id=home-sheet-counter, text="1/3"` |
| Per-outfit item-count container | `home-outfit-grid-{count}` (e.g. `home-outfit-grid-5`) | assert correct layout variant rendered |
| Overflow badge (>6 items) | `home-grid-overflow-badge` | assert visibility + count |

Today's `home-outfit-sheet-{index}` (line 1028) and `home-tile-{sheetIndex}-{flatTileIndex}` (line 1050) survive, but they don't reveal count-shape. Add count-aware testIDs at the same time as the grid refactor.

---

## Code locations to touch (when fixes ship)

| Concern | File:line | Change shape |
|---|---|---|
| Backend `count` (number of outfits per fetch — note: this is OUTFITS not ITEMS) | `auxi/src/screens/HomeScreen.tsx:404` | Unchanged — `count: 3` is outfits per batch, not items per outfit |
| Grid row construction | `HomeScreen.tsx:1015-1025` (`for (i+=2)` loop) | Replace with count-driven shape selector (3→balanced, 5→2-2-1, 6→3-col×2, >6→overflow) |
| `CARD_WIDTH` (2-col assumption) | `HomeScreen.tsx:66` | Make column count dynamic based on `items.length` |
| `CARD_HEIGHT` (2-row assumption) | `HomeScreen.tsx:92` | Recompute when row count changes |
| `OPTION_SHEET_HEIGHT` cap | `HomeScreen.tsx:83` | May need to grow for >4-item outfits, or accept smaller tiles |
| Sheet counter UI | `HomeScreen.tsx:825-866` (header) | Add `<Text testID="home-sheet-counter">{activeSheetIndex+1}/{optionSets.length}</Text>` |

---

## Unresolved questions

1. **Figma MCP access** — I could not run Pass 1 (`get_metadata`, `get_design_context`, `get_variable_defs`, `use_figma`). My function-tool surface in this subagent does not include them. Re-run this audit from a context that has those tools, or have mobile-dev/PM paste the per-frame design context here so token + spacing values can be locked.
2. **What do the two "note" stickies say?** (`2850:11913`, `2850:12005`) — they explain designer intent for the variable-count grids and the 1/3·2/3·3/3 pagination. Critical for Pass 2 accuracy.
3. **5-item / 6-item layout shape** — equal tiles in 2-col with overflow? 3-col mixed? Asymmetric (1 hero + 4 thumbs)? Cannot tell from frame names alone.
4. **\>6 items — truncate, scroll, or overflow badge?** Pick one before mobile-dev starts.
5. **Variant `2852:20899` (second "Home 1/3")** — what differs from `2850:9125`? Mode pill state? Pin state? Empty wardrobe state?
6. **Does the new design retain the mode-pill row (Safe/Power/Creative)?** Prior audit flagged it as code-only (no Figma) — does Grid View incorporate it or replace it?
7. **Does the new design retain the "Pinned: X · Clear" mini-affordance below the header?** (HomeScreen.tsx:911-923 — Phase B AU-222 code-only addition)
8. **Backend question for backend-dev:** is V05 already returning outfits with 5/6/>6 items, or is the designer specifying a forthcoming change? Audit `v05.outfits[].items.length` distribution against the prod recommender. If BE caps at 4, this is a design-ahead-of-engine situation — sync with PM.

---

## Recommended next step

1. PM/mobile-dev re-runs Pass 1 with figma MCP access — paste back the design context for each of the 10 frames into a follow-up findings doc.
2. Decide grid-shape contract for 3/5/6/>6 with designer (CEO) before any code lands.
3. mobile-dev splits work: (a) sheet counter (cheap, ship now), (b) grid refactor (blocked on #2 above).
4. qa-ui re-runs compare once Pass 1 data lands → update this report's "Inferred" rows to "Confirmed".
