# Favourite screen — Figma → code discrepancy report

**Date**: 2026-06-19
**Author**: designer (Figma-vs-implementation diff, requested by CEO)
**Figma**: `0nXXMAR4Arf1ZfjtQvtBh0` · section `Favorite` node **2852:21222**
  - Populated collection card: `2852:22063` (card frame `2852:22065`, title block `3539:22168`)
  - Empty state: `2852:22228` (content `2852:22230`)
  - Remove dialog: `3539:23335` (sheet `3539:23380`)
  - Header instance: `2852:22104` · Footer instance: `2852:22105`
**Code in scope**: `FavouriteScreen.tsx`, `favourite/FavouriteOutfitCard.tsx`,
  `favourite/EmptyState.tsx`, `favourite/RemoveFavouriteDialog.tsx`,
  shared `HomeViewToggleFooter.tsx`, `OutfitCardCaption.tsx`; tokens in
  `theme/theme.ts`.
**Figma reference shot**: `auxi/docs/design-reviews/screenshots/260619/figma-favourite-collection.png`

## How to read this

This is a **Figma-spec vs RN-source** structural/token diff — NOT a pixel diff
(that is qa-ui) and NOT the 8-lens craft gate (that PASSED on 2026-06-19,
`260619-favourite.md`, still valid). Severity here = fidelity-to-Figma, not
release-blocking. Every row gives: Figma spec → current code (`file:line`) →
severity → exact fix. The prioritized hand-off list is at the very end.

**Live-render caveat**: mcp-doctor exit 0, sim (iPhone 16 Pro) healthy, but the
Favourite screen is session-gated and the read-only tier landed on the
logged-out Welcome screen — could not render the populated screen live. This
diff is fully determinable from Figma spec + RN source; values below are
spec-vs-source, not eyeballed off a live capture.

**Severity key**
- **BLOCKER** — wrong token tier / raw value / system violation
- **MAJOR** — real fidelity gap that changes how the screen reads
- **MINOR** — small token/value nit, on-system intent
- **DIVERGENCE?** — looks intentional (product), confirm with CEO before "fixing"

---

## A. Card title block (Figma `3539:22168`) — the biggest gap

Figma structure of the per-outfit header block, centered column, `py-8`, `gap-4`:

```
  date  (Inter Regular 12/16, text/neutral/base #1d1f23)
  ──────────── full-width hairline divider ────────────
  Bold title  (Poppins SemiBold 24/32, text/neutral/base #1d1f23)
  ──────────── full-width hairline divider ────────────
  [ mood chip ]  (tan #e0d2c4 pill, radius 24, Inter Regular 10/12, text #070707)
```

| # | Element | Figma spec | Code does | Sev | Fix |
|---|---|---|---|---|---|
| A1 | **Two hairline dividers** flanking the title (`3646:10000` above, `3646:9997` below) | full-width 1px dividers above AND below the bold title | **No dividers rendered** anywhere in `FavouriteOutfitCard` or the screen group header | **MAJOR** | Add two 1px full-width hairlines (`backgroundColor: theme.colors.figmaDivider` `#D1D3D8` → or canonical `theme.ds.line` rgba(29,31,35,0.10)) inside the title block — one above the title, one below — matching the Figma `divider` component. Width = card content width (366). |
| A2 | **Date lives inside the title block**, above the top divider | date is the first line of each outfit's title block | Date is hoisted OUT to a screen-level per-day group header (`FavouriteScreen.tsx:175`, `styles.dateLabel`), shared across all cards in that day | **DIVERGENCE?** | The code groups N outfits under ONE date header; Figma repeats the date per outfit. Code reads cleaner when a day has multiple saves. **Confirm with CEO**: keep per-day grouping (current) or move date back inside each card to match Figma 1:1. If keeping grouping, A1's *top* divider placement needs a CEO call too. |
| A3 | Date typography | Inter Regular **12/16** (`body/xs`) = `uacBodyXsRegular` ✓ | `styles.dateLabel` uses `uacBodyXsRegular` ✓ | OK | none — matches. |
| A4 | Date color | `text/neutral/base` **#1d1f23** = `uacTextBase` | `styles.dateLabel` color `uacTextBase` ✓ | OK | none — matches. |
| A5 | Title typography | Poppins **SemiBold 24/32** (`H4/SemiBold`) = `poppinsH4SemiBold` ✓ | `styles.title` uses `poppinsH4SemiBold` ✓ | OK | none — matches. |
| A6 | Title color | `text/neutral/base` #1d1f23 = `uacTextBase` ✓ | `uacTextBase` ✓ | OK | none. |
| A7 | Title block padding | `py-8` (8 vertical) | `titleBlock.paddingVertical: theme.spacing.s` (8) ✓ | OK | none. |
| A8 | Title block inner gap | `gap-4` | `titleBlock.gap: theme.spacing.xs` (4) ✓ | OK | none. |
| A9 | Mood chip bg | `background/primary/subtle_100` **#e0d2c4** = `figmaInsightPillBg` ✓ | `moodPill` bg `figmaInsightPillBg` ✓ | OK | none. |
| A10 | Mood chip radius | `border-radius/3xl` **24** | `moodPill` `theme.borderRadius.round` (9999) | MINOR | Visually identical on a 24-tall pill (both fully rounded). No change needed; note for the record only. |
| A11 | Mood chip height / padX | h **24**, px **12** | `moodPill` height 24, `paddingHorizontal: uacDimension12` (12) ✓ | OK | none. |
| A12 | Mood chip label type | Inter Regular **10/12** (`body/xxs`) = `interCaptionXxs` ✓ | `moodPillText` uses `interCaptionXxs` ✓ | OK | none. |
| A13 | Mood chip label color | `text/primary/bold_700` **#070707** = `figmaTextDark` ✓ | `moodPillText` color `figmaTextDark` ✓ | OK | none. |

> A1 is the headline finding for this screen: the design's signature title
> framing (hairline-above / hairline-below the outfit title) is missing entirely.
> It changes how each outfit "card" reads — the dividers are what visually
> bracket the outfit name as a section heading. Fix is purely additive.

---

## B. Tile grid + rarity tag (Figma `2852:22073` / `2852:22074`)

| # | Element | Figma spec | Code does | Sev | Fix |
|---|---|---|---|---|---|
| B1 | Tiles per row | 2 columns | `perRow = 2` (grid) ✓ | OK | none. |
| B2 | Tile aspect | 181×241.33 ≈ **3:4** | `tile` `aspectRatio: 3/4` ✓ | OK | none. |
| B3 | Inter-tile gap | 4 (185−181) | `grid.gap` / `row.gap` = `theme.spacing.xs` (4) ✓ | OK | none. |
| B4 | Tile radius | (image tile, Home parity) | `tile` `theme.borderRadius.s` (4) | MINOR | Home grid uses `borderRadius/xl`=12 (`figmaTile`) for outfit tiles; the favourite tile uses `s`=4. If the CEO wants Home/Favourite tile parity (the code comment claims it mirrors Home), bump to `theme.borderRadius.figmaTile` (12). Otherwise leave — Figma favourite tiles read square-ish. **Confirm intended tile radius.** |
| B5 | Tile surface | warm paper #f2efec | `tile` bg `figmaCardSurface` (#f2efec) ✓ | OK | none. |
| B6 | Rarity "common" pill | drawn on EVERY tile | data-driven, only `is_common_item===true` | **DIVERGENCE — CEO-CONFIRMED (2026-06-12)** | **Do NOT change.** Documented at `FavouriteOutfitCard.tsx:50-54`. Listed only so it is not re-raised. |

---

## C. Action row (Figma `3539:22203` "Frame 2031")

Figma: a centered row, `gap-24`, with an icon button (⊖, 56×56, size-24 glyph)
on the LEFT and a text+icon button "Self visualization” " (Poppins Medium 16/24,
text/neutral/base, 56-tall, fully-rounded, sparkle icon size-24) on the right.

| # | Element | Figma spec | Code does | Sev | Fix |
|---|---|---|---|---|---|
| C1 | Row gap | `gap-24` | `actionRow.gap: theme.spacing.l` (24) ✓ | OK | none. |
| C2 | Remove button footprint | 56×56, glyph 24 | `removeButton` 56×56, `IconMinusCircle` 24 ✓ | OK | none. |
| C3 | Self-viz label type | Poppins **Medium 16/24** (`Text-md/Medium`) = `poppinsButton` ✓ | `selfVizLabel` uses `poppinsButton` ✓ | OK | none. |
| C4 | Self-viz label color | `text/neutral/base` #1d1f23 = `uacTextBase` ✓ | `selfVizLabel` color `uacTextBase` ✓ | OK | none. |
| C5 | Self-viz sparkle icon | size 24, asset = AI sparkle | `IconSparkle` 24, color `figmaAiSparkle` (#822be6) | MINOR | Figma exports the sparkle as a baked multicolor asset (purple→magenta gradient); code applies a single `figmaAiSparkle` median purple via `currentColor`. Acceptable flatten; only confirm if the CEO wants the true gradient asset. Non-blocking. |
| C6 | Self-viz label text | `Self visualization”` (curly-quote glyph in Figma) | i18n `self_visualization` = "Self visualization" (no trailing quote) | MINOR | The trailing `”` in Figma is a copy artifact, not a designed glyph. Code copy is correct. No change. |
| C7 | Remove icon color | (destructive) | `figmaItemDetailDanger` #c0392b ✓ | OK | none — on-system danger token. |

---

## D. Empty state (Figma `2852:22228` → content `2852:22230`)

Figma empty state = the populated screen **dimmed**, with a single centered
`icons` glyph (24×24) above a caption, `gap-12`, `px-16`. Per the node's
variable defs the icon resolves to `icon/neutral/subtlest` **#ffffff** /
`icon/primary/bold_700` #070707 (a neutral glyph on the dimmed canvas) — **not a
green heart**.

| # | Element | Figma spec | Code does | Sev | Fix |
|---|---|---|---|---|---|
| D1 | Empty icon identity | generic 24×24 `icons` glyph (neutral), shown over a dimmed populated canvas | `IconHeartFilled` 28×28, `theme.colors.success` (#388E3C green) | **DIVERGENCE? + MINOR token** | Two parts: (a) **icon choice** — code uses a green heart, Figma uses a neutral glyph. Confirm with CEO whether the green heart is the intended brand treatment (it is friendlier than the bare Figma glyph). (b) **token** regardless of choice: if it stays a green heart, swap `theme.colors.success` (#388E3C, off-canonical) → `theme.ds.color.green` (#039855). |
| D2 | Empty icon size | **24×24** | 28×28 | MINOR | Set `width/height={24}` to match Figma (or confirm 28 is the intended size). |
| D3 | Icon→caption gap | `gap-12` (`ML` token = 12) | `container.gap: theme.spacing.s` (8) | **MINOR** | Change to `theme.spacing.uacDimension12` (12) to match Figma. |
| D4 | Caption typography | Inter Regular **12/16** (`body/xs`) = `uacBodyXsRegular` | `interBodySm` (Inter Regular **14/20**) | **MINOR** | Swap `caption` style to `theme.typography.aliases.uacBodyXsRegular` (12/16). |
| D5 | Caption color | `text/neutral/base` **#1d1f23** = `uacTextBase` | `figmaTextSecondary` (#616161) | **MINOR** | Swap `caption` color to `theme.colors.uacTextBase`. |
| D6 | Caption copy | `Tap "Wear this” button to add an outfit` | i18n `empty_body` = `Tap "Wear this" button to add an outfit` ✓ | OK | none — matches (Figma curly-quote is an artifact). |
| D7 | Footer present in empty state | Figma draws the grid/collage footer (`2852:22234`) | screen renders `HomeViewToggleFooter` below the empty body ✓ | OK | none. |

---

## E. Remove dialog (Figma `3539:23335` → sheet `3539:23380`)

**Structural note**: Figma is a **bottom-anchored sheet** — the "Basic Dialog"
panel has `rounded-tl/tr-16` (top corners only) and the button group is a
separate bottom block with `backdrop-blur-4` and a `pb-36` home-indicator inset,
both pinned to the bottom of the screen over a dim scrim. The code renders a
**center-of-screen modal card** with all-four-corners radius and a fade.

| # | Element | Figma spec | Code does | Sev | Fix |
|---|---|---|---|---|---|
| E1 | **Dialog placement / shape** | bottom sheet: panel anchored to screen bottom, top corners radius 16 only, button group below with `pb-36` safe-area inset + `backdrop-blur-4` | centered modal card (`overlay justifyContent:'center'`), all-corner `uacPanel` radius (16), `animationType="fade"` | **DIVERGENCE? (structural)** | Confirm with CEO: keep the centered confirm modal (current, simpler, also valid Auxi pattern) OR rebuild as a bottom sheet (panel bottom-anchored, `borderTopLeftRadius/borderTopRightRadius` only, button group with bottom safe-area inset + blur, slide-up animation). If kept centered, E1 is a documented divergence; everything else below still applies. |
| E2 | Title typography | Inter **SemiBold 14/20** (`body/sm` Semibold) | `interSemiboldSm` = Inter SemiBold **16/20** | **MINOR** | Figma title is **14**/20, code is 16/20. Add/use an Inter SemiBold 14/20 alias (none exists; `interMediumSm` is Medium not SemiBold). Either add `interSemiboldXsSm` (Inter-SemiBold 14/20) or confirm 16 is acceptable. |
| E3 | Body typography | Inter **Regular 14/20** (`body/sm` Regular) | `poppinsBody` = **Poppins** Regular **16/24** | **MAJOR** | Family + size both wrong. Figma body is Inter Regular 14/20; code renders Poppins 16/24. Swap `styles.body` to `theme.typography.aliases.interBodySm` (Inter Regular 14/20). |
| E4 | Title color | `text/neutral/base` #1d1f23 = `uacTextBase` ✓ | `uacTextBase` ✓ | OK | none. |
| E5 | Body color | `text/neutral/base` #1d1f23 = `uacTextBase` ✓ | `uacTextBase` ✓ | OK | none. |
| E6 | Dialog surface | `background/neutral/subtlest` #ffffff = `white` ✓ | `card` bg `white` ✓ | OK | none. |
| E7 | Title→body gap | `gap-8` | `body` `marginTop: theme.spacing.m` (16) | **MINOR** | Figma inner block gap is 8 (`dimension/8`); code uses 16. Set `body.marginTop` to `theme.spacing.s` (8). |
| E8 | Panel padding | `px-16 py-24` | `card.padding: theme.spacing.l` (24, all sides) | **MINOR** | Figma panel is px **16** / py **24**; code is 24 all round. Set `paddingHorizontal: theme.spacing.m` (16), `paddingVertical: theme.spacing.l` (24). |
| E9 | Button group gap | `gap-12` | `actions.gap: uacDimension12` (12) ✓ | OK | none. |
| E10 | "Yes" button | Text-button: no border/fill, Poppins Medium 16/24, danger #c0392b label + trash icon 24, fully rounded | `ghostAction` rounded, `dangerLabel` `poppinsButton` + `figmaItemDetailDanger`, `Icons.Trash` 24 ✓ | OK | none — matches well (incl. destructive-on-LEFT layout). |
| E11 | "Cancel" button | Secondary: 1.5px `border/neutral/base` #1d1f23, radius **16**, Poppins Medium 16/24, text #1d1f23 | `outlinedAction` border 1.5 `uacTextBase`, radius `uacButtonCta` (16), `cancelLabel` `poppinsButton` `uacTextBase` ✓ | OK | none — matches. |
| E12 | Button group safe-area / blur | `pb-36` home-indicator inset + `backdrop-blur-4` behind button group | centered modal — no bottom inset, no blur (N/A while centered) | DIVERGENCE? | Only applies if E1 is rebuilt as a bottom sheet. If kept centered, N/A. |

---

## F. Header (Figma `2852:22104`)

The Figma header instance on the Favourite frame is the **branded Home-style
header**: a hamburger `menu` (44×44) on the left + an undo/redo "curve
left / curve right" icon pair (each 44×44, glyph 24) on the right, over a
`background/neutral/subtlest` @90% + `backdrop-blur-7.5` bar, height 107. There
is **no centered "Favourite" title and no back chevron** in this Figma instance.

| # | Element | Figma spec | Code does | Sev | Fix |
|---|---|---|---|---|---|
| F1 | Header content | hamburger + undo/redo curve-icon pair, no title, no back chevron | back chevron (`TopIconButton` + `ChevronLeft`) + centered "Favourite" title + 45×45 spacer | **DIVERGENCE? (structural)** | The Figma header is clearly a copy-pasted Home/canvas header (undo/redo belong to the outfit *canvas*, not a saved-favourites list) — almost certainly placeholder, not the intended Favourite chrome. The code's back-chevron + centered title is the conventional pushed-screen pattern and was adjudicated on-pattern (ItemDetail family) in the craft gate. **Confirm with CEO**: is the back-chevron+title header correct (recommended), or should Favourite carry the hamburger/undo-redo header? Treat as intentional until CEO says otherwise — do NOT "fix" toward the Figma instance without sign-off. |
| F2 | Header bar background | `background/neutral/subtlest` @90% + blur 7.5 (#ffffff @90%) | `figmaItemDetailHeaderBg` (rgba(255,255,255,0.9)) — same @90% white, but **no BlurView** | MINOR | Code matches the @90% white tint token but does not layer a `BlurView` (Home footer does). If the blurred header bar is wanted, add the same `BlurView blurType="light"` treatment used in `HomeViewToggleFooter`. Tied to F1 — resolve header direction first. |
| F3 | Header height | 107 (`uacHeaderHeight`) | `paddingTop: insets.top + 8` + content + `paddingBottom: uacDimension12` (dynamic) | MINOR | Code derives height from safe-area insets rather than the fixed 107. Acceptable on-device; only note if the CEO wants the exact 107 fixed bar. |

---

## G. Footer (Figma `2852:22105`) — matches

| # | Element | Figma spec | Code does | Sev | Fix |
|---|---|---|---|---|---|
| G1 | Footer | grid/collage toggle bar, 390×84, cream capsule + white active cell + blur | shared `HomeViewToggleFooter` (84-tall, blur slab, cream capsule `figmaInsightPillBg`, white active cell + nav shadow) ✓ | OK | none — reused verbatim from Home, consistent. |

---

## Already-correct summary (do not churn)

Header title centering trick, footer reuse, mood-pill tokens (A9/A11/A12/A13),
title typography (A5/A6), date typography (A3/A4), tile aspect + gap + surface
(B1/B2/B3/B5), action-row layout + tokens (C1–C4, C7), dialog Yes/Cancel buttons
(E10/E11), dialog surface + colors (E4/E5/E6), button-group gap (E9), all i18n
copy (D6, C6). These are spec-accurate — leave them.

## Intentional / needs-CEO-confirm (flag, don't auto-fix)

- **A2** date-per-day grouping vs date-per-card
- **B6** rarity pill data-driven (already CEO-confirmed — locked, no action)
- **D1(a)** green-heart empty icon vs neutral Figma glyph
- **E1 / E12** centered confirm modal vs bottom sheet
- **F1 / F2** back-chevron+title header vs Figma's hamburger+undo/redo header (Figma instance looks like placeholder)

---

## Prioritized fix list (hand to mobile-dev verbatim)

**Real fidelity gaps (MAJOR — fix unless CEO confirms divergence):**

1. **`favourite/FavouriteOutfitCard.tsx` (title block, ~`styles.titleBlock` + JSX `titleBlock`)** — Add the two missing hairline dividers: one full-width 1px line above the bold title and one below it (between title and mood chip), `backgroundColor: theme.colors.figmaDivider` (#D1D3D8) or `theme.ds.line`. Width = card content width. *(A1)*
2. **`favourite/RemoveFavouriteDialog.tsx:124` (`styles.body`)** — Change body text from `poppinsBody` (Poppins 16/24) to `theme.typography.aliases.interBodySm` (Inter Regular 14/20). *(E3)*

**Empty-state token/spacing nits (MINOR):**

3. **`favourite/EmptyState.tsx:20`** — Swap `theme.colors.success` (#388E3C) → `theme.ds.color.green` (#039855). *(D1b — pending D1a icon-choice CEO call)*
4. **`favourite/EmptyState.tsx:18-19`** — Icon size 28→**24**. *(D2)*
5. **`favourite/EmptyState.tsx:33` (`container.gap`)** — `theme.spacing.s` (8) → `theme.spacing.uacDimension12` (12). *(D3)*
6. **`favourite/EmptyState.tsx:37` (`caption` style)** — `interBodySm` → `theme.typography.aliases.uacBodyXsRegular` (12/16). *(D4)*
7. **`favourite/EmptyState.tsx:38` (`caption` color)** — `figmaTextSecondary` → `theme.colors.uacTextBase`. *(D5)*

**Dialog spacing nits (MINOR):**

8. **`favourite/RemoveFavouriteDialog.tsx:119` (`card.padding`)** — split to `paddingHorizontal: theme.spacing.m` (16), `paddingVertical: theme.spacing.l` (24). *(E8)*
9. **`favourite/RemoveFavouriteDialog.tsx:127` (`body.marginTop`)** — `theme.spacing.m` (16) → `theme.spacing.s` (8). *(E7)*
10. **`favourite/RemoveFavouriteDialog.tsx:122` (`title` style)** — Figma title is Inter SemiBold **14**/20; code is `interSemiboldSm` (16/20). Add an Inter-SemiBold 14/20 alias and use it, or get CEO OK on 16. *(E2)*

**Optional tile parity (MINOR — confirm intent):**

11. **`favourite/FavouriteOutfitCard.tsx:246` (`tile.borderRadius`)** — if Home/Favourite tile parity is wanted, `theme.borderRadius.s` (4) → `theme.borderRadius.figmaTile` (12). *(B4)*

**Do NOT touch without CEO sign-off (divergences):** A2 (date grouping), D1a
(green heart vs neutral glyph), E1/E12 (modal vs bottom sheet), F1/F2/F3 (header
identity — Figma instance looks like a placeholder Home header). **Locked, no
action:** B6 (rarity pill).
