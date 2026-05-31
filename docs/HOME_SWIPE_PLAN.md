# Home Swipe — Main Flow Plan

**Owner:** mobile-dev
**Scope:** `auxi/src/screens/HomeScreen.tsx` and supporting files
**Source of truth:** Figma file `0nXXMAR4Arf1ZfjtQvtBh0`, page `470:1121`, section `909:7328` "Home adjust"
**Linked tickets:** AU-221 (3 modes), AU-222 (Pin), AU-223 (3-swipe context), AU-226 (Love collection)

## 1. The swipe model — TWO AXES (AU-303, current source of truth)

> **SUPERSEDE NOTE (2026-05-31, AU-303 · Figma section `3140-8191` "Home | behavior
> guide"):** The original single-axis model below this note is **obsolete**. The CEO
> redesigned Home exploration onto **two intentional axes** to avoid infinite scroll.
> Earlier revisions of this doc claimed "Tinder-style horizontal cards are NOT what
> this design uses" — that is now **INVERTED**: horizontal swipe IS used, for
> browsing the 3 outfits *within a set*. The two-axis model is authoritative; do not
> reintroduce the vertical-only model.

**Two axes:**

| Axis | Gesture | Navigation unit |
|---|---|---|
| **Horizontal** | swipe **left / right** | browse the **3 outfits within the current SET** (`outfitIndex` 0..2) |
| **Vertical** | swipe **up** = next set · **down** = previous set | move between **SETS of 3** (`setIndex`) |

A "set" is one batch of (up to) 3 outfits — exactly what `/build` or `/try_another`
returns per call (`count: 3`). The active position is the coordinate
`(setIndex, outfitIndex)`; the legacy flat index is derived `setIndex*3 + outfitIndex`
for favorite / caption / hash code that still keys on a single number.

Each outfit cell is the existing `OptionSheet` shell (header weather + 2×2-ish item
grid + `• • •` pagination + "Wear this"). The pagination dots (between **Remix** and
**Show another**) track `outfitIndex` within the active set: active dot `#5b5550`
(`figmaChipBg`), inactive `#c6bcb1` (`figmaDotInactive`).

**First-time guidance overlays** (two, parameterized `SwipeCoachMark`):
1. **Horizontal** ("Swipe left or right to explore different outfit options.") — fires
   the first time Home shows outfits. Key `@auxi/coachmark/swipe-outfit`.
2. **Vertical** ("Swipe up to explore another outfit set." / "Swipe down to go back")
   — fires after the user has viewed all 3 outfits of set 0. Key
   `@auxi/coachmark/swipe-set`. Old key `@auxi/coachmark/swipe-home` is retired on
   mount so existing users see the corrected flow once.

Dismiss is the **"Got it" button only** (CEO, overrides the ticket's "touch every to
close"). On the 3rd unfavorited browse, the vertical overlay (if unseen) takes priority
and the recurring `ContextChipsModal` is deferred until the overlay is dismissed — the
two never collide.

**Implementation:** nested RN-native pagers (no new dependency) — outer vertical
`FlatList` (sets) where each row is a horizontal `FlatList` of the set's outfits;
`directionalLockEnabled` on both so a diagonal drag commits to one axis. See
`HomeScreen.tsx` (`home-set-pager` / `home-outfit-pager-<setIndex>`) and
`src/utils/groupOutfitsIntoSets.ts`.

---

### OBSOLETE — original single-axis model (pre-AU-303, retained for history)

Each outfit is rendered as a full-screen **sheet** (414×896 frame in Figma).
The sheet is a vertical slab:

```
┌─ header (414×107) ────────────────────────────────────────┐
│  [menu]     "Auxi"  or  "Monday  32°C"     [heart icon]   │
├─ Frame 2033 (414×169) ────────────────────────────────────┤
│  short copy line                                           │
│  [ Show another ]   ← top primary button (full-width)      │
├─ Frame 2030 grid (414×508) ───────────────────────────────┤
│  ┌───────┐ ┌───────┐                                       │
│  │ 3:4   │ │ 3:4   │   each tile is "common items" tag     │
│  └───────┘ └───────┘                                       │
│  ┌───────┐ ┌───────┐                                       │
│  │ 3:4   │ │ 3:4   │   = 4 items per outfit                │
│  └───────┘ └───────┘                                       │
├─ Frame 2017 (366×120) ────────────────────────────────────┤
│  same short copy line                                      │
│  [ This works ]                ← bottom primary, ~327×56   │
│  [ Edit context ]              ← bottom secondary, ~327×56 │
└────────────────────────────────────────────────────────────┘
```

~~**Swipe = vertical scroll between sheets, snapped per sheet.** Tinder-style horizontal
cards are NOT what this design uses.~~ **(INVERTED by AU-303 — see supersede note above:
horizontal swipe browses the 3 outfits within a set; vertical swipe moves between sets.)**
The shared structural shell was confirmed by 4 Figma frames (`1666:9723`, `1711:17062`,
`1711:16686`, `1666:9869`).

### Variant frames in Figma (same layout, different state)

| nodeId | Variant | What changes |
|---|---|---|
| `1666:9723` | Welcome Home (default) | base state — header shows weather |
| `1711:17062` | Welcome Home / pin item | one of the 4 grid tiles is pinned (sticky across reshuffles) |
| `1711:16686` | Welcome Home (alt state) | header reads "Auxi" — likely post-favorite state |
| `1666:9869` | love | heart-pressed state for the active sheet |
| `1667:2385` / `1711:17169` / `1667:2589` | context (×3) | ContextChipsModal — three chip set rotations |

## 2. Current code state

`HomeScreen.tsx` (current):
- Has the structural shell already (`OptionSheet` renders header + grid + actions)
- `snapToInterval={OPTION_SHEET_SNAP_INTERVAL}` is set on the outer `ScrollView` — vertical snap is wired
- BUT only a SINGLE outfit sheet is rendered (`optionSets.map((outfit) => …)` over a 1-element array). The next outfit is requested on a "Next" button instead of by scrolling.
- Heart button is **commented out** (lines 322-337).
- `ContextChipsModal` is wired but only opened manually (`handleOpenContextEdit`).
- No swipe counter, no pin slot, no mode selector, no love-collection navigation.
- Action labels say "Wear this" / "See this on me" / "Add context" — Figma says **"Show another"** (top), **"This works"** + **"Edit context"** (bottom).

## 3. Contract surface (what backend must accept)

Current `valenGetRecommendation` body:

```ts
{ temperature: number, user: { gender, occasion } }
```

Returns `{ outfits: Outfit[] }`.

New params we will start sending (mobile sends them; backend can ignore until ready,
documented in `wardrobe-backend/API_DOCUMENTATION.md` as a follow-up):

| Param | Source | Default | Owner ticket |
|---|---|---|---|
| `mode` | `'safe' \| 'power' \| 'creative'` | `'safe'` | AU-221 |
| `pinned_item_id` | string \| null | `null` | AU-222 |
| `style_feedback` | from ContextChipsModal | omitted | already wired in `NextRecommendationParams` |
| `excluded_outfit_hashes` | string[] (recently swiped) | omitted | nice-to-have, future |

`tech-lead` must sign off the contract change before backend implements; mobile can
ship the field on the wire ahead of backend and the new tickets will track close-out.

## 4. Implementation phases

### Phase A — Real vertical swipe + heart + 3-swipe trigger ✅ this PR

Goal: replace the fake "Next" button with the real Figma swipe model and wire the
existing heart + context-modal pieces into the swipe loop.

Changes:

1. **Render multiple outfit sheets in a vertical stack.** Iterate over the full
   `listOutfits` array from `valenGetRecommendation`, not just the current index.
   Keep `snapToInterval` snap behaviour.
2. **Track active sheet via `onMomentumScrollEnd`.** Compute index from
   `contentOffset.y / OPTION_SHEET_SNAP_INTERVAL` (helper already exists,
   commented out at `:85`). Re-enable.
3. **Heart button (top-right header)**, wired to `favouriteService.toggle` for
   the active outfit. Visual states match the legacy commented block at
   `:322-337` (idle / saving / saved / error). Resets the unfavorited-swipe
   counter to 0.
4. **Unfavorited-swipe counter**:
   - Increment on every `onMomentumScrollEnd` that lands on a *new* index
     where the previous active sheet was NOT favorited.
   - Reset to 0 on heart-tap.
   - When counter hits **3**, open `ContextChipsModal` (existing).
   - Counter is per-session (resets on Home unmount / cold start).
5. **Prefetch**: when `activeIndex >= listOutfits.length - 2`, call
   `valenGetRecommendation({})` and append onto `listOutfits` instead of
   replacing. (Avoids the "scroll-to-end then refetch" jarring reset.)
6. **Action labels** in `OptionSheet` updated to match Figma:
   - top button → **"Show another"** (scrolls to next sheet programmatically)
   - bottom primary → **"This works"** (calls heart toggle + shows snackbar)
   - bottom secondary → **"Edit context"** (opens `ContextChipsModal`)
7. **Remove the temporary "Next" button** in the header (currently at `:313-320`).
8. **Telemetry hook (placeholder)**: log `home.swipe.miss` /
   `home.swipe.favorite` events via `console.info` for now — leave a TODO for
   real analytics.

Out of Phase A: pin feature, mode selector, love-collection screen.

### Phase B — Pin feature (AU-222)

Goal: per Figma `1711:17062`, allow the user to pin one item from the active
outfit. Subsequent reshuffles keep that item and rotate the other 3.

Changes:

1. **Long-press (or pin icon) on a grid tile** in `OptionSheet` toggles pin state.
2. Pin state lives at the `HomeScreen` level — `pinnedItemId: string | null`.
   Pinned tile gets a visual badge (matches Figma frame).
3. `valenGetRecommendation` payload now includes `pinned_item_id`. Mobile sends
   it; backend may ignore. File backend follow-up sub-issue once mobile ships.
4. Pin clears on Home unmount and on explicit unpin tap.

### Phase C — 3 modes selector (AU-221)

Goal: per Figma sticky `1752:28109`, expose Safe / Power / Creative modes.

Changes:

1. **Mode selector row** (segmented control) in the header band, between the
   header and the first sheet. Three options:
   - Safe Choice — "blend in / lazy mode"
   - Power Choice — "impressive / energy"
   - Creative Choice — "refresh / experiment"
2. Selection persists per session (default `safe`).
3. Sent on every `valenGetRecommendation` call as `mode`.
4. Visual treatment (icons, colour) blocked on designer asset spec — request
   in the AU-221 ticket comment thread.

### Phase D — Love collection screen (AU-226)

Goal: heart-tap navigates to a list of all favorited outfits (Figma frame
`1667:2731`). Tracked in AU-226. Out of scope for this PR; mention here so the
heart wire-up in Phase A does NOT prematurely call navigation — it just toggles
favorite for the active sheet.

## 5. Files we will touch

- `auxi/src/screens/HomeScreen.tsx` (big edit — phases A/B/C)
- `auxi/src/services/recommendationService.ts` (add `mode`, `pinned_item_id`
  to `StartRecommendationParams`)
- `auxi/src/services/favouriteService.ts` (verify `toggle` shape; no change expected)
- `auxi/src/components/features/ContextChipsModal.tsx` (no change in Phase A;
  copy review in Phase C)
- `auxi/src/types/navigation.ts` + `AppNavigator.tsx` (Phase D only — register
  `LoveCollection`)

## 6. Verification gates

Before claiming any phase done:

- `cd auxi && npx tsc --noEmit` — clean (legacy `_HomeScreen.tsx` errors expected,
  do not regress).
- `cd auxi && yarn lint` — no NEW errors. Baseline = 4 errors + 3 warnings, all
  in `_HomeScreen.tsx`.
- `cd auxi && yarn ios:sim` and walk:
  - 3 swipes without heart → ContextChipsModal opens automatically.
  - Heart-tap on sheet → counter resets to 0, sheet shows "saved" state.
  - Scroll-to-near-end → next batch loads silently, no screen flicker.
  - Top button "Show another" → smooth-scroll to next sheet.
  - Bottom button "This works" → equivalent to heart-tap.
  - Bottom button "Edit context" → ContextChipsModal opens manually.
- Backend running on `:5001`; verify the new `mode` / `pinned_item_id` fields
  reach the server in axios interceptor logs (Phase B/C only).

## 7. Open questions for designer (CEO)

1. Heart on header vs heart in the sheet — the Figma `1666:9869` "love" variant
   shows the heart in the **header**, not the sheet. We will follow Figma. Confirm.
2. Does heart toggle = "favorite this outfit" OR "navigate to love-collection
   screen"? Sticky `909:7793` says clicking heart should LIST all liked outfits.
   Default for Phase A: heart tap **toggles** the active sheet's favorite state.
   Phase D wires the navigation entry-point (could be heart or sidebar).
3. Modes selector position — header band vs sticky bottom toolbar? Asset spec
   needed for icons.
4. Pin gesture — long-press on tile vs dedicated pin icon overlay?
5. Mood-check ("Light or sharp", "Energy") placement — onboarding step or daily
   Home prompt? Tracked in AU-224 separately.

## 8. Method

- Figma extracted via `mcp__claude_ai_Figma__use_figma` Plugin API
  (`figma.getNodeByIdAsync`, `findAllWithCriteria({types:['TEXT']})`). No
  screenshots downloaded.
- Code references `grep`-verified against `auxi/src/`.
- Backend verification deferred to backend-dev follow-ups.
