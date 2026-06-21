# Favourite screen — Figma RE-SCAN (CEO rejected: "chả thấy giống")

**Date**: 2026-06-19
**Author**: designer (full-frame rescan, requested by CEO after rejection)
**Figma**: `0nXXMAR4Arf1ZfjtQvtBh0` · **section** `Favorite` node **2852:21222**
  (NOT just the phone screen — the section is the parent that carries the CEO's notes)
**Build**: branch `feat/favourite-figma-fidelity` · commit `99fd2cfd` · PR #101
**Code in scope**: `src/screens/FavouriteScreen.tsx`,
  `src/screens/favourite/{FavouriteOutfitCard,EmptyState,RemoveFavouriteDialog}.tsx`,
  shared `components/features/{OutfitCardCaption,HomeViewToggleFooter}.tsx`,
  `src/services/favouriteService.ts`, `src/translations/en-EN.json`.
**MCP pre-flight**: `mcp-doctor` exit 0 · sim iPhone 16 Pro healthy · Figma
  `get_variable_defs` available. **Live render captured** (app deep-linked into
  the populated Favourite screen this session — unlike the prior pass which only
  saw the logged-out Welcome screen).

**Reference shots** (`docs/design-reviews/screenshots/260619/`):
  `figma-favourite-section-wide.png` (whole canvas incl. CEO notes),
  `figma-favourite-card-tall.png`, `figma-favourite-header.png`,
  `figma-favourite-empty.png`, `designer-favourite-live.png` (live populated),
  `designer-favourite-remove-sheet.png` (live, scrolled).

---

## 1. CEO NOTES CAPTURED (the prior pass ignored these entirely)

These are **design-tree TEXT layers** placed beside the screens inside section
`2852:21222` (sticky-note frames). They are NOT comment-pins — the MCP reads
them fine. The prior diff stopped at the phone-screen node `2852:21222`'s
immediate children and never enumerated the section's sibling note frames.
Quoted **verbatim** from the layer text:

| Note | Figma node | Verbatim text | Design intent for THIS screen |
|---|---|---|---|
| **note** | `3628:8289` (x≈106,y≈1089) | "Use click WEAR THIS an outfit. This outfit will appear in the favorite collection. The heart icon will have a small badge to let user know about it" | Favourites are populated by the **Wear-this** action; a **badge on the heart icon** signals a new save. (Source flow context — not a Favourite-screen layout rule.) |
| **note 2** | `3632:8983` (x≈558,y≈1089) | "A popup to ask user what mood the suggestion is. User can choose not to show this pop up but we will ask after 3 outfits" | The mood-capture popup (the `why this`→`noti` mood dialog). Feeds the **chip**. |
| **note 1** | `3628:8298` (x≈1010,y≈1148) | "In the favourite list, user still switch between Grid and Collage mode. User can remove an outfit from the list. User can use feature Self visualization which will be written in other UAC" | Favourite list must support **Grid/Collage toggle**, **remove**, and **Self visualization**. (All three present in code.) |
| **note 3** | `3632:9988` (x≈1924,y≈97) | **"The big title is message in each outfit, chip is the selected feeling that they chosen in the previous step"** | **THE KEY NOTE.** The big bold title is a **per-outfit MESSAGE** (e.g. "Clean. Ready for today", "Easy lines" — distinct per card). The **chip is the user's selected feeling** from the mood step (e.g. "Confident"). |

> **note 3 is the design intent the implementation violates.** It tells us the
> centered bold title is the *signature* of the card — a unique generated
> message per outfit — and the tan chip under it is the saved feeling. On the
> live screen neither reliably appears (see §2). That is the core of
> "chả thấy giống."

Also present in the section (not notes, but context the prior pass missed):
- `3394:14328` **"why this"** screen — the bulb/idea reasoning row + mood `noti`
  dialog live HERE, on a *separate* screen, **not on the favourite card**.
- `3628:8166` **"Home - wearthis"** — the Home source screen.
- The note authorship footer on every card reads `Kenechukwu Nwafor` —
  these are the **designer's** spec callouts, authoritative.

---

## 2. WHAT THE PRIOR DIFF MISSED — the gaps that explain "chả thấy giống"

The prior diff (`260619-favourite-figma-diff.md`) was a token/spacing audit of
the phone-screen children. mobile-dev then fixed most of it (dividers, per-card
date, bottom-sheet dialog, neutral empty glyph, `interBodySm` dialog body,
`interSemiboldXsSm` title). **All those fixes are real and verified done below.**
But the diff missed the *structural & semantic* mismatches that dominate the
live screen:

### MISS-1 (BLOCKER, cross-screen) — the Home caption pill was imported onto the favourite card; Figma has NO caption row here
The favourite card renders `<OutfitCardCaption>` (`FavouriteOutfitCard.tsx:155`)
— the **Home Grid-View title row** (left-aligned tan pill + 40×40 bulb/idea
pill, Figma Home `Frame 2104`). **The Figma favourite card `2852:22063` has no
such row.** Its title block is: date → divider → centered bold title → divider →
chip → grid → action row. The bulb/idea reasoning belongs to the *separate*
`why this` screen (`3394:14328`), never the favourite card. On the live screen
this left-aligned pill is the **most prominent element of every card** and reads
nothing like Figma's centered title block.

### MISS-2 (BLOCKER, hierarchy/recommendation) — the canned fallback "Clean. Ready for today" is showing on EVERY card
Because `favourite.title` is empty on the live records, the centered title block
never renders, and `OutfitCardCaption` falls back to
`t('outfitActions.default_caption')` = **"Clean. Ready for today"**
(`en-EN.json:550`). Live shows that **identical phrase on all 18 cards**
(`designer-favourite-live.png` + element dump). Figma per note 3 wants a
**distinct message per outfit** ("Clean. Ready for today", "Easy lines", …).
A wall of identical canned captions is the single biggest "doesn't look like
Figma" signal. *(Backend must populate `title`; client must stop substituting
the Home caption — see §4.)*

### MISS-3 (MAJOR, recommendation) — the mood chip is absent on almost every card
Figma draws a tan **"Confident"** chip under the title on every card (note 3:
"chip is the selected feeling"). Live: only 2 of 18 cards show a chip
("Feels like me"); the rest have none because `mood_tags` is empty. The
signature feeling-chip is effectively missing from the screen.

### MISS-4 (MAJOR, design-system, header) — the header is wrong vs the ACTUAL Figma instance, AND the prior diff mis-described it
The prior diff F1 said the Figma header is "hamburger + undo/redo". **Wrong.**
The rendered header instance `2852:22104` (`figma-favourite-header.png`) is a
**back-chevron (left) + undo + redo curve-arrows (right)** — no hamburger, no
title. The live code renders a **hamburger only** (`FavouriteScreen.tsx:225`).
So the code matches neither the prior claim nor the actual Figma. The undo/redo
are clearly canvas controls copy-pasted onto this frame (they make no sense on a
saved-list). → **ESCALATE to CEO**: confirm the intended Favourite header
(hamburger-to-drawer is the sane choice; the Figma instance looks like a
placeholder). Do not silently keep diverging.

### MISS-5 (MAJOR, visual hierarchy) — title-block alignment reads left, not centered
Even when present, the live title row reads **left-aligned** (the caption pill
is left, bulb floated right) where Figma is a **centered column**. The centered
bold message flanked by full-width hairlines is the design's whole identity;
live loses it.

### MISS-6 (MINOR) — divider color too dark
Figma divider component (`3646:10000`/`3646:9997`) = `border/neutral/subtle_300`
**#f2f4f7** (barely-there). Code `titleDivider` uses `figmaDivider` **#D1D3D8**
(noticeably darker). The prior diff guessed #D1D3D8; the variable says #f2f4f7.

### MISS-7 (MINOR) — empty-glyph color token off
Figma empty heart = `icon/primary/bold_700` **#070707** = `figmaTextDark`.
Code uses `uacTextBase` **#1d1f23** (`EmptyState.tsx:22`). Near-black, but the
exact token is `figmaTextDark` / `ds.color.black`.

---

## 3. FULL RE-AUDIT TABLE

Severity = release-craft (BLOCKER = system/structure violation; MAJOR = reads
wrong; MINOR = polish; ESCALATE = CEO call). ✓DONE = prior-diff fix verified in
current code.

### A. Card title block — the signature treatment (Figma `3539:22168`, note 3)

| # | Figma spec | Current code (`file:line`) | Sev | Fix |
|---|---|---|---|---|
| A1 | Bold title = **per-outfit MESSAGE**, centered Poppins SemiBold 24/32, distinct per card | `FavouriteOutfitCard.tsx:105,130-140` renders `favourite.title`; live is empty → title block omitted | **BLOCKER** (recommendation/data) | Backend must populate `favourite.title` with the per-outfit message. Client: title must be the primary line, always present. *(MISS-2)* |
| A2 | Two full-width hairlines flank the title | `:132-142` `titleDivider` ✓ rendered | ✓DONE | Color too dark — see A6. |
| A3 | Tan chip below title = **selected feeling** (e.g. "Confident"), on every card | `:108-109,145-151` renders `mood_tags[0]`; live mostly empty | **MAJOR** | Backend populate `mood_tags`; until then chip is silently absent. *(MISS-3)* |
| A4 | Column is **center-aligned** | `titleBlock alignItems:'center'`, `title textAlign:'center'` ✓ — BUT caption pill (A8) is left-aligned and dominates | **MAJOR** | Remove the caption row (A8); centered title block becomes the visible hierarchy. *(MISS-5)* |
| A5 | Date Inter Regular 12/16, centered, first line | `:233-237` `uacBodyXsRegular` centered ✓ | ✓DONE | none. |
| A6 | Divider color `border/neutral/subtle_300` **#f2f4f7** | `:244` `figmaDivider` **#D1D3D8** | **MINOR** | Swap to an #f2f4f7 token (add `figmaDividerSubtle`/use `ds.line` tier). *(MISS-6)* |
| A7 | Title color #1d1f23 / Poppins H4 SemiBold | `:247-251` `poppinsH4SemiBold` + `uacTextBase` ✓ | ✓DONE | none. |
| A8 | **NO bulb/caption "why this" row on the favourite card** | `FavouriteOutfitCard.tsx:155` renders `<OutfitCardCaption>` (Home Grid row) | **BLOCKER** (cross-screen) | **Remove `OutfitCardCaption` from the favourite card.** It belongs to Home + the `why this` screen, not here. Its `default_caption` fallback is what spams "Clean. Ready for today". *(MISS-1, MISS-2)* |
| A9 | Chip bg #e0d2c4 / radius 24 / Inter 10/12 / #070707 | `:254-267` `figmaInsightPillBg`, round, `interCaptionXxs`, `figmaTextDark` ✓ | ✓DONE | none. |

### B. Tile grid (Figma `2852:22073`/`2852:22074`)

| # | Figma spec | Current code | Sev | Fix |
|---|---|---|---|---|
| B1 | 2-col, 3:4 tiles, 4px gap, warm #f2efec | `:268-281` perRow 2, aspect 3/4, gap `xs`(4), `figmaCardSurface` ✓ | ✓DONE | none. |
| B2 | Tile radius (Home parity) | `:278` `borderRadius.s` (4); Home outfit tiles use 12 | **MINOR** | If Home/Favourite tile parity wanted, bump to `borderRadius.figmaTile` (12). Live tiles look hard-cornered vs Home. Confirm. |
| B3 | Rarity "common" pill drawn on every tile | `:78-84` data-driven (only `is_common_item`) | **DIVERGENCE (CEO-locked 2026-06-12)** | Do NOT change. Verified live: renders on real common items only. |
| B4 | Tiles sit in a tight grid | Live: large vertical whitespace between tile rows | **MINOR** | Inter-row gap is fine in code (`xs`); the apparent gaps are images with transparent backgrounds on the warm tile — cosmetic, no code change. Note only. |

### C. Action row (Figma `3539:22203`)

| # | Figma spec | Current code | Sev | Fix |
|---|---|---|---|---|
| C1 | ⊖ remove (56×56, glyph 24, danger) LEFT + "Self visualization" (Poppins Medium 16/24 + sparkle 24) | `FavouriteOutfitCard.tsx:181-215` matches | ✓DONE | none. |
| C2 | row gap 24 | `:316` `spacing.l`(24) ✓ | ✓DONE | none. |
| C3 | sparkle baked gradient asset | `IconSparkle` flat `figmaAiSparkle` | **MINOR** | Acceptable flatten; confirm if true gradient wanted. |

### D. Empty state (Figma `2852:22228` → `2852:22230`)

| # | Figma spec | Current code | Sev | Fix |
|---|---|---|---|---|
| D1 | centered neutral heart glyph 24×24, `icon/primary/bold_700` **#070707** | `EmptyState.tsx:19-24` 24×24 ✓, color `uacTextBase` #1d1f23 | **MINOR** | Swap color → `figmaTextDark`/`ds.color.black` (#070707). *(MISS-7)* |
| D2 | gap-12 icon→caption | `:35` `uacDimension12`(12) ✓ | ✓DONE | none. |
| D3 | caption Inter Regular 12/16, #1d1f23 | `:38-42` `uacBodyXsRegular`, `uacTextBase` ✓ | ✓DONE | none. |
| D4 | footer present | screen renders `HomeViewToggleFooter` ✓ | ✓DONE | none. |
| D5 | copy `Tap "Wear this" button to add an outfit` | `empty_body` ✓ | ✓DONE | none. |

### E. Remove dialog (Figma `3539:23335` → `3539:23380`)

| # | Figma spec | Current code | Sev | Fix |
|---|---|---|---|---|
| E1 | **bottom sheet**: top corners r16 only, button group separate slab w/ backdrop-blur-4 + pb safe-area, slide-up, dim scrim | `RemoveFavouriteDialog.tsx` full bottom-sheet w/ BlurView + `insets.bottom` + asymmetric motion tokens + reduce-motion branch | ✓DONE | Verified — prior E1 divergence is now built correctly. On-system. |
| E2 | Title Inter SemiBold 14/20 | `:220` `interSemiboldXsSm` ✓ | ✓DONE | none. |
| E3 | Body Inter Regular 14/20 | `:225` `interBodySm` ✓ | ✓DONE | none (prior MAJOR fixed). |
| E4 | "Yes 🗑" red ghost LEFT / "Cancel" outlined RIGHT | `:148-188` matches | ✓DONE | none. |
| E5 | panel px16/py24, title→body gap 8 | `:215-216` px`m`/py`l` ✓, `:227` `marginTop spacing.s`(8) ✓ | ✓DONE | none. |

### F. Header (Figma `2852:22104`)

| # | Figma spec | Current code | Sev | Fix |
|---|---|---|---|---|
| F1 | Figma instance = back-chevron + undo/redo curve-arrows, no title (looks like a placeholder canvas header) | `FavouriteScreen.tsx:225-232` hamburger-only → drawer | **ESCALATE** | CEO confirm header. Code neither matches Figma nor the prior diff's wrong description. Hamburger-to-drawer is the sane pattern; Figma instance reads placeholder. *(MISS-4)* |
| F2 | @90% white + blur-7.5 bar | `:210-219` BlurView + `figmaItemDetailHeaderBg` tint ✓ | ✓DONE | none (blur added since prior pass). |

### G. Footer — matches (✓DONE, shared `HomeViewToggleFooter`, verified live: Grid/Collage toggle present — satisfies note 1).

---

## 4. PRIORITIZED FIX LIST (hand to mobile-dev verbatim)

**BLOCKERS — these are what make it "chả thấy giống". Fix before re-review:**

1. **Remove the Home caption row from the favourite card.**
   `FavouriteOutfitCard.tsx:155` — delete the `<OutfitCardCaption … />` render.
   The Figma favourite card (`2852:22063`) has NO bulb/caption "why this" row; it
   belongs to Home + the separate `why this` screen. This row's
   `default_caption` fallback is what spams the identical left-aligned
   "Clean. Ready for today" pill on every card. *(MISS-1)*

2. **Make the centered title block the always-present primary line.**
   `FavouriteOutfitCard.tsx:105,123-153` — the bold centered message title +
   flanking hairlines + tan feeling-chip must be the card's hero treatment
   (Figma `3539:22168`, note 3). It must NOT be gated such that an empty
   `favourite.title` leaves the card with no title at all. *(MISS-2, MISS-5)*

3. **Backend dependency (route to backend-dev via tech-lead):** `GET /favorites`
   must return a **per-outfit `title` message** and **`mood_tags`** (the saved
   feeling) for each favourite. Today both are empty on live records, so the
   signature title+chip never render. Until the contract delivers these, the
   screen cannot match Figma. *(MISS-2, MISS-3)*

**MAJOR — fix or ESCALATE:**

4. **ESCALATE — header identity (F1/MISS-4):** CEO confirm whether Favourite
   keeps the hamburger→drawer header (recommended) or adopts something from the
   Figma instance (back-chevron+undo/redo, which looks like a placeholder).
   Do not change without sign-off.

5. **Center alignment (A4/MISS-5):** once the caption row is gone (fix 1), the
   centered title block reads correctly. Verify centering survives.

**MINOR — polish (do NOT block, log for follow-up):**

6. `FavouriteOutfitCard.tsx:244` `titleDivider` color `figmaDivider` (#D1D3D8) →
   #f2f4f7 (`border/neutral/subtle_300`; add `figmaDividerSubtle` or use `ds.line`). *(A6)*
7. `EmptyState.tsx:22` glyph color `uacTextBase` (#1d1f23) → `figmaTextDark`
   /`ds.color.black` (#070707). *(D1)*
8. `FavouriteOutfitCard.tsx:278` tile radius `borderRadius.s`(4) → `figmaTile`(12)
   IF Home/Favourite tile parity is wanted — confirm. *(B2)*

**DIVERGENCES — do NOT touch:** B3 rarity pill (CEO-locked). E1 bottom-sheet,
E2/E3 dialog type, neutral empty glyph, per-card date+dividers — all prior-pass
fixes **verified done and correct**.

---

## Intentional vs bug

- **BUG (regression vs Figma):** caption-row import (fix 1), missing/empty title
  & chip (fix 2/3), divider color (6), empty glyph token (7).
- **DATA/CONTRACT:** title + mood_tags absent from API (fix 3) — backend.
- **ESCALATE (taste/placeholder):** header identity (4), tile radius parity (8).
- **INTENTIONAL (locked):** rarity pill data-driven (B3); bottom-sheet dialog;
  hamburger drawer entry (pending CEO confirm in 4).

---

## Verdict

**FAIL** — 2 open BLOCKERs (caption-row import; missing hero title/chip, partly
backend-blocked) + 2 open MAJORs (1 ESCALATE header, 1 alignment dependent on
the caption fix). These are exactly the structural/semantic gaps the prior
single-node token diff could not see and that drive the CEO's "chả thấy giống".
PR #101 is blocked until fixes 1–2 land (+ backend fix 3 to fully match note 3)
and the header ESCALATE (4) is resolved by the CEO; then re-run lenses 1/3/6/8
on the favourite card.

## Unresolved questions for CEO

1. **Header (F1):** hamburger→drawer (current) or the Figma back-chevron+undo/redo
   instance? The Figma instance looks like a copy-pasted canvas header.
2. **Title source (note 3):** confirm the per-outfit "message" is backend-generated
   (the V05 `reasoning_human`/headline?) and should be DISTINCT per outfit — not
   the canned "Clean. Ready for today".
3. **Tile radius (B2):** 4 (current, square-ish) or 12 (Home parity)?
