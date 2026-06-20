# Design Review — Home screen (suggestion card + footer)

**Gate:** step 6.5 designer hard gate · **Date:** 2026-06-19 (Asia/Saigon)
**Build:** `main` @ `fcde8ad4`
**Device:** iPhone 16 Pro simulator (iOS 18.1) — Metro warm, screenshot captured OK
**Figma:** Home frame `3230:35149` (`outfit with 2 items`) — file `0nXXMAR4Arf1ZfjtQvtBh0`
  - suggestion layouts `3230:35901` · footer `3230:35156` (current variant node `3910:14047`) · toggle `3914:24540`
**Scope:** CEO's 3 targeted concerns (radius / footer states / footer blur) + full 8-lens pass.
**Surfaces reviewed:** 2 (Home grid view, footer toggle) — within the 4/dispatch cap.

**MCP pre-flight:** `mcp-doctor.sh` exit 0 (sim booted, WDA up). Figma MCP
(`get_variable_defs`, `get_design_context`, `get_screenshot`) confirmed in toolset.

---

## VERDICT: FAIL

One BLOCKER and one MAJOR are open against the CEO's targeted concerns. PR is
blocked until mobile-dev fixes and the footer surface is re-reviewed.

Findings: **B:1 / Maj:1 / Min:3** (5 total).

| # | Concern / Lens | Severity | One-line |
|---|---|---|---|
| C3 | Footer blur (lens 1/6) | **BLOCKER** | `blurAmount={8}` — Figma frame specifies `backdrop-blur-[4px]` |
| C2 | Footer inactive tab dim (lens 4) | **MAJOR** | inactive icon is full-black `#070707`; Figma dims it to `#c6bcb1` |
| C1 | Suggestion card radius (lens 1) | **MINOR** | value 12 is correct, but it's a raw literal — should be a token |
| — | Footer active-pill / nesting (lens 1/6) | PASS | white cell + cream capsule radii match Figma exactly |
| L1a | HomeScreen font-family literals (lens 1) | **MINOR** | 2 pre-existing `fontFamily` literals (baseline, not this scope) |
| L2 | Footer toggle press feedback (lens 2/5) | **MINOR** | tab switch has no `motion` press/select animation |

---

# CEO Concern 1 — Suggestion card border radius

**Severity:** MINOR
**Lens:** 1 design-system
**Rule doc:** design-system.md §1, §3
**Screen:** Home (suggestion grid)

## What's off

The CEO felt the suggestion-card radius is "không chuẩn lắm." On measurement the
**value is correct** — the issue is a token-tier + comment-label drift, not a
wrong number.

- Figma frame `3230:35149` suggestion tiles use local variable
  `border-radius/xl` = **12px** (confirmed via `get_variable_defs` on
  `3230:35901`).
- Code `card` style sets `borderRadius: 12` — **the rendered radius matches the
  Figma frame.** Side-by-side (Figma `figma-suggestion-layouts.png` vs sim
  `designer-home-current.png`) the corners read the same.

Two real (minor) problems:

1. **Raw literal, not a token.** `borderRadius: 12` is hardcoded. design-system.md
   §1 says "new code reads from `theme.ds.*` first"; an on-system value via a raw
   literal where a token exists is a MINOR tier finding. The right token is
   `theme.ds.radius.sm` (=12) or the legacy `theme.borderRadius.figmaTile` (=12).
2. **Misleading comment.** The inline comment says `// Figma border-radius/xl = 12`.
   That conflates the Figma file's LOCAL var `border-radius/xl` (=12) with the
   app DS token `ds.radius.xl` (=**18**). They are different scales. A future dev
   reading "xl = 12" and reaching for `ds.radius.xl` would render **18** and
   break the match. The comment should reference `ds.radius.sm` / `figmaTile`.

Nesting checked and OK: `card` has `overflow:'hidden'`, so the image fill is
clipped to the same 12px — no inner/outer radius mismatch. The pin badge uses
`theme.borderRadius.m` (=8), matching Figma `border-radius/md` = 8. The "common"
tag pill uses radius 8 = Figma `border-radius/md`. All correct.

## Evidence

- Source: `auxi/src/screens/HomeScreen.tsx:3226` (`card` → `borderRadius: 12`)
- Figma: `border-radius/xl: 12` (local var, node `3230:35901`); pin badge
  `border-radius/md: 8`
- Screenshots: `screenshots/260619/figma-suggestion-layouts.png`,
  `screenshots/260619/designer-home-current.png`,
  `screenshots/260619/crop-card-corner.png`
- Rule: design-system.md §1 (token tier) · token `ds.radius.sm` / `theme.borderRadius.figmaTile`

## Routing

- mobile-dev: swap raw `12` → `theme.borderRadius.figmaTile` (or `theme.ds.radius.sm`)
  and fix the comment to cite the correct token. Does NOT block the PR (value is
  already pixel-correct). If the CEO still reads the corners as "off" after this,
  that's a **taste call → CEO**, not a system violation — the implemented radius
  equals the Figma frame.

---

# CEO Concern 2 — Footer inactive tab is not dimmed

**Severity:** MAJOR
**Lens:** 4 color & emphasis (+ 5 state coverage)
**Rule doc:** color-rules.md §1 (semantic muted token), header-footer-rules.md §3c
**Screen:** Home (footer view-toggle)

## What's off

CEO concern 2 has two halves; (a) passes, (b) fails:

- **(a) Active tab white background — PRESENT & CORRECT.** The active (grid) tab
  renders the white inner cell (`activeCell`: `figmaSurface` #ffffff, radius 11,
  48×48, shadow `0 1 1 rgba(0,0,0,0.15)`) over the cream capsule
  (`activeCapsule`: `figmaInsightPillBg` #e0d2c4, radius 14, 116×56). Both match
  Figma `3914:24544` / `3914:24541` exactly. ✓
- **(b) Inactive tab dim — MISSING.** In Figma `3914:24540`, the inactive
  (collage) icon is drawn in the muted token `icon/primary/subtle_300` =
  **`#c6bcb1`** — visibly faded ("mờ mờ") against the cream capsule. In code, BOTH
  tab icons render at `color={theme.colors.figmaTextDark}` = **`#070707`**
  (full near-black). The inactive icon is therefore full-strength, not dimmed —
  the only thing distinguishing active from inactive is the white cell, losing
  the intended faded-inactive read the CEO flagged.

The fix is a semantic-color one: the inactive tab's icon (and only the inactive
one) should use the muted token, not `figmaTextDark`. `#c6bcb1` already exists as
`theme.ds.color.tanStroke` / legacy `figmaDotInactive` (color-rules.md §1 lists
`tanStroke #c6bcb1` "tan stroke / inactive dot"). Using the active-state ink for
an inactive control is the lens-4 "incorrect emphasis hierarchy" MAJOR.

## Evidence

- Source: `auxi/src/components/features/HomeViewToggleFooter.tsx:82` (grid icon)
  and `:98-102` (collage icon) — both hardcode `color={theme.colors.figmaTextDark}`;
  no active/inactive color branch on the icon.
- Figma: inactive icon = `icon/primary/subtle_300` `#c6bcb1`; active icon = dark.
- Screenshots — sim (inactive icon full black):
  `screenshots/260619/crop-footer-toggle.png`; Figma (inactive icon muted):
  `screenshots/260619/figma-footer-toggle-4x.png`
- Token: `ds.color.tanStroke` (`#c6bcb1`) / `figmaDotInactive` · color-rules.md §1

## Routing

- mobile-dev: branch the icon color by `activeView` — active tab icon stays
  `figmaTextDark`/ink, inactive tab icon uses `ds.color.tanStroke` (`#c6bcb1`).
  Apply to both tabs so whichever is inactive dims. Add the
  `accessibilityState={{selected}}` is already correct; just the visual dim is
  missing.

---

# CEO Concern 3 — Footer backdrop blur amount is wrong

**Severity:** BLOCKER
**Lens:** 1 design-system (off-spec literal) + 6 cross-screen (chrome consistency)
**Rule doc:** header-footer-rules.md §3b (sticky-CTA backdrop blur)
**Screen:** Home (footer)

## What's off

The footer **does** use a backdrop blur (BlurView is present, so concern 3 is not
"blur missing"), but the **blur amount is double the current frame's spec**, and
it's a hardcoded magic number sourced from a stale Figma node.

- Current Figma Home frame `3230:35149` → footer `3910:14047` specifies
  **`backdrop-blur-[4px]`** (confirmed in `get_design_context`). The white tint
  is `background/neutral/subtlest` (#ffffff) at **opacity 0.80**.
- Code hardcodes **`blurAmount={8}`** (`HomeViewToggleFooter.tsx:57`). The inline
  comment justifies it against an OLD node (`3227:13480`, "backdrop 7.5px → round
  to 8"). That node is superseded by the CEO's current frame, which halves the
  blur to 4px. So the implementation is 2× too strong vs the frame under review.

The tint layer is correct: `translucentSurface` uses `figmaBlurTintWhite80`
(`rgba(255,255,255,0.8)`) = Figma's white@80%. ✓ The reduced-transparency
fallback `figmaItemDetailHeaderBg` (`rgba(255,255,255,0.9)`) is a reasonable a11y
fallback. ✓ Only the blur *amount* is off.

Why BLOCKER (not MINOR): header-footer-rules.md §3b makes the backdrop-blur the
**named house treatment** for the sticky footer, and the value is a hardcoded
literal that disagrees with the authoritative frame the CEO is reviewing against
— this is the design-system-compliance class (wrong/hardcoded spec value on a
chrome element), and the CEO explicitly called it out. (Note: the rule doc's own
text still says `blurAmount={8}` — the doc is stale vs this frame; flag to update
it once the value is corrected, so the doc and `3230:35149` agree.)

## Evidence

- Source: `auxi/src/components/features/HomeViewToggleFooter.tsx:57`
  (`blurAmount={8}`) and the `:19-26` comment citing the superseded node `3227:13480`.
- Figma: footer `3910:14047` → `backdrop-blur-[4px]`; tint white@80%.
- Tint token (correct): `figmaBlurTintWhite80` `rgba(255,255,255,0.8)`.
- Rule: header-footer-rules.md §3b.

## Routing

- mobile-dev: change `blurAmount={8}` → `blurAmount={4}` to match frame
  `3230:35149`. Update the component comment to cite the current node and drop the
  stale `3227:13480 / 7.5px` rationale.
- mobile-dev (doc): update header-footer-rules.md §3b to `blurAmount={4}` so the
  rule doc matches the frame (the doc currently says 8).

---

# Full 8-lens pass (beyond the 3 concerns)

### Lens 1 — Design-system compliance
- **MINOR (baseline):** `auxi-lint-tokens.sh` flags 2 pre-existing `fontFamily`
  string literals in HomeScreen — `:3068` `'Manrope-Medium'` (pin header label)
  and `:3344` `'Inter-Regular'` (card-tag text). Both predate this work and are
  outside the suggestion-card/footer scope; logged as baseline, not a gate
  blocker for this review. `HomeViewToggleFooter.tsx` is lint-clean (no
  hex/font literals).
- See C1 (radius raw literal) above.

### Lens 2 — Motion & interaction
- **MINOR:** the footer tab switch is instant — no press/select motion. The
  active white cell simply appears with no `scale.select` (1.03) / `fast` (120)
  or press-in `scale.press` (0.97 + `spring.standard`). header-footer-rules.md §3c
  (future-bottom-nav) and motion-rules.md §2 expect selection to animate with
  motion tokens. `activeOpacity={0.82}` gives a touch dim but no spring. Not a
  blocker (it's a 2-state toggle, not a translate/scale surface, so no
  reduce-motion branch is required), but a polish gap. Route to mobile-dev.

### Lens 3 — Visual hierarchy
- PASS. The outfit grid is the clear hero; the "Easy lines." caption pill, the
  AI-disclosure/Report row, the primary CTA, and the toggle read in a sensible
  top-to-bottom order. Recommendation dominates the viewport.

### Lens 4 — Color & emphasis
- See C2 (inactive-tab emphasis) above — the one MAJOR. Otherwise semantic
  tokens are used correctly (cream surface, ink CTA border, tan capsule).

### Lens 5 — Component state coverage
- Footer toggle states: default ✓, selected ✓ (white cell), pressed ~ (opacity
  only, see lens 2). The **inactive (unselected) visual state is under-specified**
  — it reuses the active ink color (this is the same defect as C2, counted there).
- HomeScreen itself has loading (MacgieLoader / SkeletonTile), error, empty,
  wardrobe-gap states wired (seen in source) — good coverage, not re-audited
  here (out of the 3-concern scope).

### Lens 6 — Cross-screen consistency
- The footer toggle is a **Home-only** chrome element (header-footer-rules.md §3
  states the app has no persistent bottom tab-bar; this is a per-screen view
  toggle, not global nav — consistent with the rule, no escalation needed). The
  active-pill treatment (filled capsule + white cell) is the same family as the
  drawer's active-row white pill — consistent ✓.
- Blur/tint chrome should match the ItemDetail sticky header treatment
  (`figmaItemDetailHeaderBg`); the tint token is shared ✓, only the blur amount
  diverges (C3).

### Lens 7 — Native feel
- PASS overall — native ScrollView paging, real BlurView (UIVisualEffectView on
  iOS), safe-area respected by the snap-paging math. The missing tab-switch
  spring (lens 2) is the one spot that reads slightly less native; minor.

### Lens 8 — Recommendation experience
- PASS. The outfit set is presented as a curated grid with the "Easy lines."
  context caption, the per-item "common" provenance tag, the pin/Build-around
  affordance, and an explicit AI-disclosure + Report. Reasoning (caption) is
  attached to the recommendation it describes. Trust signals are intact.

### Journey continuity (Where was I / am I / next?)
- PASS. Header (menu + weather/temp + favourite), the recommendation body, and
  the CTA + toggle make "where am I / what next" obvious. No continuity break.

---

## Self-audit

- Findings N=5; visual findings cite screenshot paths that exist on disk
  (figma-suggestion-layouts, designer-home-current, crop-card-corner,
  crop-footer-toggle, figma-footer-toggle-4x — all present in
  `screenshots/260619/`). 0 deleted for missing evidence.
- Each finding cites a rule doc + concrete token (C1 `ds.radius.sm`, C2
  `ds.color.tanStroke`, C3 `blurAmount`/§3b) or the lens question it fails.
- Verdict follows the ladder: 1 BLOCKER + 1 MAJOR ⇒ FAIL.
- 2 surfaces reviewed · 5 findings (B:1 / Maj:1 / Min:3) · VERDICT FAIL ·
  routing → mobile-dev (all 3 concerns), doc update → header-footer-rules.md §3b.

## Re-gate condition

mobile-dev fixes C3 (blur 8→4) + C2 (inactive icon → `ds.color.tanStroke`);
optionally C1 (token swap) + lens-2 motion polish. Re-run lenses 1/2/4/6 on the
footer surface + one fresh sim screenshot of the toggle to confirm the inactive
dim + 4px blur before the PR proceeds to qa-mobile (step 7).

## Unresolved questions (for CEO)

1. C1 radius is pixel-correct (12 = Figma frame). If the corners still feel "off"
   to you, is the intended radius actually larger (e.g. the DS `ds.radius.xl` 18,
   or `md` 16)? That's a taste/spec call only you can make — the current build
   matches the frame as drawn.
2. The CEO's footer frame `3910:14047` also contains a "Remix / Show another /
   Wear this" top cluster as part of the footer component; the app renders those
   as separate HomeScreen elements (Remix link, AI-disclosure row, sticky CTA)
   rather than inside `HomeViewToggleFooter`. Functionally equivalent and not a
   defect, but confirm you're happy with that decomposition vs a single footer
   component.

---

# RE-GATE — 2026-06-19 23:34 (Asia/Saigon)

**Build:** `fix/home-footer-designer-findings` @ `828b0c2b`
**Trigger:** mobile-dev applied the 3 fixes (C3 blur, C2 inactive dim, C1 radius token).
**Lenses re-run:** 1 design-system · 2 motion · 4 color/emphasis · 6 cross-screen (footer + suggestion card only — not the full 8-lens pass).
**MCP pre-flight:** `mcp-doctor.sh` exit 0 (sim iPhone 16 Pro booted, WDA :8100 up). Figma MCP `get_design_context` / `get_variable_defs` / `get_screenshot` confirmed in toolset.
**Live verify:** sim showed a Metro redbox (packager down on :8081). I started Metro (Node 20, `yarn start --reset-cache`), reloaded the app, confirmed a fresh `index.bundle` (HTTP 200) built and the app re-mounted. **Screenshots below are off the NEW bundle — not stale.** Toggle interacted live; testIDs flipped `grid-active↔collage-active` correctly.

## RE-GATE VERDICT: PASS

All 3 concerns resolved. Measured code value == frame value on every concern. No new violations introduced. PR is **unblocked** for step 7 (qa-mobile smoke).

| # | Concern | Was | Frame spec | Now (code) | Live sim | Verdict |
|---|---|---|---|---|---|---|
| C3 | Footer backdrop blur | BLOCKER `blurAmount={8}` | `backdrop-blur-[4px]` (node 3910:14047) | `blurAmount={4}` (`HomeViewToggleFooter.tsx:56`) | lighter frost reads correctly, white@80% tint intact | **PASS** |
| C2 | Inactive tab dim | MAJOR both icons `#070707` | active `icon/primary/bold_700 #070707`; inactive muted | active icon `theme.colors.figmaTextDark` (#070707); inactive icon `theme.ds.color.tanStroke` (#c6bcb1) — branched on `activeView` (`:86-91`, `:112-117`) | confirmed bidirectional: collage-active shows grid icon dimmed tan, grid-active shows collage icon dimmed tan | **PASS** |
| C1 | Suggestion card radius | MINOR raw literal `12` | `border-radius/xl` (local) = 12 | `theme.borderRadius.figmaTile` (= `ds.radius.sm` = 12) (`HomeScreen.tsx:3229`); comment now correctly disambiguates from `ds.radius.xl`=18 | zero visual change — corners still 12px | **PASS** |

## Per-concern detail

### C3 — Blur 8 → 4 (was BLOCKER) · PASS
- Code: `HomeViewToggleFooter.tsx:56` now `blurAmount={4}`. Component header comment (`:19-25`) rewritten to cite the current node `3230:35149 → 3910:14047` and dropped the stale `3227:13480 / 7.5px → 8` rationale.
- Frame: `get_design_context` on `3910:14047` returns wrapper `backdrop-blur-[4px]` + `background/neutral/subtlest (white)` at `opacity-80`. Tint token `figmaBlurTintWhite80` (`rgba(255,255,255,0.8)`) unchanged and correct.
- Sim: the frosted bar behind the toggle reads as the lighter 4px frost in all three captures; the cream capsule + white cell remain legible through it. No over-blur.

### C2 — Inactive tab dim (was MAJOR) · PASS
- Code branches the icon color by `activeView`: active = `theme.colors.figmaTextDark` (#070707), inactive = `theme.ds.color.tanStroke` (#c6bcb1, alias `figmaDotInactive`) — applied to BOTH tabs (`:83-91` grid, `:109-117` collage) so whichever is inactive dims.
- Token reconciliation: `get_variable_defs` on `3914:24540` exposes the bound vars at that node — `background/primary/subtle_100 #e0d2c4` (capsule), `background/neutral/subtlest #ffffff` (cell/tint), `icon/primary/bold_700 #070707` (active icon ink). The inactive icon (Figma `Group32`, node 3914:24547) is an exported raster whose dim is baked in, so no `#c6bcb1` variable is bound at this node; the muted tan `tanStroke #c6bcb1` is the correct DS equivalent of the faded inactive read (color-rules.md §1). Active ink confirmed exactly = `#070707`.
- Sim (decisive): the FLIPPED capture (collage active) shows the white cell moved right, collage icon ink, grid icon dimmed tan — the mirror of the grid-active capture. Inactive-dim now reads on both states.

### C1 — Radius token-tier (was MINOR) · PASS
- Code: `borderRadius: theme.borderRadius.figmaTile` (= 12). Comment now reads "`border-radius/xl` = 12px → app token figmaTile (= ds.radius.sm = 12). NB: this is NOT ds.radius.xl (that is 18)" — exactly the disambiguation requested.
- Value unchanged (12 = frame), so zero visual regression on the suggestion card corners (confirmed in the grid-active capture).

## Lens re-check (footer surface)
- **Lens 1 (design-system):** PASS — both fixed values are now token-sourced (`blurAmount={4}` matches frame; icon colors via `figmaTextDark`/`ds.color.tanStroke`; radius via `figmaTile`). No new hex/font literals in `HomeViewToggleFooter.tsx` (lint hits are comment text only). The 2 pre-existing HomeScreen `fontFamily` literals (`:3069`, `:3347`) remain baseline, out of scope.
- **Lens 2 (motion):** unchanged — the tab switch is still instant (no `scale.select`/`spring`). This was logged MINOR (L2) in the original pass and is NOT a re-gate blocker; carries forward as polish for mobile-dev. `activeOpacity={0.82}` still gives press dim.
- **Lens 4 (color/emphasis):** PASS — the active/inactive emphasis hierarchy is now correct (ink active vs muted-tan inactive); the MAJOR is closed.
- **Lens 6 (cross-screen):** PASS — the 4px blur now aligns the footer chrome treatment with the lighter house frost; active-pill (cream capsule + white cell) family still consistent with the drawer active-row. NOTE: header-footer-rules.md §3b still documents `blurAmount={8}` — **doc is stale vs the frame**; route a one-line doc fix to mobile-dev (§3b → 4px) so the rule matches `3230:35149`. Not a PR blocker (it's a doc, not the code).

## Re-gate evidence
- `screenshots/260619/designer-footer-regate-grid-active.png` — grid active (white cell left, grid icon ink, collage icon dimmed tan)
- `screenshots/260619/designer-footer-regate-collage-active-flipped.png` — collage active (white cell right, collage icon ink, grid icon dimmed tan) — the decisive bidirectional-dim proof
- `screenshots/260619/figma-footer-toggle-regate.png` — Figma `3914:24540` reference crop (active grid ink, inactive collage muted)
- Code: `HomeViewToggleFooter.tsx:56` (blur), `:86-91` / `:112-117` (icon color branch); `HomeScreen.tsx:3229` (radius token)

## Routing (post re-gate)
- **mobile-dev (non-blocking doc fix):** update header-footer-rules.md §3b sticky-CTA backdrop blur `8` → `4` to match frame `3230:35149`. Code is already correct; this only re-aligns the rule doc.
- **mobile-dev (carry-forward MINOR, optional):** L2 footer tab-switch motion (add `scale.select` on the white cell) — polish, does not block.
- All 3 CEO concerns: CLOSED. No CEO escalation outstanding on the footer (the 2 unresolved-Qs above are pre-existing, not raised by this re-gate).
