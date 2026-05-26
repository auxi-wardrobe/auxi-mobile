# QA-UI Spacing Audit #1 — Home Grid View (3-item outfit)

Independent audit. Figma `0nXXMAR4Arf1ZfjtQvtBh0` node `2850:9613` ("outfit with 3 items", 414×896) vs `feat/au-253-home-grid-view` on iPhone 16 (393×852pt).

## Method / derived implemented values (iPhone 16, screenWidth=393, screenHeight=852)
- `CARD_WIDTH = floor((393 − 16*2 − 4)/2) = floor(178.5) = **178**`
- `COMPUTED_SHEET_HEIGHT = round(178*(8/3) + 200) = **675**`
- `AVAILABLE_VIEWPORT = 852 − 59 − 34 − 115 − 98 = **546**`
- `OPTION_SHEET_HEIGHT = min(675, 546) = **546**` ← **capped** (this is the root of most spacing pain)
- `CARD_HEIGHT = floor((546 − 200 − 4)/2) = **171**`
- Tile aspect implemented = 178/171 = **1.04 (≈square)** vs Figma 189/252 = **0.75 (3:4 portrait)**

Theme tokens: `xs=4 s=8 m=16 uacDimension12=12`; `borderRadius.s=4 .m=8 .round=9999`.

## Figma absolute geometry (derived from get_metadata x/y/w/h)
| Element | Figma x,y | w×h | Derived gap |
|---|---|---|---|
| header | 0,0 | 414×107 | — |
| content (Frame 2034) | 0,115 | 414×781 | header→content = 115−107 = **8** |
| caption row (2104) | 16,0(rel) | 382×40 | side gutter = **16** |
| grid (2009) | 16,52 | 382×508 | caption→grid = 52−40 = **12** |
| ↳ row1 (2007) | 0,0 | 382×252 | 2 tiles 189w @ x=0,193 → H-gap = **4** |
| ↳ row2 (2008) | 0,256 | 382×252 | V row-gap = 256−252 = **4** |
| pager row (2105) | 16,572 | 382×32 | grid→pager = 572−560 = **12** |
| CTA row (2035) | 16,616 | 382×56 | pager→CTA = 616−604 = **12** |
| ↳ CTA button | 27.5,0(rel) | 327×56 | side margin in 382 frame = **27.5** |
| footer | 1,798 | 414×98 | CTA bottom(672)→footer = **126** (large; no sheet card in Figma) |

Note: **Figma has NO white "sheet" card.** Caption/grid/pager/CTA sit directly on the `#f2efec` page bg. The implementation wraps them in a white `optionSheet` (radius 16, shadow, paddingTop 12 / paddingX 16 / paddingBottom 24). Different design language — flagged but it's an intentional sheet metaphor for the snap-pager, not strictly a spacing bug. Side gutter 16 matches.

## Audit table
| Region/Gap | Figma (pt) | Implemented (pt) | Sim visual | Verdict | Delta / note |
|---|---|---|---|---|---|
| 1. Safe-area top → header | top safe + 0 | `header.paddingTop=8` | OK | OK | Figma caption pill top of content at y=115; header band 0–107. RN SafeAreaView + paddingTop 8 reasonable. |
| 2a. Header side gutter | 16 (header instance pads to 16) | `header.paddingHorizontal=22` | slightly wide | **OFF** | +6. Header gutter 22 vs Figma 16 (and vs sheet's 16). Inconsistent gutter across screen. |
| 2b. Header icon-button size | 40×40 (Figma header buttons) | menu via `TopIconButton`; heart `45×45 r14` | heart looks chunky | **OFF** | heart 45 vs Figma 40; radius 14 vs Figma ~12. +5px box. |
| 2c. Header vertical padding | band 107 tall, content centered | `paddingTop8 / paddingBottom10` | OK | OK | acceptable |
| 3. Header → first sheet top | 8 (107→115) | `scrollContent.paddingTop=4` + sheet `paddingTop=12` above caption = effective 16 over bg | gap a touch big | **OFF** | Figma header→caption = 8; impl ≈ 4 (scroll) then white sheet starts, caption inset 12 inside. Net visual gap above caption ≈16. +8. |
| 4a. Sheet side gutter (edge→content) | 16 | `SHEET_PADDING=16` | OK | OK | matches |
| 4b. Sheet top padding | n/a (no card) | `optionSheet.paddingTop=12` | OK | n/a | Figma has no card; 12 above caption is fine. |
| 4c. Sheet bottom padding | n/a | `paddingBottom=24` | excess below CTA | **OFF** | combines with cap to push footer; see #11. |
| 4d. Sheet corner radius | n/a (no card) | `16` | — | n/a | Figma cards radius is per-tile (12), no sheet. |
| 5a. Caption pill height | 40 | `captionPill.height=40` | OK | OK | matches |
| 5b. Caption pill padX | ML/12 (icon pill x=12) | `paddingHorizontal=12` | OK | OK | matches uacDimension12 |
| 5c. Caption→grid gap | 12 | `optionSheet justifyContent:space-between` (NOT fixed 12) | variable | **OFF** | gap is computed by space-between across the capped 546 sheet, NOT pinned to 12. On capped screen it stretches. Should be fixed 12. |
| 6a. Tile H-gap | 4 | `GRID_GAP=4` (cardRow gap) | OK | OK | matches |
| 6b. Tile V-gap | 4 | `GRID_GAP=4` (gridWrap gap) | OK | OK | matches |
| 6c. Tile aspect / height | 189×252 = **0.75 (3:4)** | 178×**171** = **1.04** | tiles look squished/short | **OFF (worst)** | Δheight ≈ −81pt per tile vs true 3:4 (178×237). Cap forces near-square tiles. Single biggest visual deviation. |
| 6d. Tile corner radius | 12 (border-radius/xl) | `card.borderRadius=12` | OK | OK | matches |
| 7a. Card image inset | 0 (image fills 189×252) | `cardImage 100%×100%` | OK | OK | matches; tiles centered contain. |
| 7b. "common" tag | bottom-center tab, Figma tag ~57×19 | `cardTag 57×19 r8 bottom-center` | OK | OK | matches well |
| 8. Grid → pager gap | 12 | space-between (not fixed) | variable | **OFF** | same space-between issue as 5c. |
| 9a. Pager dots → CTA gap | 12 (pager 572→CTA 616 = 44 incl 32 row) → 12 gap | space-between | variable | **OFF** | not pinned. |
| 9b. "Show another" align | right, within 382 | `showAnother` right via space-between, `sideSlot w=83` mirrors | OK | OK | dots centered correctly |
| 9c. Pager dot size | 4×4, gap between 12 (x=12,24,36) | `dot 4×4`, `dots gap=8` | dots a bit tight | **OFF** | Figma dot center spacing 12 → gap 8 between 4px dots = OK actually (12−4=8). **Re-verify: OK.** |
| 10a. CTA height | 56 | `pillBase.height=56` | OK | OK | matches |
| 10b. CTA side margins | 27.5 each (327 in 382) | stretch to sheet content = full 178*2+... → ~361 wide (393−16*2) | CTA wider than Figma | **OFF** | Figma CTA 327w (inset 27.5); impl stretches edge-to-edge of sheet (~361w). CTA ~34pt too wide. |
| 10c. CTA corner radius | 16 (per code comment #2 fix) | `primaryActionFull.borderRadius=16` overrides pillBase 100 | OK | OK | matches Figma spec |
| 10d. CTA text/icon gap | 8 | `pillBase.gap=8` | OK | OK | matches |
| 11. CTA → footer gap | 126 (intentional whitespace, no card) | `paddingBottom 24` + scroll `paddingBottom 24` + footer sibling | **huge variable gap** | **OFF** | On capped 546 sheet, space-between already inflated all internal gaps; THEN 24+24 pad below; THEN footer. Sim shows a large dead band between "Wear this" and the footer. Worst whitespace offender visually. |
| 12a. Footer height | 98 | `HOME_VIEW_TOGGLE_FOOTER_HEIGHT=98` | OK | OK | matches |
| 12b. Active capsule | 158×56 r14 | `activeCapsule 158×56 r14` | OK | OK | matches |
| 12c. Tab size / gap | 66×48, cluster 149w gap | `tab 66×48`, `tabCluster gap=16 w=149` | OK | OK | matches |
| 13. Overall vertical rhythm | fixed 12pt rhythm between blocks | space-between stretches on capped sheet | uneven, too airy | **OFF** | The `justifyContent:'space-between'` on a height-capped sheet is the systemic cause: every inter-block gap (caption↔grid↔pager↔CTA) inflates beyond the Figma 12, and tiles shrink. |

## Top 3 worst spacing offenders

### 1. Tile aspect collapses to near-square (3:4 lost)
- **Where:** `src/screens/HomeScreen.tsx:106-108` `CARD_HEIGHT` + `:88-97` `AVAILABLE_VIEWPORT` / `OPTION_SHEET_HEIGHT` cap.
- **Cause:** `OPTION_SHEET_HEIGHT` caps at `AVAILABLE_VIEWPORT=546` (< computed 675), so `CARD_HEIGHT=floor((546−200−4)/2)=171`. Tile = 178×171 (aspect 1.04) vs Figma 189×252 (0.75).
- **Fix:** Pin tiles to Figma 3:4 — `CARD_HEIGHT = Math.round(CARD_WIDTH * 4/3)` = 178×4/3 ≈ **237**. Then the sheet must scroll internally (the `gridScroll` already exists) OR reduce `OPTION_ACTIONS_HEIGHT` (currently 200 is bloated). Tiles must read portrait, not square.

### 2. `space-between` inflates every inter-block gap on the capped sheet
- **Where:** `src/screens/HomeScreen.tsx:1643` `optionSheet { justifyContent: 'space-between' }`.
- **Cause:** With sheet capped at 546 but content (caption 40 + grid ~346 + pager 32 + CTA 56 = ~474 + paddings) << 546, `space-between` spreads the leftover ~72pt across the 3 internal gaps → caption→grid, grid→pager, pager→CTA all balloon past the Figma 12pt.
- **Fix:** Drop `justifyContent:'space-between'`; insert explicit `gap: 12` (Figma) between the four children (caption / gridScroll / OutfitActionRow / actionCluster), and let the sheet size to content (`height` undefined or min). Pin caption→grid = grid→pager = pager→CTA = **12** (`uacDimension12`).

### 3. Dead band between "Wear this" and footer
- **Where:** `src/screens/HomeScreen.tsx:1642` `optionSheet.paddingBottom=24` + `:1633` `scrollContent.paddingBottom=24`, compounded by the capped-sheet `space-between` (#2) and the 98pt footer sibling.
- **Cause:** After internal gaps already inflate, 24+24 of bottom padding sit above the footer → large empty band in sim (visible below "Wear this").
- **Fix:** Reduce `optionSheet.paddingBottom` to **0** (the actionCluster CTA should be the bottom edge of the sheet; footer provides its own separation). Keep `scrollContent.paddingBottom` modest (≤8). Combined with #2, the CTA→footer whitespace tightens to the intended look.

## Open questions
- **Sheet card metaphor**: Figma has no white card behind the content (everything on `#f2efec`); impl adds a white `optionSheet` (radius 16 + shadow). Intentional for the snap-pager affordance? If yes, sheet paddings need their own spec; if no, this is a structural deviation beyond spacing. Needs CEO/designer confirm.
- **Header gutter 22 vs 16**: Figma header instance pads to 16; impl uses 22. Is 22 a deliberate header-only inset or drift? Recommend unifying to 16.
- **CTA width 327 vs full-bleed**: Figma CTA is 327 (inset 27.5 in the 382 frame); impl stretches to sheet content width (~361). Confirm whether CTA should be inset or full-width.
- **OPTION_ACTIONS_HEIGHT=200**: reserved height for pager(32)+CTA(56)+gaps seems ~50pt over-allocated (32+56+12*2 = 112). The 200 directly starves tile height. Was 200 measured or padded? If padded, trimming it recovers tile height without forcing internal scroll.
- Could not measure exact header icon-button size from this node (header is an instance `2850:9639`, children not expanded) — used the 40×40 convention from caption insight pill / standard. Confirm against the header component frame if precise.
