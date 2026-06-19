# Figma Audit (Compare mode): FavouriteScreen

**Date:** 2026-06-19
**Auditor:** qa-ui (Compare mode, 3-pass)
**Branch / commit:** `feat/favourite-figma-fidelity` @ `7df8b9e0`
**Figma:** `0nXXMAR4Arf1ZfjtQvtBh0` · section `Favorite` node **2852:21222**
  - Collection card `2852:22063` (title block `3539:22168`)
  - Empty state `2852:22228` → content `2852:22230` (icon `2852:22231`)
  - Remove sheet `3539:23335` → `3539:23380`
  - Header instance `2852:22104`
**Spec/diff reviewed:** `auxi/docs/design-reviews/260619-favourite-figma-diff.md`
**Dev report reviewed:** `auxi/plans/reports/mobile-dev-260619-1429-favourite-figma-fidelity.md`
**Source files:** `src/screens/FavouriteScreen.tsx`,
  `src/screens/favourite/{FavouriteOutfitCard,EmptyState,RemoveFavouriteDialog}.tsx`,
  `src/theme/theme.ts`, `src/assets/images/{icon_favourite_empty,icon_heart_filled}.svg`
**Figma reference shots:** `docs/qa-findings/screenshots/2026-06-19/figma-empty-state.png`,
  `figma-empty-icon.png`

## Summary

- **Pass 1 (Figma extract):** complete — nodes 2852:22230, 2852:22231, 3539:22168, 3539:23380, 2852:22104 read (metadata + variable defs + design context + reference screenshots).
- **Pass 2 (code vs Figma):** complete — all 6 instructed items + token/spacing fixes verified line-by-line.
- **Pass 3 (live sim):** **BLOCKED** — sim healthy (mcp-doctor exit 0, iPhone 16 Pro booted, WDA :8100) and a warm logged-in session is up, but the push-drawer ("See my outfits" → Favourite) does not composite to the screenshot capture buffer in this warm-Metro state (drawer entries present in a11y tree, not rendered to capture). Could not reach the session-gated Favourite screen. Per audit caveat, NOT failing the audit on the missing live capture. Image budget (4 surfaces) reached.
- **Findings:** 0 HIGH · 0 MEDIUM · 0 LOW open. All agreed-spec items landed. No real deviations from the CEO-signed-off diff.

## Per-item verdicts (the 6 confirmation targets)

| Item | Figma spec | Code (`file:line`) | Verdict |
|---|---|---|---|
| **A1** two hairline dividers above + below title | `3539:22168`: divider `3646:10000` @ y=28 (366×1) above title, divider `3646:9997` @ y=69 (366×1) below — full-width 1px lines bracketing the bold title | `FavouriteOutfitCard.tsx:133` (above) + `:142` (below), `styles.titleDivider:241-245` = `alignSelf:'stretch'`, `height:1`, `backgroundColor: theme.colors.figmaDivider` (#D1D3D8). Stretch spans the title block to full card content width (screen pad 16, no card/titleBlock H-pad). | **PASS** |
| **A2** date repeated per-card inside title block | date is first line of each outfit's title block (Supporting Text `2852:22066` @ y=8, above top divider) | `FavouriteOutfitCard.tsx:125-129` renders `date` as first line of `titleBlock`; `FavouriteScreen.tsx:181-197` removed the per-day group header, passes `dateLabel` per card. CEO 2026-06-19 decision — landed. | **PASS** |
| **D1a** empty glyph = neutral 24×24 heart (NOT green) | Figma icon `2852:22231` renders a **filled heart glyph** (confirmed via get_design_context output_image + reference shot `figma-empty-state.png`); color resolves `icon/primary/bold_700` #070707 / `text/neutral/base` #1d1f23 — a **dark-neutral heart**, not green | `EmptyState.tsx:5,19-24`: imports `icon_heart_filled.svg` (24×24), `color={theme.colors.uacTextBase}` (#1d1f23). SVG path = filled heart, `fill="currentColor"`. Shape AND tint match Figma. | **PASS** |
| **E1** remove dialog = bottom sheet (top-corner radius only, bottom-anchored, blur button block, safe-area inset) | `3539:23380` (390×224, anchored to screen bottom): panel `border-radius/2xl`=16 top corners, content px16/py24 (frame @ x16/y24), separate button group block `3539:23388` below with backdrop-blur + home-indicator inset over dim scrim | `RemoveFavouriteDialog.tsx`: `root` `justifyContent:'flex-end'` (`:198`), `panel` `borderTopLeft/RightRadius: uacPanel`(16) only, `paddingHorizontal: m`(16)/`paddingVertical: l`(24) (`:209-215`), separate `buttonBlock` with `BlurView blurAmount={4}` (`:137-143`) + `paddingBottom: insets.bottom + spacing.l` (`:134`), scrim `figmaOverlayScrim` (`:200-203`), slide-up via motion tokens w/ open-close asymmetry + reduce-motion fallback (`:62-85`). Structure + tokens match. | **PASS** |
| **F1** header = hamburger only + blur bar, no title/back-chevron/undo-redo | Figma instance `2852:22104` shows menu + back-chevron + undo/redo over @90% white + blur-7.5 bar (h107) — CEO dropped chevron + undo/redo, keeps hamburger only | `FavouriteScreen.tsx:206-233`: single `TopIconButton` hamburger (`IconHomeMenu` 24, 44×44), BlurView (`:210-218`) + `figmaItemDetailHeaderBg` @90% tint (`:219`), no title, no chevron, no undo/redo. CEO 2026-06-19 decision — landed. | **PASS** |
| **token/spacing fixes** E2/E3/E7/E8, D3/D4/D5 | see per-fix rows below | see below | **PASS** (all 7) |

## Token / spacing fix verification

| Fix | Figma spec | Code (`file:line`) | Verdict |
|---|---|---|---|
| **E2** sheet title type | Inter SemiBold **14/20** (`Text-sm (l-20)/Semibold`, size 14 / weight 600) | `RemoveFavouriteDialog.tsx:218` uses new alias `interSemiboldXsSm`; `theme.ts:269-273` = Inter-SemiBold **14/20**. New alias added correctly (distinct from `interSemiboldSm` 16/20). | **PASS** |
| **E3** sheet body type | Inter Regular **14/20** (`Text-sm (l-20)/Regular`) | `RemoveFavouriteDialog.tsx:223` `interBodySm`; `theme.ts:315-319` = Inter-Regular 14/20. Was Poppins 16/24 — now correct family + size. | **PASS** |
| **E7** title→body gap | gap **8** (`dimension/8`; Headline @y0 h20 → Supporting Text @y28) | `RemoveFavouriteDialog.tsx:225` `body.marginTop: theme.spacing.s` (8). Was 16. | **PASS** |
| **E8** panel padding | px **16** / py **24** (content frame `3539:23382` @ x16/y24) | `RemoveFavouriteDialog.tsx:213-214` `paddingHorizontal: m`(16) / `paddingVertical: l`(24). Was 24 all sides. | **PASS** |
| **D3** icon→caption gap | `gap-12` (`ML`=12) | `EmptyState.tsx:35` `container.gap: spacing.uacDimension12` (12). Was 8. | **PASS** |
| **D4** caption type | Inter Regular **12/16** (`body/xs` = `Text-xs/Regular`) | `EmptyState.tsx:39` `caption` uses `uacBodyXsRegular`; `theme.ts:284-288` = Inter-Regular 12/16. Was `interBodySm` 14/20. | **PASS** |
| **D5** caption color | `text/neutral/base` **#1d1f23** | `EmptyState.tsx:40` `color: theme.colors.uacTextBase` (#1d1f23). Was `figmaTextSecondary` #616161. | **PASS** |

## CEO-confirmed divergences (NOT flagged — verified left as decided)

| Item | Status in code | Note |
|---|---|---|
| A2 per-card date (vs per-day group header) | per-card date, group header removed (`FavouriteScreen.tsx:181`) | CEO 2026-06-19 — correct |
| D1a heart glyph (vs "neutral non-heart") | filled heart, dark-neutral tint | **Figma's empty glyph IS a heart** — dev report's "neutral glyph NOT a heart" wording was a misread of variable defs, but the rendered asset + code both match Figma. No action. |
| D1b empty-icon color token | `uacTextBase` (#1d1f23) | Diff item D1b proposed `success`→`ds.color.green` *if it stayed a green heart*; moot — icon is dark-neutral, not green. On-system token. No action. |
| E1/E12 bottom sheet (vs centered modal) | rebuilt as bottom sheet | CEO 2026-06-19 — correct |
| F1 hamburger-only header (vs Figma chevron+undo/redo) | hamburger only | CEO 2026-06-19 — Figma instance was placeholder Home header; undo/redo intentionally DROPPED |
| B6 rarity pill (data-driven) | `is_common_item === true` only (`FavouriteOutfitCard.tsx:78`) | CEO-confirmed 2026-06-12 — locked |
| B4 tile radius | `borderRadius.s` (4) (`FavouriteOutfitCard.tsx:278`) | intentionally unchanged per CEO |

## Asset note (resolved, no defect)

The dev created **two** SVGs — `icon_favourite_empty.svg` and `icon_heart_filled.svg` — whose path data is **identical** (same filled-heart geometry, viewBox 0 0 24 24, `fill="currentColor"`). `EmptyState.tsx` imports `icon_heart_filled.svg`. The shape matches Figma node `2852:22231` (a heart). `icon_favourite_empty.svg` is currently unreferenced (dead asset). Not a fidelity defect; flag to mobile-dev only as a tidy-up (delete the unused duplicate, or have both filenames point at one source) — non-blocking, LOW housekeeping.

## Re-check log

| Round | Date | HIGH open | MEDIUM open | Result |
|---|---|---|---|---|
| 1 | 2026-06-19 | 0 | 0 | Pass 1+2 complete, all spec items landed. Pass 3 blocked (drawer nav not capturable on warm sim) — not counted against verdict per caveat. |

## Unresolved questions / handoffs

1. **Pass 3 live capture deferred** — could not navigate to the session-gated Favourite via the push-drawer on the warm sim (drawer doesn't composite to capture). Recommend qa-mobile capture the populated screen + empty state + remove sheet during its exploratory smoke (it has the full mobile-mcp tier + auth), to close the visual leg. Not a blocker for this audit.
2. **Dead asset (LOW)** → mobile-dev: `src/assets/images/icon_favourite_empty.svg` is unreferenced (duplicate of the imported `icon_heart_filled.svg`). Delete or de-duplicate. Non-blocking.

## Overall verdict

**PASS** — 0 HIGH, 0 MEDIUM open. Every item on the CEO-signed-off diff (A1, A2, D1a, E1, F1, plus E2/E3/E7/E8 and D3/D4/D5) landed correctly and matches the Figma spec at node 2852:21222. No real deviations. The highest-risk item (D1a empty glyph) is confirmed correct: Figma's empty-state icon is a dark-neutral filled heart, and the code renders exactly that. Design gate clear from the qa-ui Compare leg; Pass 3 visual capture handed to qa-mobile.
