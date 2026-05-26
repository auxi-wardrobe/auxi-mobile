# Home Grid Spacing — Cross-Validated Synthesis

**Date:** 2026-05-25 22:2x · **Branch:** feat/au-253-home-grid-view
**Method:** 3 independent qa-ui audits (parallel, no coordination) vs Figma `2850:9613` ("outfit with 3 items", Home Grid View). Verdict = consensus.
**Verdict:** Home spacing **materially deviates** from Figma. User complaint confirmed by all 3 agents + main-agent code recompute.

## Ground truth (verified against current code)
- iPhone 16: 393×852 pt. CARD_WIDTH=178. OPTION_ACTIONS_HEIGHT=**200** (HomeScreen:70). Mode selector **commented out** (HomeScreen:950-983).
- AVAILABLE_VIEWPORT = 852−59−34−115−98 = **546** → OPTION_SHEET_HEIGHT=546 (capped, computed=675) → CARD_HEIGHT=**171**.
- Tile **178×171 (aspect 1.04)** vs Figma **189×252 (0.75, 3:4)**.
- Figma inter-section rhythm = uniform **12pt** (caption→grid→pager→CTA), measured independently by agents #2 & #3 via Figma MCP.

## Consensus issues (flagged by ≥2 agents = HIGH confidence)

| # | Issue | Agents | Root cause (file:line) |
|---|---|---|---|
| 1 | **Dumped void between pager dots and "Wear this"** — the most visible "bad spacing" | #1 #2 #3 | `optionSheet { justifyContent: 'space-between' }` (HomeScreen:1643) spreads leftover sheet height across gaps instead of Figma's fixed 12pt |
| 2 | **Tiles squashed near-square** (1.04 vs 0.75) | #1 #2 #3 | viewport cap + over-reservation force CARD_HEIGHT=171 (HomeScreen:106 math) |
| 3 | **Over-reservation in viewport math** | #2 #3 | (a) `APPROX_TOP_CHROME=115` reserves 48pt for commented-out mode selector (HomeScreen:80); (b) `OPTION_ACTIONS_HEIGHT=200` vs Figma true budget 164 (HomeScreen:70) |
| 4 | **CTA full-width vs Figma 327w inset** | #1 #3 | `primaryActionFull` stretch (HomeScreen ~1778) vs Figma CTA inset ~27.5pt/side |

## Faithful (match Figma — do NOT touch)
Footer bar (98h, capsule 158×56 r14, tabs 66×48 r13, gap 16), caption pill (40h, 12 pad), grid gaps (4 H/V), CTA height (56) + radius (16), header icon buttons (45×45, a11y tap target).

## Recommended fixes

### A. Quick wins — safe, no design decision
1. `APPROX_TOP_CHROME` **115 → 67** (drop phantom 48pt mode-selector reservation; update stale comment). Recovers 48pt sheet height.
2. `optionSheet`: `justifyContent:'space-between'` → `'flex-start'` + add `gap: 12`. Restores Figma uniform rhythm, kills the void.
3. `OPTION_ACTIONS_HEIGHT` **200 → 164** (Figma true non-grid budget: 40+12+32+12+56+12). Frees height for tiles; update stale comment (currently references 252-logic).

### B. Needs CEO/designer decision (cannot unilaterally fix)
1. iPhone 16 (852pt) **physically can't fit two true 3:4 tiles + chrome + footer** (~needs 919pt). Choose: uniform tile downscale keeping 0.75 (narrower, centered) / inner grid scroll / accept squarer tiles.
2. White sheet "card" wrapper around content **does not exist in Figma node** (#1) — confirm intended.
3. CTA width: Figma 327 (inset) vs impl full-bleed — confirm intent.

### C. Minor (low priority, verify first)
- Header side gutter 22 vs Figma 16 (#1). Heart button 45 vs Figma 40 — keep 45 (≥44pt a11y guideline).

## Note on the footer fix (same session)
The just-applied footer-clip fix subtracted 98pt from AVAILABLE_VIEWPORT, which tightened the sheet and *worsened* tile squash. Quick-win A1 (remove phantom 48) offsets ~half of that. Net sheet height vs pre-footer-era: −50pt. The 3:4 tension (B1) predates the footer and is the real blocker.

## Per-agent reports
- qa-ui-1-spacing.md · qa-ui-2-spacing.md · qa-ui-3-spacing.md (same dir)

## Open questions
1. Apply quick-wins A1-A3 now, or bundle with the B1 tile decision?
2. B1/B2/B3 need CEO/designer — escalate via tech-lead?
