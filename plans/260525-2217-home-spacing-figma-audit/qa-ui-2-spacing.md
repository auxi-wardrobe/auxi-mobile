# QA-UI Audit #2 — Home Grid View (3-item) spacing fidelity vs Figma

**Scope:** spacing/whitespace ONLY. Independent measurement.
**Figma:** file `0nXXMAR4Arf1ZfjtQvtBh0`, node `2850:9613` ("outfit with 3 items"), 414×896 artboard.
**Sim build:** iPhone 16 (393×852 pt), screenshot `sim-home-current.png`.
**Method:** Figma values derived from absolute child x/y/w/h in `get_metadata` + `get_design_context` Tailwind + `get_variable_defs` tokens. Compared against implemented style constants (pt). Base-size caveat respected — comparing design-intent pt, not raw screenshot px.

## Figma ground-truth (derived from absolute coords)

- Outer sheet frame `2850:9614`: padX = **24** (`--body`). bottom-anchored, h=781.
- Content column `2850:9615`: padX = **16**, vertical **gap = 12** (`dimension/12`) between all 4 children.
- Side gutter to grid content (`2104`/`2009`/`2105`/`2035` all x=16, w=382): **16** within the content frame.
- Caption row `2104`: y=0 h=40 → caption→grid **12**. Grid `2009`: y=52 h=508 → grid→pager **12**. Pager `2105`: y=572 h=32 → pager→CTA **12**. CTA `2035`: y=616 h=56.
- Grid tiles: w=189 h=252 (**3:4**), H-gap **4** (193−189), V-gap **4** (256−252), radius **12** (`border-radius/xl`).
- Caption pill `2850:9617`: padX 12 / padY 8, radius 4. Insight pill `2850:9619`: **40×40**, radius 4. Pill-to-pill gap **4**.
- Pager dots: size **4**, gap **8** (x=12,24,36). CTA `2850:9638`: max-w **327**, h **56**, radius **16**, border 1.5, inner padX 20 / padY 16, label↔icon gap 8.
- Header `2850:9639`: h=107, inner row top=45 w=370 centered → side gutter **(414−370)/2 = 22**. Menu/heart box **45×45**, icon 24.
- Header→sheet: Frame 2034 y=115, header h=107 → gap **8**.
- Footer `2850:9640`: y=798 h=**98**. Active capsule 158×56 r14. Tab cell 66×48 r13. Cluster gap 16, w=149.

## Findings table

| Region/Gap | Figma (pt) | Implemented (pt) | Sim visual | Verdict | Delta / note |
|---|---|---|---|---|---|
| 1. Safe-area top → header | n/a (SafeAreaView) | `header.paddingTop:8` | header sits just under status bar | OK | Figma header h=107 includes 45pt top inset; RN uses SafeAreaView + 8pt — acceptable |
| 2a. Header side gutter | **22** ((414−370)/2) | `header.paddingHorizontal:22` (HomeScreen:1532) | edges align | **OK** | exact |
| 2b. Menu / heart button size | **45×45** | `heartButton 45×45 r14` (1537-9); menu via TopIconButton | OK | matches |
| 2c. Header vertical padding | top 8 / bottom 10 (RN); Figma 45+ centered | `paddingTop:8 paddingBottom:10` | OK | reasonable |
| 2d. Weather block centering | centered in 370 row | `justifyContent:'space-between'`, WeatherWidget center child | centered, looks fine | OK | visual confirm OK |
| 3. Header → first sheet top | **8** (115−107) | `scrollContent.paddingTop:4` | small gap, looks tight-ish | **OFF (minor)** | Figma 8, impl 4. −4pt. Plus mode-selector is COMMENTED OUT so APPROX_TOP_CHROME(115) over-reserves 48pt of phantom chrome (see #13). |
| 4a. Sheet side gutter (screen edge → sheet) | **24** (`--body` outer pad) | **0** — optionSheet has NO horizontal margin; only `paddingHorizontal:16` | sheet spans full width edge-to-edge | **OFF** | Figma sheet card is inset 24 from screen edge inside a 414 frame; impl sheet is full-bleed w/ 16 inner pad. Missing the 24pt outer inset → sheet card touches screen edges. See #13. |
| 4b. Sheet top padding | **12** (content gap top = first child at column gap) | `optionSheet.paddingTop:12` (1640) | OK | **OK** | exact |
| 4c. Sheet horizontal padding | **16** (column `px-16`) | `optionSheet.paddingHorizontal:16` (SHEET_PADDING) | OK | **OK** | exact |
| 4d. Sheet bottom padding | content col bottom = 24 (`--body` frame) | `optionSheet.paddingBottom:24` (1642) | OK | OK | matches outer 24 |
| 4e. Sheet corner radius | 16/18 (frame 16, card 18) | `optionSheet.borderRadius:16` | OK | OK | |
| 5a. Caption pill padX/padY | 12 / 8 | `paddingHorizontal:12 paddingVertical:8` (OutfitCardCaption:53-4) | OK | OK | exact |
| 5b. Caption/insight pill height | 40 | `height:40` both pills (51,65) | OK | OK | exact |
| 5c. Caption→pill gap | 4 | `row.gap: theme.spacing.xs (4)` (47) | OK | OK | exact |
| 5d. Caption→grid gap | **12** | `optionSheet justifyContent:'space-between'` distributes; nominal column gap 12 | sim gap looks ~larger than 12 | **OFF (risk)** | optionSheet uses `space-between` NOT a fixed 12 gap. The 3 children + actionCluster are pushed apart to fill OPTION_SHEET_HEIGHT. On iPhone 16 where sheet is capped, residual space inflates caption→grid and grid→pager gaps beyond 12. See #13. |
| 6a. Grid H-gap | **4** | `cardRow.gap: GRID_GAP (4)` (1664) | OK | OK | exact |
| 6b. Grid V-gap | **4** | `gridWrap.gap: GRID_GAP (4)` (1651) | OK | OK | exact |
| 6c. Tile aspect / height | **3:4** (189×252) | `CARD_HEIGHT = floor((SHEET_H−200−4)/2)` — NOT aspect-locked | tiles look ~square-ish, shorter than 3:4 | **OFF** | CARD_WIDTH≈186 → true 3:4 height = 248. Impl derives height from leftover sheet space (capped path), giving < 248. Tiles squashed vertically vs Figma. |
| 6d. Tile radius | 12 | `card.borderRadius:12` (1671) | OK | OK | exact |
| 7a. Card image inset | tile is overflow-clip, image object-cover full | `cardImage 100%/100%`, resizeMode contain | OK | OK | contain vs cover differs but spacing fine |
| 7b. "common" tag pos/pad | bottom 0..8, h19 r-top8 w57 | `cardTag bottom:0 w:57 h:19 r-top:8` (1751-63) | OK | OK | Figma bottom-8; impl bottom:0 (−8pt) — tag flush to tile base vs 8 above. Minor. |
| 8. Grid → pager row gap | **12** | space-between (see 5d) | inflated | **OFF (risk)** | same `space-between` issue |
| 9a. Pager dots size/gap | 4 / 8 | `dot 4×4`, `dots.gap: s(8)` (100,103) | OK | OK | exact |
| 9b. Pager→CTA gap | **12** | `actionCluster.gap:12` (1771) + space-between above | sim gap LARGE (pager dots far above CTA) | **OFF** | actionCluster gap is 12 but the WHOLE actionCluster is shoved to sheet bottom by space-between, leaving a big void between pager row and CTA. Worst visible whitespace. See #13. |
| 9c. "Show another" alignment | right-aligned in row | `row justifyContent:'space-between'`, sideSlot 83 mirrors | right-aligned OK | OK | |
| 10a. CTA height | **56** | PillButton default + primaryActionFull; Figma 56 | OK | OK | |
| 10b. CTA side margins | inset to max-w 327 (≈27 each side in 382) | `primaryActionFull alignSelf:'stretch'` → fills 382-16pad = ~361 wide | CTA wider than Figma | **OFF (minor)** | Figma CTA max-w 327 centered; impl stretches full content width (~361). +34pt wider. |
| 10c. CTA radius | 16 | `primaryActionFull.borderRadius:16` (1780) | OK | OK | exact |
| 10d. CTA text/icon gap | 8 | PillButton internal gap | OK | OK (assumed) | not re-measured; PillButton standard |
| 11. CTA → footer gap | small (sheet bottom 24 then footer) | snap-paging; footer is sibling below ScrollView | sim shows partial NEXT sheet peeking, then footer | **OFF (risk)** | The next sheet's caption peeks above footer (visible in sim) — this is snap-page bleed, not a fixed gap. CTA→footer not a clean Figma whitespace. |
| 12a. Footer height | **98** | `HOME_VIEW_TOGGLE_FOOTER_HEIGHT:98` | OK | OK | exact |
| 12b. Active capsule | 158×56 r14 | `activeCapsule 158×56 r14` (116-9) | OK | OK | exact |
| 12c. Tab size / gap | cell 66×48 r13, cluster gap 16 | `tab 66×48 r13` (122-4), `tabCluster.gap: m(16)` (108) | OK | OK | exact |
| 13. Overall vertical rhythm | uniform **12** between sheet sections | `space-between` over capped height | uneven, bottom void | **OFF (WORST)** | See offenders below |

## Top 3 worst spacing offenders

### #1 — `optionSheet` uses `justifyContent:'space-between'` instead of a fixed 12pt gap rhythm
**File:** `src/screens/HomeScreen.tsx:1643` — `optionSheet.justifyContent: 'space-between'`
**Problem:** Figma's content column `2850:9615` uses a UNIFORM `gap-12` between caption → grid → pager → CTA (all 12pt). The impl instead distributes the 4 children across the full `OPTION_SHEET_HEIGHT` with `space-between`. Because `OPTION_SHEET_HEIGHT` is capped to `AVAILABLE_VIEWPORT` (and the grid ScrollView is `flex:1`), the leftover vertical space is dumped into the inter-section gaps — most visibly a large void between the pager row and the "Wear this" CTA (sim confirms a big empty band there). This is the "spacing is bad" the user feels.
**Fix:** Remove `justifyContent:'space-between'`; make the sheet a top-aligned column with explicit `gap:12`. Let the grid ScrollView size to its content (or give the grid a fixed height = 2×CARD_HEIGHT + 4) so the residual space falls BELOW the CTA, not between sections.
```diff
  optionSheet: {
    height: OPTION_SHEET_HEIGHT,
    ...
-   justifyContent: 'space-between',
+   gap: 12, // Figma column gap (dimension/12) — uniform section rhythm
```
(and drop `gridScroll: flex:1` → let grid be content-height, OR cap grid height explicitly so it can't eat the gap.)

### #2 — Sheet card has no 24pt outer side inset (full-bleed vs Figma 24)
**File:** `src/screens/HomeScreen.tsx:1636-1648` — `optionSheet` (no `marginHorizontal`)
**Problem:** Figma frame `2850:9614` insets the white sheet card 24pt (`--body`) from the screen edge. Impl sheet spans edge-to-edge (only 16 inner pad). The rounded card visually touches both screen sides, and the grid content gutter ends up at 16 instead of Figma's 24+16=40 effective from edge. Sheet reads wider/less "carded" than design.
**Fix:** add the outer inset (and reduce inner pad so total content gutter still lands at the Figma 16 within-card):
```diff
  optionSheet: {
+   marginHorizontal: 24, // Figma --body outer inset; sheet card floats off edges
    paddingHorizontal: 16,
```
Note: this changes `CARD_WIDTH` math (`screenWidth − 24*2 − 16*2 − 4`/2). Recompute `CARD_WIDTH` accordingly or the tiles overflow.

### #3 — Tile height not aspect-locked to 3:4 (vertically squashed)
**File:** `src/screens/HomeScreen.tsx:106-108` — `CARD_HEIGHT = floor((OPTION_SHEET_HEIGHT − OPTION_ACTIONS_HEIGHT − GRID_GAP)/2)`
**Problem:** Figma tiles are a strict **3:4** (189×252 → 1.333). Impl derives height from leftover sheet space (the capped-viewport workaround), so on iPhone 16 each tile is shorter than `CARD_WIDTH × 4/3`. With CARD_WIDTH≈186, Figma-correct height = **248**; the leftover-space formula yields less, squashing garments. Combined with #1/#2 this is the root cause cascade — they're all symptoms of forcing the whole sheet into a too-small `AVAILABLE_VIEWPORT`.
**Fix:** lock tile height to aspect: `const CARD_HEIGHT = Math.round(CARD_WIDTH * 4 / 3);` and let the grid scroll within its frame (which `gridScroll` already supports) rather than shrinking tiles. Then the bottom action cluster + footer reserve is handled by the ScrollView, not by deforming tiles.

## Open questions

- **Q1 (root cause):** offenders #1/#2/#3 all stem from `AVAILABLE_VIEWPORT` capping the sheet to fit header(115)+footer(98)+safe areas. But the mode-selector (the 48pt in `APPROX_TOP_CHROME=115`, HomeScreen:80) is **commented out** (JSX 950-984). So 48pt of phantom chrome is being reserved that the live screen doesn't render — meaning the sheet is capped ~48pt SHORTER than necessary, directly worsening #1's void. Should `APPROX_TOP_CHROME` drop to ~67 (header 63 + paddingTop 4) until the mode selector ships? That single constant change likely recovers most of the bottom void.
- **Q2:** Figma "common" tag bottom-8 vs impl bottom-0 (`cardTag`, line 1754). Intentional flush-to-base, or should it lift 8pt? Low priority.
- **Q3:** CTA Figma max-w 327 centered vs impl stretch (~361). Was the stretch a deliberate iPhone-16 call, or drift? Affects #10b.
- **Q4:** Couldn't measure CTA internal label↔icon gap from live render (assumed PillButton standard 8). Figma = 8.
