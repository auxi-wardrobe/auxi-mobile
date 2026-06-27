# Design Review — Canvas Save + My Creations + unsaved-changes guard

**Verdict: PASS-WITH-MINORS** — no BLOCKER (zero raw hex / raw zIndex / hardcoded motion literal), zero MAJOR craft regression; the legacy-tier tokens + non-`M*` construction are real drift but faithfully replicate an already-shipped sibling pattern (Favourite / RemoveFavourite), so they are MINORs, not gate-blockers.
**Gate:** step 6.5 design-review · **PR #147** "Add canvas save & My Creations screen with unsaved-changes guard"
**Date:** 2026-06-25
**Reviewer:** designer (STATIC — diff-only)
**Build:** PR branch `claude/brave-bardeen-eaxo16` (NOT checked out; reviewed from `/tmp/pr147.diff`)
**Screens / surfaces reviewed:**
- `src/screens/MyCreationsScreen.tsx` (new)
- `src/screens/OutfitCanvasScreen.tsx` (header reorg + save flow + discard guard + success snackbar)
- `src/screens/canvas/DiscardCreationDialog.tsx` (new)
- `src/screens/myCreations/CreationCollageCard.tsx` (new)
- supporting (non-visual): `src/services/creationsService.ts`, `AppNavigator.tsx`, `types/navigation.ts`, 3× i18n bundles
**Live-sim visual verify:** DEFERRED — sim build is blocked on this project and the PR branch is not on disk. Code + token + motion + DS-doc review only; no screenshot taken (a misleading one was deliberately skipped).

---

## Verdict rationale

This PR is well-built mechanically and is a deliberate, consistent extension of the
existing Favourite family. The trip-wires that make a designer gate FAIL are all
clean:

- **No raw hex** anywhere in the four UI files (the color-rules.md §4 BLOCKER). Every
  color routes through a `theme.*` token.
- **No raw `zIndex`** — the success-snackbar overlay correctly uses `theme.zIndex.toast`
  (six-tier token), not a magic number.
- **Motion is textbook-correct.** `DiscardCreationDialog` uses the house open/close
  asymmetry — OPEN `duration.medium` (350) + `easing.enter`, CLOSE `duration.normal`
  (250) + `easing.exit` — AND honors `useReducedMotion()` with an instant fallback.
  This is exactly motion-rules.md.
- **Full a11y plumbing** — `accessibilityRole="button"` + `accessibilityLabel` on every
  interactive element, tri-locale i18n (en/fr/vi) for every new string, `testID` on
  every control.
- **Cross-screen consistency is the PR's biggest strength** — the My Creations header,
  the collage card, the discard sheet, and the success snackbar each mirror a shipped
  sibling (FavouriteScreen header, FavouriteOutfitCard collage, RemoveFavouriteDialog,
  Wardrobe's ItemReadySnackbar). A saved remix reads the same as a saved outfit.

What keeps it from a clean PASS is **inherited drift, not new craft defects**: the new
files copy the Favourite family's *legacy* construction — `figma*`/`uac*` alias tokens
instead of `ds.*`, and raw `TouchableOpacity`/`Modal`/`TopIconButton` instead of the
`M*` primitives the CEO directive (2026-06-24) now requires. The decisive nuance:
**these patterns are already shipped in Favourite/RemoveFavourite**, the
`auxi-lint-ds-primitives.sh` gate is still **warn-mode** (flips to error at GH-364
Phase 4), and the blurred Favourite-style header is an **approved variant**. So #147 is
not inventing a new anti-pattern — it is being consistent with a sibling that itself
needs migrating. That makes the drift MINOR (track + migrate the trio together at
Phase 4), not MAJOR (block now).

One genuine system gap surfaced: **`MEmptyState` does not exist**, so the empty state is
necessarily hand-rolled. That is a DS gap to route to DS work, not a fault of this PR.

**Tally:** BLOCKER 0 · MAJOR 0 · MINOR 5 · NIT 3 · DS-gap 1.
Per the verdict rule (FAIL only on an open BLOCKER/MAJOR) → **PASS-WITH-MINORS, does
not block the PR.**

---

## Lens 1 — Design-system compliance

### L1-A · New files build on legacy `figma*`/`uac*` aliases where a `ds.*` token exists — MINOR
**Rule doc:** design-system.md §1 (canonical `ds.*` tier) · **Routing:** mobile-dev (low prio, batch with the Favourite-family migration)

The four files lean almost entirely on the historical per-feature alias layer rather
than the canonical `theme.ds.*` tier. Concrete instances:

- `MyCreationsScreen.tsx` — `figmaBackground` (`container`), `figmaItemDetailHeaderBg`
  (`headerTint` + blur fallback), `uacTextBase` (`headerTitle`, `emptyText`),
  `figmaTextDark` (empty icon), `uacDimension12` spacing, `poppinsH4SemiBold` /
  `uacBodyXsRegular` type aliases.
- `DiscardCreationDialog.tsx` — `figmaOverlayScrim`, `figmaItemDetailHeaderBg`,
  `uacTextBase`, `interSemiboldXsSm` / `interBodySm` / `poppinsButton` type aliases,
  `borderRadius.uacPanel` / `uacButtonCta`.
- `CreationCollageCard.tsx` — `figmaInsightPillBg`, `figmaTextDark`, `figmaCardSurface`,
  `borderRadius.figmaTile`, `uacBodyXsRegular` / `interCaptionXxs`.

None of this is a violation per se (the facts confirm legacy aliases are tolerated and
only raw hex is a BLOCKER), and it correctly matches the sibling Favourite screens. It
is logged as MINOR so the cleanup rides the GH-364 token-unification pass rather than
being lost. **No raw hex / fontFamily / zIndex present — the BLOCKER class is clean.**

### L1-B · Discard sheet + collage card hand-rolled instead of `M*` primitives — MINOR (lint warn-mode; will be an error at Phase 4)
**Rule doc:** design-system-primitives-required.md · **Routing:** mobile-dev (migrate as a trio with RemoveFavouriteDialog), tracked under GH-364

`DiscardCreationDialog.tsx` is a raw `Modal` + manual `Animated` + two `TouchableOpacity`
buttons. By the directive this should be **`MBottomSheet`** (or `MActionSheet`) housing
two **`MButton`s**:
- "Save" outlined-primary (`DiscardCreationDialog.tsx:725-741`, `styles.outlinedAction`)
  → `MButton variant="secondary"` (or `dangerOutline` if framed as the destructive-set's
  safe option).
- "Discard" red-text ghost (`:744-760`, `styles.dangerLabel`) → `MButton variant="danger"`
  (text/ghost danger).

`MyCreationsScreen.tsx:137` uses `TopIconButton` from `FigmaPrimitives` for the hamburger
→ should be **`MIconButton`**. `CreationCollageCard.tsx:958` uses a raw `TouchableOpacity`
for the ⊖ remove → **`MIconButton`** (danger tint).

Severity is MINOR (not the BLOCKER "bypassed system component") **because**: (a) the
primitives lint is explicitly warn-mode today; (b) each of these is a verbatim copy of a
*shipped* legacy construction (`RemoveFavouriteDialog`, `FavouriteScreen`,
`FavouriteOutfitCard`), so the app is internally consistent; (c) no `ds.*`-backed `M*`
is being bypassed in a *new* place. The right fix is to migrate the whole Favourite
family + these new files together when Phase 4 flips the lint to error — see Routing.

### L1-C · Blurred Favourite-style menu header — PASS (no finding)
`MyCreationsScreen.tsx:126-146` hand-builds a `BlurView` + tint + `TopIconButton` header
rather than `components/layout/Header.tsx`. Per header-footer-rules.md this would be a
MAJOR ("don't hand-roll a one-off header") **except** the blurred Favourite-style menu
header is an **explicitly approved variant**, which this faithfully reuses
(`figmaItemDetailHeaderBg` tint, decorative `pointerEvents="none"` blur so it can't
swallow the hamburger tap, `ds.shadow.headerIcon` on the button — note this one
*correctly* reaches the canonical `ds.*` tier). Safe-area handled via `insets.top + 8`.
No finding.

---

## Lens 2 — Motion & interaction

### L2-A · Discard sheet motion is on-system — PASS (no finding)
`DiscardCreationDialog.tsx:649-670` implements the house signature exactly:
OPEN = `duration.medium` + `easing.enter`, CLOSE = `duration.normal` + `easing.exit`,
driven off the shared `motion` tokens (no literals). `useReducedMotion()` (`:644`,
`:652-658`) short-circuits to `progress.setValue` with no animation and unmounts cleanly.
Slide-up `translateY 320→0` + scrim fade is the correct bottom-sheet entrance. This is a
model implementation of motion-rules.md.

### L2-B · Success snackbar is an instant visibility toggle (relies on inner component anim) — NIT
**Rule doc:** motion-rules.md · **Routing:** mobile-dev (low prio) / qa-ux (perceptual)
`OutfitCanvasScreen.tsx:561-569` mounts `ItemReadySnackbar` by a raw boolean
(`savedSnackbarVisible ? <…> : null`) with a 4000ms `setTimeout` dismiss — no enter/exit
transition at the overlay layer. This is acceptable because the reused `ItemReadySnackbar`
owns its own animation (same component as Wardrobe's "item ready"), so the toast does not
pop in hard. Flagged only so it's on record that the appearance/dismissal timing is
delegated to that component and not re-animated here. The timer is correctly cleared on
unmount (`:321-328`) — no leak.

---

## Lens 3 — Visual hierarchy

### L3-A · Discard sheet hierarchy reads correctly — PASS (no finding)
The recoverable path ("Save") carries the stronger outlined treatment; the destructive
path ("Discard") is a quieter red-text ghost. Putting *more* visual weight on the
non-destructive option and signalling the destructive one with the danger color (not with
prominence) is the correct, calm hierarchy for an unsaved-changes prompt. Title →
body → action stack is a clear top-down read.

### L3-B · My Creations empty state is under-weighted — MINOR
**Rule doc:** (experiential — n/a) · **Routing:** mobile-dev (after MEmptyState lands, see L5-B) / CEO (copy/CTA taste)
`MyCreationsScreen.tsx:96-104` renders the empty state as a **24×24** `IconMyCreation`
plus one line of `uacBodyXsRegular` muted text. At 24px the icon is the *navigation-bar*
icon size, not an empty-state focal mark — it will read as an accidental glyph rather than
an intentional "nothing here yet" illustration. The copy ("Save a creation from the canvas
to see it here.") is good and points the user back to the source, but there is **no CTA**
to act on it. Recommend (when `MEmptyState` exists, L5-B) a larger illustration tier + an
optional "Open canvas" action. Low severity — the screen's only entry today is *from* the
canvas, so a user landing here already knows where creations come from.

---

## Lens 4 — Color & emphasis

### L4-A · Destructive color uses the legacy alias `figmaItemDetailDanger` instead of `ds.color.danger` — MINOR
**Rule doc:** color-rules.md §4 · **Token:** `ds.color.danger` (#bb251a) · **Routing:** mobile-dev
Two destructive surfaces reference the legacy alias rather than the canonical destructive
token:
- `DiscardCreationDialog.tsx:835` — `dangerLabel` color `theme.colors.figmaItemDetailDanger`.
- `CreationCollageCard.tsx:970` — ⊖ remove icon color `theme.colors.figmaItemDetailDanger`.

color-rules.md §4 names `ds.color.danger` as the canonical destructive token. This is a
token-swap to `theme.ds.color.danger`, not a raw-hex BLOCKER (no literal present) and the
alias resolves to the same red family, so it is MINOR. Worth doing in the same pass as
L1-A so destructive emphasis is sourced from one place app-wide.

### L4-B · Tag/mood pill + collage surface colors on-system (matched to Favourite) — PASS (no finding)
`CreationCollageCard.tsx` pill (`figmaInsightPillBg` fill, `figmaTextDark` text) and the
cream collage surface (`figmaCardSurface`) intentionally match `FavouriteOutfitCard`, so a
saved creation and a saved favourite read as the same object family. Correct emphasis;
aliases noted under L1-A.

---

## Lens 5 — Component state coverage

### L5-A · Loading / empty / populated / success covered; error state missing on save & remove — MINOR
**Routing:** mobile-dev
States present and well-handled:
- **Loading** — `MacgieLoader` (`MyCreationsScreen.tsx:86-92`).
- **Empty** — dedicated branch (`:94-105`), `testID="my-creations-empty"`.
- **Populated** — scrolling collage list.
- **Success** — "Saved to My Creations" snackbar after persist (`OutfitCanvasScreen.tsx`
  `persistCreation` → `showSavedSnackbar`).

**Missing: the error state.** `persistCreation` (`OutfitCanvasScreen.tsx:363-398`) `await`s
`creationsService.saveCreation` with **no try/catch** — an AsyncStorage write failure would
reject silently (and, in the discard-then-save path `handleDiscardSave`, would still call
`leaveWithPendingAction`, navigating away as if it saved). The remove mutation
(`MyCreationsScreen.tsx:75-81`) has `onSuccess` but **no `onError`** — a failed delete
silently no-ops. Severity is MINOR because the seam is local AsyncStorage (low failure
probability), but a save/remove failure should surface a snackbar (an error variant of the
existing one) rather than fail silently — especially on the "Save then leave" path where
the user believes their work was persisted.

### L5-B · No `MEmptyState` primitive exists — DS GAP (route to DS, not a PR fault)
**Routing:** DS work / new primitive (mobile-dev + CEO sign-off on the spec)
The empty state had to be hand-rolled (L3-B) because `MEmptyState` is **not** in the `M*`
library. This is a genuine gap in the design-system primitive set, not drift introduced by
this PR. Recommend filing `MEmptyState` (icon/illustration tier + title + body + optional
CTA) so My Creations, and the other empty surfaces in the app, share one crafted empty
treatment. Until it exists, the hand-rolled version here is acceptable.

---

## Lens 6 — Cross-screen consistency

### L6-A · Strong consistency with the Favourite family — PASS (no finding)
This is the PR's strongest lens. Each new surface mirrors a shipped sibling:
- Header → `FavouriteScreen` blurred menu header.
- `CreationCollageCard` → `FavouriteOutfitCard`/`CollageView` (same cream 3:4 surface,
  `figmaTile` radius, overflow-clipped overlapping items, date line + tag pills + ⊖ remove).
- `DiscardCreationDialog` → `RemoveFavouriteDialog` (bottom-anchored panel + blurred button
  slab + shared motion tokens).
- Success snackbar → Wardrobe's `ItemReadySnackbar`.
A saved remix and a saved favourite read as the same object — exactly the cross-screen
coherence this gate exists to protect. (The shared *legacy* construction is the L1-A/L1-B
drift, but consistency itself is correct: nothing behaves *differently* between screens,
which is the BLOCKER condition for this lens, and that is **not** triggered.)

---

## Lens 7 — Native feel

### L7-A · Unsaved-changes guard is a native iOS pattern — PASS (no finding)
`OutfitCanvasScreen.tsx:416-426` intercepts `navigation.addListener('beforeRemove', …)`,
`preventDefault`s the back action, stashes it, and replays it verbatim
(`leaveWithPendingAction`, `:428-436`) once the user resolves the sheet — with a
`proceedRef` so the replay isn't re-prompted. This is the correct React-Navigation idiom
for an unsaved-changes guard and feels native (back chevron *and* hardware/edge-swipe back
are both covered). Slide-up sheet + scrim, safe-area-aware button slab
(`insets.bottom + spacing.l`), and a non-touch-blocking informational snackbar
(`pointerEvents="none"`) all read iOS-native, not web-like.

---

## Lens 8 — Recommendation experience

### L8-A · Not a recommendation surface — N/A (no finding)
My Creations / canvas-save is a user-authored content surface, not an Auxi recommendation
presentation (no "Why This", Favorite-from-rec, Build-Around-This, or alternatives flow).
Lens 8 does not apply. Journey continuity is satisfied: the success snackbar tells the user
*where* their work went ("Saved to My Creations"), the header icon is a persistent route to
it, and the empty-state copy points back to the canvas — "where am I / what next" reads
cleanly.

---

## NITs (do not block; log for follow-up)

- **N1 · `elevation: 1000` raw literal** — `OutfitCanvasScreen.tsx:585` (`savedSnackbarOverlay`).
  The iOS-side z-order is correctly tokenised (`zIndex: theme.zIndex.toast`), but the Android
  `elevation` is a magic `1000`. iOS-first target so cosmetic, but prefer a `ds.shadow`/elevation
  token or a named constant for parity. Routing: mobile-dev.
- **N2 · No explicit "Cancel" affordance on the discard sheet** — dismissal is backdrop-tap /
  hardware-back only (`onCancel`). Standard for iOS sheets and arguably cleaner than a third
  button, but worth a conscious CEO call vs the iOS 3-action "Save / Discard / Cancel" convention.
  Routing: CEO (taste).
- **N3 · `extractUri` silently drops non-URI (require()'d) items from a saved creation** —
  `OutfitCanvasScreen.tsx:263-273` + `persistCreation:366-382`. A mixed canvas (real photos +
  mock assets) saves a *partial* collage with no user-facing notice that some tiles were dropped.
  Edge case (dev/deep-link mock assets), so NIT — but if it can happen with real user content,
  it should surface a note. Routing: mobile-dev to confirm reachability.

---

## Routing

| # | Finding | Severity | Route to |
|---|---|---|---|
| L1-A | Legacy `figma*`/`uac*` aliases where `ds.*` exists | MINOR | **mobile-dev** — batch with GH-364 token-unification |
| L1-B | Raw `Modal`/`TouchableOpacity`/`TopIconButton` vs `MBottomSheet`/`MButton`/`MIconButton` | MINOR | **mobile-dev** — migrate the Favourite family + these files as a trio at GH-364 **Phase 4** (when `auxi-lint-ds-primitives.sh` flips warn→error) |
| L3-B | Under-weighted empty state (24px icon, no CTA) | MINOR | **mobile-dev** (after L5-B) / **CEO** (copy + CTA taste) |
| L4-A | `figmaItemDetailDanger` → `ds.color.danger` | MINOR | **mobile-dev** |
| L5-A | Missing error state on save & remove (silent failure; save-then-leave navigates as if saved) | MINOR | **mobile-dev** |
| L5-B | `MEmptyState` primitive does not exist | DS GAP | **DS work** (new primitive spec; mobile-dev impl + **CEO** sign-off) |
| N1 | `elevation: 1000` raw literal | NIT | mobile-dev |
| N2 | No explicit Cancel on discard sheet | NIT | **CEO** (taste) |
| N3 | `extractUri` silently drops non-URI tiles | NIT | mobile-dev (confirm reachability) |

Nothing routes to **qa-ui** (no Figma frame to pixel-diff — this is a code-faithful sibling
of shipped screens) or to **qa-ux** beyond the L2-B perceptual note. No ESCALATE-blocking
taste question — N2 and the L3-B copy/CTA are advisory CEO inputs, not gate blockers.

---

## Gate decision (for the workflow)

**PASS-WITH-MINORS — this does NOT block PR #147.** All BLOCKER-class trip-wires are clean
(no raw hex, no raw zIndex, no hardcoded motion literal), motion + reduce-motion + a11y +
tri-locale i18n are correct, and the surfaces are coherent with their shipped siblings. The
PR may proceed to step 7 (qa-mobile smoke) and PR merge.

**Conditions attached (tracked, not blocking):**
1. The L1-B `M*` migration and L1-A/L4-A token-unification are **deferred to GH-364
   Phase 4**, where the Favourite family (FavouriteScreen, RemoveFavouriteDialog,
   FavouriteOutfitCard) and these new files migrate **together** when the primitives lint
   flips warn→error. Do not migrate this PR in isolation — that would create a one-off
   `M*` island next to still-legacy siblings.
2. L5-A (error state) and L5-B (`MEmptyState`) are filed as follow-ups; neither is a
   release blocker for this local-AsyncStorage feature.

If a future PR adds a *new* canvas/creations surface, it must build on `M*` + `ds.*`
directly rather than copying this file's legacy construction — the "mirrors a shipped
sibling" justification expires once Phase 4 lands.
