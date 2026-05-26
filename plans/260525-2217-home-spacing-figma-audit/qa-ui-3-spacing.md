# Home Grid View — Spacing Fidelity Audit #3 (independent)

Figma: file `0nXXMAR4Arf1ZfjtQvtBh0` node `2850:9613` ("outfit with 3 items", 414×896).
Sim: iPhone 16, 393×852 pt. Build = `feat/au-253-home-grid-view`.
Method: Figma measured pt (414 artboard) vs implemented style constants (pt), screenshots for visual confirm only. Constants recomputed for 393×852.

## Computed implemented values (iPhone 16, 393w × 852h)
- CARD_WIDTH = 178  (Figma tile 189)
- COMPUTED_SHEET_HEIGHT = 675 ; AVAILABLE_VIEWPORT = 546 → **OPTION_SHEET_HEIGHT capped to 546**
- CARD_HEIGHT = **171** (= (546 − 200 − 4)/2) ; Figma tile height **252**
- Tile aspect impl 178/171 = **1.04 (square)** ; Figma 189/252 = **0.75 (tall 3:4)**
- OPTION_ACTIONS_HEIGHT reserve = 200 ; Figma true non-grid budget = **164**

## Audit table

| Region / Gap | Figma (pt) | Implemented (pt) | Sim visual | Verdict | Delta / note |
|---|---|---|---|---|---|
| 1. Safe-area top → header content | 45 (header inner `top-45`) | SafeAreaView + header paddingTop 8 (status bar handled by SafeArea) | OK-ish | OK | Figma bakes 45 into 107h header incl. status bar; RN SafeArea handles inset. No actionable drift. |
| 2a. Header side gutter | 22 ((414−370)/2) | 22 (`header.paddingHorizontal`) | match | OK | Exact. |
| 2b. Icon-button size | 45×45 (radius bg `imgRectangle105`, icon 24 @ inset 11) | 45×45 r14, icon 24 (`heartButton`, `TopIconButton`) | match | OK | Exact. |
| 2c. Header vertical padding | inner content 45 top, ~16 bottom within 107 | paddingTop 8 / paddingBottom 10 | match | OK | SafeArea absorbs top; visually fine. |
| 2d. Weather block centering | center column of 370 row | WeatherWidget center of space-between | match | OK | Visually centered both. |
| 3. Header → first sheet top | header 107; Frame 2034 y=115 → 8pt gap; caption row at sheet top | header → scrollContent paddingTop **4** → sheet paddingTop 12 → caption | match | OK | Figma 8 vs impl 4+ small; not material. |
| 4a. Sheet side gutter (screen edge → sheet) | 0 (sheet = full 414 bleed) | 0 (optionSheet full width) | match | OK | |
| 4b. Sheet top padding | 12 (caption row y0 inside; grid y52 = 40 caption + 12) | 12 (`optionSheet.paddingTop`) | match | OK | |
| 4c. Sheet horizontal padding | 16 (Frame 2009 grid x=16) | 16 (`SHEET_PADDING`) | match | OK | |
| 4d. Sheet bottom padding | 24 (cta ends 672, sheet 672; +grid frame leaves ~24 below) | 24 (`optionSheet.paddingBottom`) | match | OK | |
| 4e. Sheet corner radius | — (sheet flat in frame) | 16 (`optionSheet.borderRadius`) | rounded | OK | impl adds card-sheet radius; acceptable. |
| 5a. Caption pill padding | 12 H (text x=12 in 324 frame), pill height 40 | paddingH 12, height 40, padV 8 (`captionPill`) | match | OK | |
| 5b. Caption/insight pills size | caption 324w(hug) + 40 insight, gap 4 | flexShrink caption + 40 insight, gap xs(4) | match | OK | |
| 5c. Insight icon glyph | carbon:idea 16×16 in 40 pill (12 inset) | IconIdea **24×24** in 40 pill (8 inset) | bigger | **OFF** | impl bumped glyph 16→24 (comment AU-253). Minor; pill footprint same. |
| 5d. Caption row → grid gap | **12** (grid y52, caption ends y40) | distributed by space-between (~12 by luck) | match-ish | OK | Not a fixed gap; happens to land ~12 only because cap math. Fragile. |
| 6a. Grid inter-tile HORIZONTAL gap | **4** (tile2 x=193, tile1 ends 189) | 4 (`GRID_GAP`, `cardRow.gap`) | match | OK | |
| 6b. Grid inter-tile VERTICAL gap | **4** (row2 y=256, row1 ends 252) | 4 (`GRID_GAP`, `gridWrap.gap`) | match | OK | |
| 6c. Tile height / aspect | **252** h, 189 w → **0.75 (3:4 portrait)** | **171** h, 178 w → **1.04 (square)** | tiles squashed flat, big empty surface around garment | **OFF (severe)** | CARD_HEIGHT crushed by viewport cap + 200 reserve. −81pt height, aspect off by 39%. |
| 6d. Tile corner radius | 12 (border-radius/xl) | 12 (`card.borderRadius`) | match | OK | |
| 7a. Card image inset | image fills tile (189×252, contain) | resizeMode contain in tile | bigger empty margins in sim | OFF (consequence) | Garment looks tiny — because tile is square + contain leaves vertical letterbox. Root cause = 6c. |
| 7b. "common" tag | centered-bottom pill | 57×19, centered-bottom, r8 top corners (`cardTag`) | match | OK | Position/size match Figma render. |
| 8. Grid → pager/action row gap | **12** (action row y572, grid ends 560) | distributed by space-between | larger in sim | **OFF** | Excess slack pushed here; gap visibly >12 in sim. |
| 9a. Pager dots → "Wear this" gap | **12** (cta y616, action row ends 604) | actionCluster sits below; space-between adds slack | larger in sim | OFF (consequence) | Same slack-distribution issue. |
| 9b. "Show another" alignment | right edge of 382 frame | right (`space-between`, sideSlot 83 mirror) | match | OK | Remix intentionally omitted (CEO scope). |
| 9c. Pager dots | 3× 4px ellipses, gap 12 (x 12/24/36 in 52 frame) | dot 4px, `dots.gap = s` (=8) | slightly tight | OFF (minor) | Figma dot pitch 12 → gap 8; impl gap 8. ~4pt tighter. Cosmetic. |
| 10a. "Wear this" height | **56** (Frame 2035 button) | 56 (`pillBase.height`) | match | OK | |
| 10b. "Wear this" side margins | **27.5** within grid frame → 43.5 from screen edge; CTA width **327** | **16** from screen edge; width = full grid (~361) | CTA wider/edge-to-edge in sim vs inset in Figma | **OFF** | Figma CTA is 55pt narrower than the grid (centered, inset 27.5). Impl `alignSelf:'stretch'` makes CTA = full grid width. |
| 10c. "Wear this" radius | 16 | 16 (`primaryActionFull.borderRadius`) | match | OK | |
| 10d. "Wear this" text/icon gap | 8 (Button internal) | 8 (`pillBase.gap`) | match | OK | |
| 11. "Wear this" → footer gap | cta ends 672; footer y=798 → **126pt** designed whitespace (sheet ends, then next sheet/footer) | sheet capped 546; CTA bottom + paddingBottom 24, then scrollContent paddingBottom 24, then footer 98 sibling | huge whitespace + next-sheet peek in sim | **OFF** | Sim shows a large dead band + a peek of the next sheet before the footer. Snap-paging + over-tall reserve makes the post-CTA whitespace read wrong. |
| 12a. Footer height | **98** | 98 (`HOME_VIEW_TOGGLE_FOOTER_HEIGHT`) | match | OK | |
| 12b. Active capsule | 158×56 r14 | 158×56 r14 (`activeCapsule`) | match | OK | |
| 12c. Tab cells | 66×48 r13, cluster gap 16, cluster 149w | 66×48 r13, gap m(16), 149w (`tab`,`tabCluster`) | match | OK | Footer is pixel-faithful. |
| 12d. Footer internal padding | icon 24 @ ml21/mt12.5 in 66×48 | icon 24 centered in tab | match | OK | |
| 13. Overall vertical rhythm | tiles tall, tight 12pt rhythm caption/grid/action/cta | tiles squashed, slack dumped as uneven whitespace via space-between | **bad** | **OFF (root)** | See offenders below. |

## Top 3 worst spacing offenders

### #1 — Squashed tiles (aspect 1.04 vs Figma 0.75)
- **Cause:** `OPTION_SHEET_HEIGHT` is capped to `AVAILABLE_VIEWPORT` (546 < computed 675) AND `OPTION_ACTIONS_HEIGHT = 200` over-reserves. `CARD_HEIGHT = (546 − 200 − 4)/2 = 171`, while CARD_WIDTH = 178 → near-square instead of tall 3:4 (Figma 189×252).
- **Location:** `src/screens/HomeScreen.tsx:70` `OPTION_ACTIONS_HEIGHT = 200`; `:106-108` `CARD_HEIGHT`; `:88-93` `AVAILABLE_VIEWPORT`.
- **Fix:** Drop `OPTION_ACTIONS_HEIGHT` from `200` → **164** (Figma true non-grid budget = caption 40 + 3×12 gaps + action 32 + cta 56). That returns 36pt to `CARD_HEIGHT` → ~189, aspect 178/189 = 0.94 — still not 0.75 because the iPhone-16 viewport genuinely can't fit two 3:4 tiles + chrome. **Recommended:** make the grid the flex child and pin CARD_HEIGHT to the 3:4 ratio of CARD_WIDTH (`CARD_HEIGHT = round(CARD_WIDTH * 4/3)` ≈ 237) and let the inner `gridScroll` scroll, OR reduce tile count visible. At minimum, change `200 → 164` to stop wasting 36pt.

### #2 — `OPTION_ACTIONS_HEIGHT = 200` over-reserves by 36pt → uneven whitespace
- **Cause:** Figma reserves only 164pt for everything that isn't the grid; impl reserves 200. The surplus 36pt is handed to `optionSheet`'s `justifyContent: 'space-between'`, which spreads it across caption→grid, grid→action, action→cta gaps. Figma wants all three to be a fixed **12pt**. Sim shows the grid→action and action→cta gaps visibly larger than 12.
- **Location:** `src/screens/HomeScreen.tsx:70` (`OPTION_ACTIONS_HEIGHT = 200`); `:1643` `optionSheet.justifyContent: 'space-between'`.
- **Fix:** `OPTION_ACTIONS_HEIGHT = 164`. Then replace `space-between` with explicit `gap: 12` on the sheet content stack (Figma's three inter-block gaps are all `dimension/12`), so spacing is deterministic instead of slack-driven.

### #3 — "Wear this" CTA stretched to full grid width (361pt) vs Figma 327pt inset
- **Cause:** `primaryActionFull` uses `alignSelf: 'stretch'` inside an `actionCluster` (`alignItems: 'center'`), so the CTA spans the full sheet inner width (361pt). Figma Frame 2035 places the button at x=27.5 w=327 within the 382 grid frame — i.e. **27.5pt inset each side** (43.5pt from screen edge), intentionally narrower than the grid.
- **Location:** `src/screens/HomeScreen.tsx:1778-1782` (`primaryActionFull.alignSelf: 'stretch'`); used at `:1420`.
- **Fix:** Set CTA `width: 327` (or `alignSelf: 'center'` + `width: CARD_WIDTH*2 + GRID_GAP - 55`) and remove `alignSelf: 'stretch'` so it centers with ~27pt side inset, matching Figma.

## Open questions
- iPhone-16 viewport (852pt) genuinely cannot fit two Figma 3:4 tiles (252×2 + 4 = 508) plus the 164pt non-grid budget plus 115 top chrome + 98 footer + 34 home-indicator (= 919 > 852). The 414×896 Figma artboard has ~44pt more vertical room. **Decision needed (CEO/tech-lead):** scale tiles down uniformly (preserve 0.75 aspect, smaller tiles) vs allow inner grid scroll vs accept squarer tiles on small devices. Audit flags the *current* result (square tiles + dumped whitespace) as wrong regardless of which fix is chosen.
- Caption→grid gap "lands ~12 by luck" only at the current cap value; on a taller device (uncapped 675 sheet) the `space-between` slack changes and all three gaps grow. The `space-between` approach is non-deterministic across devices — flagged but exact per-device deltas not measured beyond iPhone 16.
- Insight glyph 16→24 (5c) and pager dot pitch (9c) are intentional-looking micro-deviations; confirm with designer whether 24px idea glyph is approved.
