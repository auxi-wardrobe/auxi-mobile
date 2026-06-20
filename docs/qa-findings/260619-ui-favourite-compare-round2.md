# QA-UI Compare — Favourite screen (round 2 re-verify)

**Date:** 2026-06-19
**Mode:** Compare (3-pass design audit)
**Branch / commit:** `feat/favourite-figma-fidelity` (PR #101) · `4db98054`
**Figma:** file `0nXXMAR4Arf1ZfjtQvtBh0`, section `2852:21222` (Favorite)
- Card `2852:22063` → title block `3539:22168` (Frame 2185)
- Empty state `2852:22230`
- Design-intent note `3632:9988`: "The big title is message in each outfit, chip is the selected feeling that they chosen in the previous step"
**URL:** https://www.figma.com/design/0nXXMAR4Arf1ZfjtQvtBh0/Auxi?node-id=2852-21222

**Files audited:**
- `src/screens/favourite/FavouriteOutfitCard.tsx`
- `src/screens/favourite/EmptyState.tsx`
- `src/screens/FavouriteScreen.tsx`
- `src/screens/favourite/group-by-date.ts`
- `src/theme/theme.ts`

**Why round 2:** prior Compare PASS was on pre-rescan code. The card was
substantially restructured after the designer full-frame rescan + mobile
rewrite (Home caption row dropped; centered title-hero added; tile radius,
divider color, empty-glyph color retoned). This re-verifies the new structure.

---

## Pre-flight

| Check | Result |
|---|---|
| `./scripts/mcp-doctor.sh` | EXIT 0 — sim iPhone 16 Pro booted, WDA :8100 up, mobile-mcp 0.0.56 (pinned) |
| Figma MCP (`get_metadata` / `get_design_context` / `get_variable_defs`) | available, all reads succeeded |
| Live sim capture | composited successfully (degrade state, see Pass 3) |

---

## CRITICAL — staged-data context (NOT a Figma mismatch)

The per-outfit **message** (`title`) and **feeling chip** (`mood_tags`) only
populate after backend **PR #107** deploys AND outfits are re-saved. On a live
render today, existing favourites show the **CEO-approved degrade state**: date
+ tiles + action row, NO message line, NO dividers, NO mood chip, NO canned
caption. This audit judges the **structure** of the card vs Figma and the
**wiring** that renders the hero when `title` is present — NOT the absence of
live message text. Live message/chip visual fidelity is deferred to a follow-up
verify once PR #107 is deployed and outfits re-saved.

---

## Pass 1 + 2 — code vs Figma (per-item)

### Title-hero block (Figma `3539:22168`)

| Figma spec | Code (`file:line`) | Match |
|---|---|---|
| Container: flex col, `items-center`, `gap 4px`, `py 8px` | `titleBlock` `FavouriteOutfitCard.tsx:229-233` — `alignItems:'center'`, `gap: spacing.xs (4)`, `paddingVertical: spacing.s (8)` | ✅ |
| Order: date → divider → title → divider → chip | JSX `FavouriteOutfitCard.tsx:128-157` — date, then (divider, title, divider) under `title` guard, then mood pill | ✅ |
| Date "6 May" — Inter Regular 12/16 (`body/xs`), `text/neutral/base #1d1f23`, center | `date` `:236-240` → `uacBodyXsRegular` (Inter-Regular 12/16, theme.ts:288-292) + `uacTextBase #1d1f23` + `textAlign:'center'`; label from `formatDateLabel` "DD Mon" (group-by-date.ts:27-31) | ✅ |
| Divider (S) — 1px hairline, `border/neutral/subtle_300 #f2f4f7` | `titleDivider` `:244-248` → `height:1`, `figmaDividerSubtle #f2f4f7` (theme.ts:48), `alignSelf:'stretch'` | ✅ |
| Title "Clean. Ready for today" — Poppins SemiBold 24/32 (`heading/H4`), `text/neutral/base #1d1f23`, center | `title` `:250-254` → `poppinsH4SemiBold` (Poppins-SemiBold 24/32, theme.ts:253-257) + `uacTextBase #1d1f23` + center | ✅ |
| Chip bg `background/primary/subtle_100 #e0d2c4`, h24, px12, radius `3xl 24` | `moodPill` `:257-264` → `figmaInsightPillBg #e0d2c4` (theme.ts:28), `height:24`, `paddingHorizontal: uacDimension12`, `borderRadius: round (9999 ⊇ 24 fully-rounded)` | ✅ |
| Chip label — Inter Regular 10/12 (`body/xxs`), `text/primary/bold_700 #070707` | `moodPillText` `:266-270` → `interCaptionXxs` (Inter-Regular 10/12, theme.ts:307-311) + `figmaTextDark #070707` (theme.ts:69) | ✅ |
| Hero renders ONLY when `title` present; dividers flank title only | `:135-149` — divider/title/divider wrapped in `{title ? (…) : null}` | ✅ wiring correct |

### Round-2 specific changes

| Change to verify | Figma | Code (`file:line`) | Match |
|---|---|---|---|
| Home caption / "why this" bulb row REMOVED | card `2852:22063` has NO bulb/caption row (bulb row lives on `why this` screen `3394:14336`, not the favourite card) | No `OutfitCardCaption` import/render; only explanatory comments `:53-58`. grep confirms absence | ✅ removed |
| Centered title-hero structure | `3539:22168` block layout | matches per the title-hero table above | ✅ |
| Tile radius 12 (`figmaTile`) | tile `2852:22075` 3:4 image | `tile.borderRadius: figmaTile (12)` `:283` + theme.ts:348 | ✅ (was 4) |
| Divider color `#f2f4f7` (`figmaDividerSubtle`) | divider `border/neutral/subtle_300 #f2f4f7` | `figmaDividerSubtle:'#f2f4f7'` theme.ts:48 | ✅ (was #D1D3D8) |
| Empty glyph color `#070707` (`figmaTextDark`) | empty icon `icon/primary/bold_700` | `EmptyState.tsx:22` `color: figmaTextDark #070707` (theme.ts:69) | ✅ |
| Header hamburger → drawer | — | CEO-confirmed — **NOT a finding** | n/a |

### Empty state (Figma `2852:22230`)

| Figma spec | Code (`file:line`) | Match |
|---|---|---|
| Container: flex col, `items-center`, `gap 12px`, `px 16` | `EmptyState.tsx:31-37` — center, `gap: uacDimension12`, `paddingHorizontal: spacing.m` | ✅ |
| 24×24 icon glyph above caption | `:19-24` `IconHeartFilled` 24×24 | ✅ |
| Glyph `icon/primary/bold_700 #070707` (neutral, NOT green save-heart) | `:22` `figmaTextDark #070707` | ✅ |
| Caption — Inter Regular 12/16 (`body/xs`), `text/neutral/base #1d1f23`, center | `:38-42` `uacBodyXsRegular` + `uacTextBase #1d1f23` + center | ✅ |
| Copy "Tap 'Wear this' button to add an outfit" | `t('favourite.empty_body')` `:25` — i18n key | ✅ (copy verify in i18n) |

### Degrade-path cleanliness (CEO-approved)

| Requirement | Code (`file:line`) | Match |
|---|---|---|
| When `title` empty → NO title line AND NO flanking dividers | `:135-149` divider/title/divider all inside `{title ? …}` | ✅ |
| When `title` empty → NO canned caption substituted | no fallback string anywhere in card; comment `:56-58` documents intent | ✅ clean |
| Title block still shows date + chip (if present) when no title | `:128` outer guard `dateLabel || title || moodTagLabel`; date `:130-134` and pill `:150-156` independent of `title` | ✅ |

### Intentional divergences (documented, NOT findings)

- **Rarity badge data-driven** — Figma draws a "common" pill on every tile
  (placeholder). Code renders it only for `is_common_item === true`
  (`:84-90`). CEO-confirmed 2026-06-12. Correct.
- **Collage view (3-per-row)** reuses the same 3:4 tiles in a denser flow —
  collage not separately specced for favourite tiles (extraction Open-Q),
  mirrors Home footer pending-alt-view behaviour. `:120`.

---

## Pass 3 — live sim render

Screenshot: `auxi/docs/qa-findings/screenshots/2026-06-19/qa-ui-favourite.png`

Live render confirms the CEO-approved **degrade state** on existing favourites:
- Header hamburger (drawer) top-left — confirmed, not a finding
- Date "19 Jun" rendered top-center as first line of the title block
  (matches `formatDateLabel` "DD Mon" + Figma date position)
- NO message line, NO dividers, NO mood chip — staged behind PR #107 (expected)
- NO bulb/"why this" caption row — round-2 removal confirmed in the rendered UI
- 2-column 3:4 tiles with visibly rounded corners (radius 12, not old near-square 4)
- Action row: ⊖ remove (red) + "Self visualization" + purple sparkle icon
- Footer: grid/collage toggle pill on blurred bar

The live message-hero + chip cannot be verified today (no persisted `title`/
`mood_tags` until PR #107 deploys + outfits re-saved). The code is correctly
WIRED to render the centered hero when `title` is present (verified Pass 1/2),
and the degrade is clean. Per task instruction, the audit is not failed on the
missing populated capture — Pass 1/2 code-vs-Figma is sufficient.

---

## Findings

| # | Sev | Finding |
|---|---|---|
| — | — | None. All audited items match Figma. |

0 findings (H:0 / M:0 / L:0).

---

## Verdict

**PASS.**

Round-2 structural rewrite matches Figma card `2852:22063` (title block
`3539:22168`) and empty state `2852:22230`. The Home caption/"why this" row is
removed; the centered date→divider→title→divider→chip hero is built to spec
with correct tokens; tile radius 12, divider `#f2f4f7`, and empty glyph
`#070707` all confirmed. The hero is correctly wired to render only when
`title` is present, and the degrade path is clean (no orphan dividers, no
canned caption).

**Explicitly staged:** live per-outfit message (`title`) and feeling chip
(`mood_tags`) visual fidelity is deferred behind **backend PR #107 deploy +
outfit re-save**. A follow-up Compare on the populated state should re-verify
the live hero once data lands. This PASS covers structure + wiring + degrade,
which is everything verifiable at the current commit.

---

**Status:** DONE
**Summary:** Favourite round-2 Compare = PASS · 0 findings · structure/tokens/wiring match Figma card 2852:22063 + empty 2852:22230; live message-hero + chip staged behind backend PR #107 deploy + re-save.
**Concerns/Blockers:** Live populated-state fidelity (message title + feeling chip) un-verifiable until PR #107 deploys and outfits are re-saved — schedule a follow-up Compare then.
