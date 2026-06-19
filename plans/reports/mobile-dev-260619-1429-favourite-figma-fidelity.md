# Favourite screen — Figma-fidelity pass (delivery report)

**Date**: 2026-06-19
**Author**: mobile-dev
**Spec**: `auxi/docs/design-reviews/260619-favourite-figma-diff.md` (CEO-signed-off)
**Figma**: `0nXXMAR4Arf1ZfjtQvtBh0` · node `2852:21222`
**Branch**: `feat/designer-role` (working tree — not committed/pushed per instruction)

## How extraction was satisfied (Phase 0)

The authoritative spec is the designer's Figma-vs-code diff doc (a complete
structural/token extraction with per-row `file:line` + target tokens), and the
CEO has reviewed and resolved every DIVERGENCE? in writing. That is the
extraction-artifact + review gate for this task. I additionally pulled live
Figma data to confirm asset/structure before coding:

- `get_metadata 2852:22230` — empty-state frame (icons 24×24 + supporting text)
- `get_design_context 2852:22231` + raw SVG asset — empty glyph = filled heart
- `get_variable_defs 2852:22230` — empty-state tokens (icon/primary/bold_700, body/xs)
- `get_screenshot 2852:22228 / 2852:22063 / 3539:23335` — empty / populated card / remove sheet

Populated-card screenshot confirms the title-block order
`date → hairline → bold title → hairline → mood chip`, date repeated per card.
Remove-sheet screenshot confirms bottom-anchored panel + dim scrim + bottom
button block. Implementation matches both.

## Findings → changes

| ID | File:line (after) | Change |
|---|---|---|
| **A1** | `FavouriteOutfitCard.tsx` titleBlock JSX + `styles.titleDivider` | Added two full-width 1px hairlines (`alignSelf:'stretch'`, `backgroundColor: theme.colors.figmaDivider` #D1D3D8) flanking the bold title — one above, one below. |
| **A2** | `FavouriteScreen.tsx` group render + `FavouriteOutfitCard.tsx` (`dateLabel` prop, `styles.date`) | Date moved INTO each card's title block as the first line (above top divider), repeated per card via `dateLabel={formatDateLabel(favourite.created_at)}`. Removed screen-level per-day `styles.dateLabel` header. Date type `uacBodyXsRegular` / color `uacTextBase`. |
| **D1a/D2** | `EmptyState.tsx` + new `assets/images/icon_heart_filled.svg` | Removed green `IconHeartFilled` (icon_home_heart_filled). Exported the neutral 24×24 Figma glyph (node 2852:22231 → solid filled heart) as `icon_heart_filled.svg` with `fill="currentColor"` + clean `viewBox="0 0 24 24"`; rendered 24×24 tinted `theme.colors.uacTextBase`. (D1b token swap moot — heart gone.) |
| **D3** | `EmptyState.tsx` `container.gap` | `theme.spacing.s` (8) → `theme.spacing.uacDimension12` (12). |
| **D4** | `EmptyState.tsx` `caption` | `interBodySm` → `theme.typography.aliases.uacBodyXsRegular` (12/16). |
| **D5** | `EmptyState.tsx` `caption` color | `figmaTextSecondary` → `theme.colors.uacTextBase`. (Also `paddingHorizontal` 24→16 to match Figma `px-16`.) |
| **E1/E12** | `RemoveFavouriteDialog.tsx` (full rewrite) | Rebuilt centred modal → **bottom sheet**: panel bottom-anchored, `borderTopLeft/RightRadius: uacPanel` (16) only / square bottom; separate bottom button block with `backdrop-blur-4` (BlurView blurType="light" blurAmount=4) + home-indicator safe-area inset (`insets.bottom + spacing.l`); slide-up + scrim fade. |
| **E2** | `RemoveFavouriteDialog.tsx` `title` + `theme.ts` | New alias `interSemiboldXsSm` (Inter SemiBold 14/20) added to theme; title uses it (was `interSemiboldSm` 16/20). |
| **E3** | `RemoveFavouriteDialog.tsx` `body` | `poppinsBody` (Poppins 16/24) → `theme.typography.aliases.interBodySm` (Inter Regular 14/20). |
| **E7** | `RemoveFavouriteDialog.tsx` `body.marginTop` | `theme.spacing.m` (16) → `theme.spacing.s` (8). |
| **E8** | `RemoveFavouriteDialog.tsx` `panel` | Split `padding: 24` → `paddingHorizontal: spacing.m` (16), `paddingVertical: spacing.l` (24). |
| **F1/F3** | `FavouriteScreen.tsx` header JSX + styles | Replaced back-chevron + centered "Favourite" title + spacer with a single **hamburger (44×44)** on the LEFT that calls `useSidebar().open()` (same push-drawer as Home). No title, no back chevron, no undo/redo. `testID="favourite-header-menu"`, `accessibilityLabel` = `favourite.open_menu` ("Open menu"). |
| **F2** | `FavouriteScreen.tsx` header | Added BlurView (blurType="light", blurAmount=8) + @90% white tint (`figmaItemDetailHeaderBg`) layer, matching HomeViewToggleFooter blur-7.5 treatment. Safe-area-aware (`paddingTop: insets.top + 8`). |

### Motion (bottom sheet)
Slide (translateY 320→0) + scrim fade (opacity 0→1) driven by `motion.ts`
tokens with open/close asymmetry: enter `duration.normal` (250) + `easing.enter`,
exit `duration.fast` (120) + `easing.exit`. `useReducedMotion()` branch sets
`progress` instantly (no animation) and unmounts immediately on close.

### testIDs / a11y
- `favourite-header-menu` + a11yLabel "Open menu" (hamburger).
- Bottom-sheet preserves `favourite-remove-dialog` / `favourite-remove-confirm`
  / `favourite-remove-cancel` so existing Maestro selectors keep working.

### Swipe-back (F header caveat)
`Favourite` is registered in `AppNavigator.tsx:135` with default options (no
`gestureEnabled: false`), so native-stack edge-swipe-back stays ON — removing
the back chevron does NOT trap the user on the pushed screen. Verified, no nav
change needed.

### Analytics
The hamburger only opens the existing push-drawer. Drawer-open is NOT a tracked
event anywhere (HomeScreen's `home-menu-button` → `openSidebar()` fires no
`track()` either). No new tracked hook point → no new event, no tracking-plan
change (per `analytics-tracking-required.md` — don't fake events). Existing
`outfit_unfavorited` / `favourite_try_on_tapped` untouched.

## NOT touched (per spec)
- **B6** rarity pill (data-driven, CEO-locked).
- **B4** tile radius (left at `borderRadius.s` = 4).
- Pre-existing `favourite.cancel` vs JSON `remove_cancel` key mismatch in the
  dialog — left as-is (out of scope; not in the fix list).

## i18n
Added `favourite.open_menu` to en-EN / fr-FR / vi-VN ("Open menu" / "Ouvrir le
menu" / "Mở menu"). 3-locale parity preserved. Unused `favourite.title` /
`favourite.back` left in place (harmless; avoids parity churn).

## Verification (Node 20)
- `npx tsc --noEmit` — **PASS** (clean).
- `yarn lint` — 1 error + 7 warnings, ALL in untouched files
  (`HomeScreen.tsx:743` exhaustive-deps, plus warnings in usePinReducer /
  DatabaseScreen / OutfitCanvasScreen / SignInScreen). **Zero new** issues in
  any favourite file or theme.ts. (Note: live baseline differs from the
  CLAUDE.md "4 errors in _HomeScreen" note — those are unrelated and pre-exist
  this change.)
- `scripts/auxi-lint-tokens.sh` — 32 pre-existing tree-wide violations, **none**
  in FavouriteScreen / favourite/* / theme.ts / icon_heart_filled.svg. Clean for
  all touched files.
- `yarn jest src/screens/favourite` — **4/4 PASS** (snap-offset logic intact).
- Simulator side-by-side: NOT run this session (no sim launch in scope; mobile-mcp
  is not granted to mobile-dev). **Visual verification pending** → hand to qa-ui
  (Compare Pass 2+3) then designer gate. Figma reference screenshots downloaded
  and compared against source structurally; card + sheet structure confirmed
  matching.

## Files changed
- `auxi/src/screens/FavouriteScreen.tsx` — hamburger header + BlurView, removed date group header, pass per-card `dateLabel`.
- `auxi/src/screens/favourite/FavouriteOutfitCard.tsx` — `dateLabel` prop, date line + two hairline dividers in title block.
- `auxi/src/screens/favourite/EmptyState.tsx` — neutral filled-heart glyph 24×24, gap-12, caption type/color.
- `auxi/src/screens/favourite/RemoveFavouriteDialog.tsx` — full bottom-sheet rebuild + token fixes.
- `auxi/src/theme/theme.ts` — new alias `interSemiboldXsSm` (Inter SemiBold 14/20).
- `auxi/src/assets/images/icon_heart_filled.svg` — NEW (neutral filled heart, currentColor, viewBox 0 0 24 24).
- `auxi/src/translations/{en-EN,fr-FR,vi-VN}.json` — `favourite.open_menu`.

## Open questions
- None blocking. Visual fidelity (blur intensity on header, exact slide distance
  feel) should be confirmed on-sim by qa-ui / designer.

---

**Status:** DONE
**Summary:** Implemented the full Favourite Figma-fidelity pass per the
CEO-signed-off diff — A1 title dividers, A2 per-card date, D1a/D2–D5 empty
state (new neutral heart SVG), E1–E8/E12 remove bottom-sheet rebuild with
motion tokens, F1–F3 hamburger+blur header. tsc/lint/token-script/jest all
clean for touched files.
**Concerns/Blockers:** On-sim visual verification not run this session
(mobile-dev has no sim/mobile-mcp grant) — needs qa-ui Compare + designer gate.
The lint baseline observed live (1 err / 7 warn in untouched files) differs
from the CLAUDE.md note; flagging so review doesn't attribute it to this change.
