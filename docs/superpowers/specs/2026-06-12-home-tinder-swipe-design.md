# Home — Tinder-Style Outfit Swipe Deck (Design Spec)

**Date:** 2026-06-12
**Author:** mobile-dev (with duncan)
**Surface:** `src/screens/HomeScreen.tsx`
**Supersedes:** the AU-303 two-axis swipe model (vertical sets + horizontal outfits).
**Motion authority:** [`docs/MOTION_SYSTEM.md`](../../MOTION_SYSTEM.md) (Macgie Motion v1.0, Linear AU-333…338).

---

## 1. Goal

Replace Home's two-axis paging (vertical = sets, horizontal = outfits within a set)
with a **single-axis, Tinder-style card deck**:

- One outfit card at a time; the card **follows the finger live** while dragging
  (translate + subtle rotation), and on release either commits (flies off) or
  springs back.
- **Swipe right = like** → instant quick-save (no modal). **Swipe left = skip** →
  next card.
- The vertical "set" concept is **removed entirely**.

The interaction is Tinder-shaped, but its *feel* must obey the Macgie Motion
System: **calm, premium, supportive — not playful, gamified, or bouncy.**

> **CEO/PO note:** This intentionally diverges from `Auxi Home Spec.html` and
> `docs/HOME_SWIPE_PLAN.md` (both describe the two-axis model). Those documents
> are now historical for the swipe axis. The data layer, favourite flow, prefetch,
> pin, collage, and load/empty/error states are **retained unchanged**.

---

## 2. Interaction model

### 2.1 The deck
- Deck source = the existing **flat `listOutfits`** array. A single `activeIndex`
  (0-based) points at the active card. `outfitHash` still keys favourite/caption/save
  state, so state survives advancing and is position-independent.
- Render **two** cards: the active card (top) and `activeIndex + 1` peeking behind
  at `scale 0.98`. The card body is the **existing `OptionSheet`** (header caption +
  adaptive grid + action row + CTA), reused as-is.
- `groupOutfitsIntoSets` is no longer used for rendering. `(setIndex, outfitIndex)`
  state, the dots, and "Show another" are removed.

### 2.2 Gesture (`PanResponder` + `Animated`, matching `OutfitCanvasSurface`)
- `onPanResponderMove`: `translateX` tracks `gestureState.dx` 1:1; `rotate` is
  interpolated from `dx` and **capped at ±6°** (premium restraint, not Tinder's tilt).
  Vertical movement is ignored (single axis).
- **Directional cue (no LIKE/NOPE stamp):** as `dx` → right, a soft heart glyph
  fades in (`opacity hidden→subtle→visible`, tracking `|dx|`); as `dx` → left, a
  muted "Skip" label fades in. Calm and supportive, never a stamp.
- **Commit threshold:** `|dx| > 0.30 × screenWidth` **OR** release velocity
  `|vx| > 0.4`. On commit, the card animates off that side with `ease-exit
  (0.4,0,1,1)` over `duration-normal` (250ms), then `activeIndex += 1`.
- **Cancel:** below threshold, the card returns to center with `spring-standard`
  (stiffness 300, damping 35) — **critically damped, no bounce**.
- Swipe is **frozen** while a collage item is being dragged (reuse the existing
  `collageDragActive` flag).

### 2.3 Like / Skip semantics
- **Right (like):** quick-save the active outfit via the existing header-heart path
  (`saveStateByHash[hash]: idle→saving→saved`, track `outfit_favorited`). No modal.
  Resets the unfavourited-skip counter to 0. Card flies right → next card.
- **Left (skip):** advance to next card. Counts toward the existing refine nudge:
  **3 consecutive unfavourited skips → `ContextChipsModal`**. Counter resets on any
  like / "Wear this" / refine submit.
- **Header heart** is retained as a tap-to-like (same quick-save) — also the
  Reduced-Motion / VoiceOver path.
- **"Wear this"** CTA is retained for the considered, mood-tagged save
  (`MoodFeedbackSheet`), unchanged.

### 2.4 Buffer / prefetch (unchanged behaviour, re-keyed)
- `ensureBuffer` keeps `≥ TARGET_AHEAD` outfits buffered ahead of `activeIndex`
  (was keyed to the flat set/outfit index — now keyed directly to `activeIndex`).
  One fetch in flight; generation guard intact; cycled / wardrobe-gap / error
  states unchanged.

### 2.5 End of deck (locked decision #2)
- When `activeIndex` is the last buffered outfit and no more can be fetched
  (cycled / depleted): keep the last card on screen, still re-likeable, with a calm
  "all caught up for now" line (reuse/extend `home-cycled-hint`). No blank state.

---

## 3. Motion spec (per `docs/MOTION_SYSTEM.md`)

All values come from tokens in `src/theme/motion.ts` (new). No hardcoded timings.

| Moment | Motion | Token / Pattern |
|---|---|---|
| Drag tracking | `translateX` = `dx`; `rotate` ±6° max | continuity (P2/P8) |
| Like/Skip cue | soft ♥ / "Skip" fade, opacity tracks `|dx|` | opacity tokens; P11 calm |
| Commit (fly off) | exit that side | `ease-exit` · `duration-normal 250ms` |
| Cancel (spring back) | to center, no bounce | `spring-standard 300/35` |
| Next card promote | `scale 0.98→1.0` + opacity | `ease-enter` · `duration-normal` · Pattern 03 |
| New outfit content | items assemble Top→Bottom→Shoes→Accessories | Pattern 06 · `stagger-normal 80ms` · ≤`reveal 700ms`; **interruptible** |
| Like success | subtle heart scale / check | Pattern 11 · `duration-normal`; confident not celebratory |
| Button press | scale 0.97 | Pattern 01 · `scale-press` · `fast 120ms` |
| "Wear this" → sheet | translateY 100%→0 + backdrop fade | Pattern 04 · `medium 350ms` |

### 3.1 Outfit Assembly during browse (locked decision #1)
- **First card / Daily Reveal:** full Outfit Assembly (Pattern 06), 80ms stagger.
- **Subsequent swiped cards:** lighter progressive reveal (Pattern 05) at `fast`,
  **fully interruptible** — if the user swipes again mid-reveal, all items settle to
  visible instantly (Principle: no motion blocks interaction).

### 3.2 Reduced Motion (`AccessibilityInfo.isReduceMotionEnabled`)
- No rotation / no translate-fling. Cards cross-fade (opacity only).
- Like/Skip exposed as explicit on-screen buttons; header heart still likes.
- All state feedback (saving→saved, position hints) preserved.

### 3.3 Emotion Motion Layer (AU-334) — thin hook
- `motion.ts` exposes `applyEmotion(direction, config)` that scales
  duration/stagger/easing per the five directions.
- HomeScreen passes the active direction; **default `Confident` / `standard`**
  when none is set. (Future mapping: mode `safe→Calm/Comfort`, `power→Confident/Social`,
  `creative→Creative` — wired but not required for v1.)

---

## 4. UI changes

**Keep:** header (menu · weather · heart), Remix, "Wear this" CTA + `MoodFeedbackSheet`,
grid/collage toggle footer, pin, captions, load/empty/wardrobe-gap/error states.

**Remove:** pagination dots, "Show another" button (+ `handleShowAnother`), the
vertical `home-set-pager` FlatList, `OutfitSetRow`, the `(setIndex, outfitIndex)`
state and `clampedOutfitIndex`.

**Coach-mark:** collapse to a **single horizontal** `SwipeCoachMark`, copy →
*"Swipe right to save, swipe left to skip."* Remove the vertical variant and retire
its AsyncStorage key `@auxi/coachmark/swipe-set` on mount (keep the existing
`@auxi/coachmark/swipe-home` retirement). Key `@auxi/coachmark/swipe-outfit` reused.

---

## 5. Components & files

| File | Change |
|---|---|
| `src/theme/motion.ts` | **New.** Motion tokens (duration/distance/scale/opacity/stagger/easing/spring/elevation/radius/layer) + `applyEmotion()` + `useReducedMotion()`. |
| `src/components/features/OutfitSwipeDeck.tsx` | **New.** Card-deck: PanResponder + Animated, top + peek card, commit/cancel, `onLike`/`onSkip`, accessibilityActions. Renders `OptionSheet` as card body. |
| `src/screens/HomeScreen.tsx` | Replace set-pager + `OutfitSetRow` with `<OutfitSwipeDeck>`; `(setIndex,outfitIndex)` → `activeIndex`; re-key `ensureBuffer`/`recordBrowse` to `activeIndex`; single coach-mark; drop dots/"Show another". |
| `src/components/features/OutfitActionRow.tsx` | Drop dots; drop "Show another" (Remix stays). |
| `src/components/features/OptionSheet` (in HomeScreen) | Add interruptible item-assembly entrance (reads a `reveal` prop). |
| `src/components/features/SwipeCoachMark.tsx` | Verify single-variant usage; update copy via i18n. |
| `maestro/flows/home/swipe.yaml` | Rewrite for the left/right deck model (drop `home-mode-pill-*`, vertical swipe, dots). |
| i18n (`en-EN`, `vi-VN`, `fr-FR`) | New keys: coach-mark copy, "Skip", "all caught up". |

**Do NOT touch:** `_HomeScreen.tsx` (legacy), backend contract, `MoodFeedbackSheet`,
collage internals.

---

## 6. Edge cases & a11y
- Save failure on like → `error` state, heart re-tappable (existing behaviour).
- Rapid swipes → assembly settles instantly; one fetch in flight; generation guard
  drops stale results.
- Collage drag freezes the deck swipe; resumes on release.
- VoiceOver: card exposes `like` / `skip` accessibilityActions; header heart likes.
- Reduced Motion fallback per §3.2.

## 7. Out of scope
- Backend changes. Mood-feedback flow. Collage view internals. Full per-mood
  Emotion-Layer tuning (hook only). Item-level favourites.

## 8. Verification
- `npx tsc --noEmit` clean (legacy `_HomeScreen.tsx` errors expected).
- `yarn lint` no new errors (baseline 4 err / 3 warn in `_HomeScreen.tsx`).
- iOS sim walk: drag tracks finger + ±6° rotate; right→saved + next; left→next;
  3 skips→refine; spring-back no bounce; reduced-motion fallback; end-of-deck hint.
- Rewritten `maestro/flows/home/swipe.yaml` green.
