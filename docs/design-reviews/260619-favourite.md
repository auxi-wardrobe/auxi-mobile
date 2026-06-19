# Design Review — Favourite screen

**Date**: 2026-06-19
**Reviewer**: designer (step 6.5 hard gate)
**Build**: branch `feat/designer-role` · auxi submodule HEAD
**Screens in scope**: Favourite (`FavouriteScreen` + `favourite/*` + composed
`HomeViewToggleFooter`, `OutfitCardCaption`)
**Device**: iPhone 16 Pro sim (18.1) — warm Metro JS, app renders cleanly
**Live render**: PARTIAL. mcp-doctor exit 0, sim healthy, app warm (Welcome +
push-drawer rendered without redbox). The Favourite screen itself is
**session-gated** and could not be reached on the read-only screenshot tier
(no login credentials / no typing tool) — tapping "My Favourite" bounced to the
auth-root Welcome screen (logged-out session). Per dispatch, the gate is NOT
blocked on the live render; the 8 lenses are fully determinable from source for
this screen. Screenshots captured: `screenshots/2026-06-19/designer-favourite-entry.png`
(push-drawer), `designer-favourite.png` (auth bounce — evidences the gating, not
the Favourite UI).

---

## Verdict: PASS

No open BLOCKER or MAJOR findings. Token tiers, motion (delegated to shared
primitives + a correct reduce-motion branch on the snap interaction), color
semantics, header/footer/layout, cross-screen consistency, and state coverage
are all on-system. Two MINOR craft items logged for follow-up (do not block).
One MINOR is routed to mobile-dev; one item is a documented, CEO-confirmed
intentional divergence (no action).

Lint backstop: `scripts/auxi-lint-tokens.sh` — **zero** violations in
`FavouriteScreen.tsx`, `favourite/*`, `HomeViewToggleFooter.tsx`,
`OutfitCardCaption.tsx`. (The 32 repo-wide violations are all pre-existing legacy
files — ItemDetail, HomeScreen, ContextChipsModal, etc. — none in scope.)

Findings count: **N=3 (B:0 / Maj:0 / Min:2 / note:1)**.

---

## Lens 1 — Design-system compliance · PASS

- No raw hex, no raw `fontFamily` string, no raw `zIndex` anywhere in scope
  (greps clean; lint clean).
- Spacing is on the 4px grid via named tokens (`m`/`l`/`xl`/`xs`/`s` +
  `uacDimension12`). `headerSpacer` 45×45 and `removeButton`/`selfVizButton`
  56-tall match the established TopIconButton / 56-control footprint.
- Radius via `theme.borderRadius.*` tokens; typography via
  `theme.typography.aliases.*`. No bespoke component — reuses `TopIconButton`,
  `OutfitCardCaption`, `HomeViewToggleFooter`, `MacgieLoader`.
- See MINOR #1 below for the `figma*`/`uac*` legacy-alias tier (on-system value,
  off-canonical tier) — that is the documented MINOR class, not a BLOCKER.

## Lens 2 — Motion & interaction · PASS

- No hardcoded duration / easing / scale / spring literal in scope (grep clean).
- The one custom motion on this screen is the AU-347 **snap-to-one-outfit**
  scroll (`snapToOffsets` + `disableIntervalMomentum` + `decelerationRate:'fast'`).
  It correctly gates on `useReducedMotion` (`FavouriteScreen.tsx:163-165`): under
  Reduce Motion, `snapToOffsets` is `undefined` so the list free-scrolls and the
  user is never forced through large snap travel. This satisfies
  `motion-rules.md` §4 (reduce-motion branch present on a movement interaction).
- Press feedback is delegated to the shared `TopIconButton` primitive
  (`activeOpacity 0.82`) and `TouchableOpacity activeOpacity` on the card action
  row / dialog — the app-wide convention (same as ItemDetail and every other
  back-screen). See MINOR #2: these are the lighter `activeOpacity` pattern, not
  the `scale.press`+`spring.standard` micro-interaction that `PillButton` uses;
  consistent across the app, so logged as polish, not a finding against this
  screen specifically.
- Remove dialog uses `Modal animationType="fade"` (native fade). Acceptable for a
  confirm dialog; not the drawer open/close asymmetry case, so the
  house-signature timing rule doesn't apply here.

## Lens 3 — Visual hierarchy · PASS

- Card reads top→bottom with a clear, intentional order: date group header →
  bold outfit title (`poppinsH4SemiBold`, centered) → filled mood/vibe pill →
  caption (the "why this" reasoning) → 2-col 3:4 tile grid → action row
  (⊖ remove + "Self visualization"). The outfit itself (the tiles) is the visual
  anchor; the reasoning sits directly above it. Next action (self-visualization)
  is the prominent right-weighted control in the action row.
- Date is a per-day group header above the card (not repeated inside), which
  keeps each card scannable. Grouping is coherent.

## Lens 4 — Color & emphasis · PASS (1 MINOR)

- Destructive uses the danger token consistently — `figmaItemDetailDanger`
  (`#c0392b`) on both the card ⊖ remove icon and the dialog "Yes 🗑" ghost label
  + trash icon. No raw `red`/`#ff0000`. Semantically correct per
  `color-rules.md` §2.
- AI-sparkle accent (`figmaAiSparkle` `#822be6`) on the self-visualization icon —
  reserved, intentional accent. Mood pill / caption pill / tag use the documented
  surface tokens (`figmaInsightPillBg`, `figmaCaptionPillBg`, `figmaCardTag`).
- See MINOR #1 (empty-state heart color) for the one color-tier nit.

## Lens 5 — Component state coverage · PASS

- **loading** → `MacgieLoader` (`favourite-loading`). **error** → localized
  `favourite.load_error` (`favourite-error`). **empty** → `FavouriteEmptyState`
  (`favourite-empty`, heart + "Tap 'Wear this'…" caption). **default/loaded** →
  grouped card list. Removal has a **pending/disabled** state — dialog buttons
  carry `disabledAction` (opacity 0.55) while `isBusy`, and `onSettled` clears
  `pendingRemovalId`. Selected-view state on the footer toggle (grid/collage)
  has its active-cell treatment. Full coverage — no missing required state.

## Lens 6 — Cross-screen consistency · PASS

- **Header**: hand-rolled (`styles.header` + `TopIconButton` + `ChevronLeft`),
  NOT the canonical `<Header>`. This is on-pattern, not a violation: the closest
  sibling **ItemDetailScreen** uses the identical hand-rolled pattern (same
  `figmaItemDetailHeaderBg` background token, same `uacDimension12` padding, same
  `TopIconButton` + chevron). The canonical `<Header>` is reserved for top-level
  branded screens (Wardrobe/Database — Playfair "Auxi" title + hamburger). A
  back-navigated detail screen with a centered short title (Inter Medium Sm) is
  the ItemDetail family, which FavouriteScreen joins consistently. Title centering
  via the 45×45 invisible `headerSpacer` matches the documented Figma trailing-
  slot trick.
- **Footer**: reuses the shared `HomeViewToggleFooter` verbatim — same
  grid/collage toggle, blur slab, cream capsule, active cell as Home. Identical
  behavior across screens (passes the "users don't relearn the pattern" test).
- **Safe-area**: header respects `insets.top` (`paddingTop: insets.top + 8`).
  Bottom — the footer is a fixed-height (84) sibling rendered after the
  ScrollView and the `scrollContent` carries `paddingBottom: xl`; the toggle
  footer is the bottom-anchored chrome (same as Home), so the home-indicator
  clearance is inherited from the shared footer, not hardcoded here. No
  safe-area collision introduced by this screen.
- Cards mirror the Home grid tile look (3:4 tiles, same surface tokens) by
  design — reads as the same family.

## Lens 7 — Native feel · PASS

- The AU-347 snap-scroll (`disableIntervalMomentum` + `decelerationRate:'fast'`)
  is a native iOS paging idiom, applied to settle on one outfit at a time —
  reads as intentional, not web-like. Disabled under Reduce Motion so it never
  traps the user.
- Native `Modal` for the confirm dialog, native `ScrollView`, native touch
  feedback via `activeOpacity`. No hover dependency, no web-style affordance.

## Lens 8 — Recommendation experience · PASS

- Each saved outfit re-presents its curation context: the bold title, the
  mood/vibe pill, and the caption (`outfit_context.reasoning_human`) sit directly
  above the garment tiles — the reasoning stays attached to the outfit it
  explains (not buried, not disconnected). Self-visualization ("See this on me")
  threads the saved outfit's items + styling note forward into the try-on flow,
  preserving the curated narrative. The favorite-removal flow is a deliberate,
  confirm-gated destructive action (dialog), which protects trust. Reads as
  prepared and curated.

## Journey continuity · PASS

- **Where was I?** Reached from the push-drawer "My Favourite" entry; back chevron
  returns. **Where am I?** Centered "Favourites" title + date-grouped saved
  outfits. **What next?** Per card: re-visualize on me, or remove. Empty state
  tells a new user exactly how to populate it ("Tap 'Wear this' button to add an
  outfit"). All three questions answer naturally.

---

## Findings

### MINOR #1 — Empty-state heart uses `theme.colors.success` (`#388E3C`), not a `ds.color` token

**Severity**: MINOR
**Lens**: 1 design-system / 4 color
**Rule doc**: design-system.md §1 (canonical `ds.*` tier) · color-rules.md §1
**Screen**: Favourite (empty state)

#### What's off
`FavouriteEmptyState` colors the heart glyph with `theme.colors.success`
(`#388E3C` — a Material-style green) rather than a `ds.color` semantic token. The
`ds.color` palette's confirm/positive green is `ds.color.green` (`#039855`,
alias `figmaToggleOn`); `success` (`#388E3C`) is a separate legacy color outside
the `ds.color` set. On-system *intent* (a positive/green heart) via an
off-canonical *tier* — exactly the documented MINOR class (on-system value, wrong
token tier). Not a BLOCKER (it is a defined theme token, not a raw hex — lint
passes).

#### Evidence
- Source: `auxi/src/screens/favourite/EmptyState.tsx:20` (`color={theme.colors.success}`)
- Token def: `auxi/src/theme/theme.ts:10` (`success: '#388E3C'`) vs
  `theme.ts:382` (`ds.color.green: '#039855'`)
- Rule: design-system.md §1 "new code reads from `theme.ds.*` first" → MINOR

#### Routing
- mobile-dev — swap to the `ds.color.green` semantic token (or confirm the
  intended empty-state heart hue with CEO if `#388E3C` is deliberate). Non-blocking.

---

### MINOR #2 — Action-row / self-visualization buttons use `activeOpacity` only, no `scale.press` micro-interaction

**Severity**: MINOR
**Lens**: 2 motion / 5 states (press feedback)
**Rule doc**: motion-rules.md §2 (Press feedback = `scale.press` 0.97 + `spring.standard`)
**Screen**: Favourite (card action row, dialog buttons)

#### What's off
The card's ⊖ remove and "Self visualization" buttons (and the dialog's
Yes/Cancel) give press feedback via `activeOpacity` only, not the
`scale.press`(0.97)+`spring.standard` micro-interaction the motion system
documents for button/tile press-down and that `PillButton` already implements.
This is the **app-wide** `TouchableOpacity activeOpacity` convention (ItemDetail,
TopIconButton, and every back-screen behave identically), so it is NOT a
regression specific to this screen and NOT a cross-screen inconsistency — it is a
product-wide polish ceiling. Logged here for visibility; the systemic fix is a
primitive-level decision, not a Favourite-screen fix.

#### Evidence
- Source: `auxi/src/screens/favourite/FavouriteOutfitCard.tsx:165-197`,
  `RemoveFavouriteDialog.tsx:58-98` (`activeOpacity` only)
- Contrast: `auxi/src/components/primitives/FigmaPrimitives.tsx:127` (`PillButton`
  does drive `scale.press` from `motion.ts`)
- Rule: motion-rules.md §2 press-feedback row

#### Routing
- mobile-dev (or CEO for the systemic call) — if the press-scale
  micro-interaction is desired on tertiary/ghost buttons, it should be added at
  the shared primitive level so the whole app benefits, not bolted onto Favourite
  alone. Non-blocking.

---

### NOTE — Rarity-tag divergence from Figma is intentional (no action)

**Severity**: n/a (documented, CEO-confirmed)
**Lens**: 8 recommendation / 1 design-system

`FavouriteOutfitCard` renders the "common" rarity pill data-driven
(`is_common_item === true`) rather than on every tile as Figma `2852:22063` draws
it (placeholder content). This is explicitly CEO-confirmed (2026-06-12, code
comment at `FavouriteOutfitCard.tsx:50-54`). Flagging only so it isn't re-raised:
if a pixel-diff against the Figma frame surfaces "missing pills," that is a
qa-ui concern already adjudicated — **do not** route a fix.

---

## Self-audit

1. N=3 findings (B:0 / Maj:0 / Min:2 / note:1). Screenshots captured: 2
   (entry + auth-bounce). Neither MINOR cites a screenshot as evidence (both are
   source-line findings), so S-coverage requirement is satisfied — no
   screenshot-less visual finding to drop.
2. Each finding cites a rule doc + concrete token (`ds.color.green`,
   `motion.scale.press`+`spring.standard`) or the lens question it addresses.
3. Verdict follows the ladder: zero BLOCKER/MAJOR ⇒ PASS.
4. **4 surfaces reviewed (Favourite + 3 composed components) · 3 findings
   (B:0/Maj:0/Min:2 +1 note) · VERDICT: PASS · routing → mobile-dev (2 MINOR,
   non-blocking)**
