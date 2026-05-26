# Tech-Lead B1 Decision — Home Grid Tile Aspect (AU-253)

**Date:** 2026-05-25 · **Branch:** feat/au-253-home-grid-view · **Author:** tech-lead (read-mostly, no prod edits)
**Inputs:** synthesis-spacing-audit.md, qa-ui-{1,2,3}-spacing.md, sim-home-current.png, sim-home-after-a1.png, figma-home-3items.png (2850:9613), verified code recompute (HomeScreen.tsx:62-112, 1640-1659, 1382-1426).

---

## Decision

**Direction 1 — Uniform tile downscale keeping true 0.75 (3:4), grid centered. Requires CEO sign-off.**

Reject D2 (inner grid scroll) and D3 (accept squarer tiles). Rationale below.

---

## Why not D2 / D3

- **D2 (inner grid scroll):** Adds a vertical ScrollView *inside* a vertically snap-paged outer ScrollView. Scroll-within-scroll on the dominant axis is a known RN gesture-conflict + a UX foot-gun (users can't tell whether a drag pages the outfit or scrolls the grid). The codebase has already fought this exact bug twice — see HomeScreen.tsx:104-112 (2026-05-18 fix) and :1171-1182 (C4 fix), both explicitly written to *prevent* the inner gridScroll from ever activating. Re-introducing it reverses two deliberate fixes. Hard no.
- **D3 (accept 0.91):** Zero work, but bakes a permanent, measurable Figma deviation (0.91 vs 0.75 = 22% off on the most prominent element on the home screen). The CEO is the designer and Figma fidelity is the #1 tracked quality issue on this project. Shipping a silent 22% aspect drift without asking is exactly the drift this process exists to catch. Only acceptable as a CEO-chosen fallback, not a default.
- **D1 (uniform downscale):** Tiles stay true 3:4 — pixel-faithful to Figma proportions — at the cost of horizontal fill (tiles get narrower, grid centers with side gutters). Trades a dimension nobody measures (full-bleed width) for the one the CEO does (aspect). Best fidelity-per-effort.

---

## Exact target values for mobile-dev

All assume iPhone 16 (393×852). Formulas must stay device-derived (don't hardcode 146).

### 1. Tile sizing — derive HEIGHT from grid area, WIDTH from aspect (invert current logic)

Current code derives `CARD_HEIGHT` from width (`CARD_WIDTH=178` fixed full-bleed, height squashed to fit). **Invert it:** fix the aspect, derive width from the height the grid area can afford.

```
GRID_AREA_H   = OPTION_SHEET_HEIGHT - OPTION_ACTIONS_HEIGHT          // vertical space for the grid block
CARD_HEIGHT   = floor((GRID_AREA_H - GRID_GAP) / 2)                  // 2 rows + 1 inter-row gap
CARD_WIDTH    = round(CARD_HEIGHT * 0.75)                            // TRUE 3:4 — this is the change
```

With the A2/A3 quick-wins applied (`OPTION_ACTIONS_HEIGHT 200→164`), this yields approximately:
- `GRID_AREA_H ≈ 594 - 164 = 430`  → `CARD_HEIGHT ≈ 213`, `CARD_WIDTH ≈ 160` (true 0.75).
- (Pre-A3, at ACTIONS=200: `CARD_HEIGHT ≈ 195`, `CARD_WIDTH ≈ 146`.)

Either way tiles are narrower than the old 178 full-bleed — that is the intended trade. **Ship A2+A3 with this** so the tiles recover as much height (and therefore width) as possible.

### 2. Centering — kill the horizontal gutter asymmetry

Tiles no longer fill the content frame, so the row must center:
- `cardRow` (HomeScreen.tsx:1666): add `justifyContent: 'center'`.
- `cardShell` (:1670): change `flex: 1` → `flexGrow: 0` (let the tile take its intrinsic `CARD_WIDTH`, not stretch). Width comes from `card.width = CARD_WIDTH` (add explicit width to `card` style, :1673).
- `twoRowOneLarge` row2 single tile must also center (already in a `cardRow`, so inherits `justifyContent: 'center'`).
- Heroes/heroStack variants (`computeHeroRowHeight`, :1178-1182) inherit the same `GRID_AREA_H` math — keep their flex ratios, just confirm row width centers.

### 3. Resolve the gridScroll void (the crux — confirmed resolved)

The ~36pt void is **caused by `gridScroll{flex:1}` claiming more height than the grid content needs, with `optionSheet justifyContent:'space-between'` dumping the slack into a visible gap** (verified: real non-grid content ≈188pt vs the 200pt `OPTION_ACTIONS_HEIGHT` reservation, and flex:1 over-claims ~12-36pt depending on measured caption/action heights).

Fix — make the grid block self-sizing, not flex-greedy:
- `gridScroll` (HomeScreen.tsx:1657): **`flex: 1` → remove flex** (let it wrap its content height). With tiles now sized to exactly fill `GRID_AREA_H`, there is no leftover region to leave void.
- `optionSheet` (:1647): `justifyContent: 'space-between'` → **`flex-start` + `gap: 12`** (this is quick-win A2; bundle it). With gap-based Figma rhythm and a content-sized grid, no slack is spread → **void eliminated by construction.**
- Because tiles now consume `GRID_AREA_H` exactly (2×CARD_HEIGHT + GRID_GAP = GRID_AREA_H by derivation), the inner ScrollView never needs to scroll — it can stay as a ScrollView for safety on smaller devices but will not activate on iPhone 16. (Keeps the D2 hazard dormant, doesn't introduce it.)

**Void confirmed resolved:** removing `flex:1` + switching `space-between`→`flex-start`+`gap` removes both the source (over-claimed flex region) and the amplifier (space-between slack distribution).

### 4. Bundle the safe quick-wins (no separate decision needed)
- A2: `optionSheet` `justifyContent` → `flex-start` + `gap:12` (also the void fix above).
- A3: `OPTION_ACTIONS_HEIGHT` 200 → 164 (Figma true non-grid budget 40+12+32+12+56+12). Frees ~36pt back into `GRID_AREA_H`, directly widening tiles.
- (A1 already shipped: APPROX_TOP_CHROME 115→67.)

### 5. Leave alone (faithful per audit)
Footer 98h, caption pill 40h, grid gaps 4, CTA 56/r16, header buttons 45 (a11y). CTA full-width vs Figma 327 inset is a **separate** open question (B-3) — not part of this aspect decision.

---

## Figma-fidelity tradeoff (one line)

Tiles become pixel-true 3:4 (matching Figma proportions exactly) but narrower than full-bleed, leaving symmetric side gutters — we trade horizontal fill (unmeasured) for aspect fidelity (the CEO's tracked metric).

---

## CEO sign-off: REQUIRED

Deviating from full-bleed tile width to preserve 0.75 is a visual-direction call, and the CEO is the designer. The narrower-centered look is itself a deviation from Figma's full-width frame even though it restores the aspect — so the CEO must pick which Figma property wins on the constrained device.

**Question to put to the CEO (verbatim):**

> "On iPhone-sized screens we can't fit two full-width 3:4 outfit tiles plus the action bar and the new view-toggle footer — something has to shrink. Do you want us to keep tiles at true 3:4 proportions but narrower and centered (gutters on the sides), or keep them full-width and let them go ~20% squarer than the design?"

If CEO picks "narrower/centered" → implement D1 as specced above. If CEO picks "full-width, accept squarer" → that's D3, ship the A1-A3 quick-wins only and close B1 as won't-fix-by-design.

---

## Hand-off

**Blocked on CEO answer.** Once answered:
- **mobile-dev** (auxi/ only): if D1 → implement §1-4 above in HomeScreen.tsx; run `./scripts/auxi-lint-tokens.sh`, `npx tsc --noEmit`, `yarn lint` (baseline: 4 errs/3 warns in _HomeScreen.tsx only).
- **qa-ui**: Compare-mode Pass 2+3 vs Figma 2850:9613 on sim screenshot; confirm aspect ≈0.75 and zero void.
- **qa-mobile**: smoke verify snap-paging still works (no inner-grid scroll activation).
- Contract impact: **none** (mobile-only layout change, no API/route touch).

**Status:** DONE
**Recommendation:** Direction 1 (uniform downscale, true 0.75, centered) bundled with quick-wins A2/A3 — CEO sign-off REQUIRED before implementation.
