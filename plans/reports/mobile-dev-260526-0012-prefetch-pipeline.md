# mobile-dev — Home Try-Another Prefetch Pipeline + Spam Guard

**Date:** 2026-05-26
**Branch:** `feat/au-253-home-grid-view` (added on top of existing uncommitted WIP)
**Plan:** `plans/260526-0012-home-tryanother-prefetch-pipeline/plan.md`
**File changed:** `src/screens/HomeScreen.tsx` only (v05Api.ts NOT needed)

## What changed

### Change 1 — Single in-flight guard (airtight)
- New `requestRecommendation(params, { force })` useCallback (HomeScreen.tsx ~602)
  is the ONE entry point for every fetch. It sets `isPrefetchingRef.current = true`
  before calling `valenGetRecommendation`, and no-ops if a call is already in
  flight (unless `force`). Stamps the current `fetchGenerationRef` into the
  mutation input as `__gen`.
- Routed through it WITHOUT force: cold-start useEffect (~624), error-retry
  (~1148), and all prefetches (via `ensureBuffer`).
- Routed WITH `{ force: true }`: refine-submit (`handleSubmitContext` ~972).
  Mode-change has no immediate fetch (lazy), so it only bumps the generation.
- Result: no swipe / "Show another" / rapid tap can produce two concurrent
  `/try_another` calls.

### Change 2 — Eager + chained prefetch
- `triggerPrefetchIfNeeded` generalized into `ensureBuffer(force?)` (~680).
  Fires one prefetch when `!isPrefetchingRef.current && ahead < TARGET_AHEAD`
  where `ahead = total - 1 - activeSheetIndexRef.current`. `force` bypasses the
  gate (cold-start eager kick only).
- `PREFETCH_LOOKAHEAD = 2` → `TARGET_AHEAD = 2` (rename, same numeric meaning;
  old `nextIndex >= total - 2` ≡ `ahead < 2`).
- Called from THREE places:
  1. Build `onSuccess` cold-start branch → `ensureBufferRef.current(true)` fires
     ONE eager prefetch even though build returned a full buffer (CEO's
     "build → +1 try_another"). Gated to cold start only (the `isColdStart`
     flag), so it never re-fires on subsequent builds.
  2. `advanceToSheet` (swipe) — kept, now calls `ensureBuffer()`.
  3. Prefetch `onSuccess` (append branch) → `ensureBufferRef.current(false)`
     re-checks and chains the next prefetch while the user is paused.
- Loop safety: `ensureBuffer` returns once `ahead >= TARGET_AHEAD`; each fired
  prefetch appends one outfit, so the chain self-terminates.
- `ensureBufferRef` (ref) bridges the declaration-order cycle (onSuccess is
  declared above `ensureBuffer`; an effect keeps the ref current). The
  `onSuccess` defers the call via `setTimeout(0)` so `listOutfitsRef` /
  `activeSheetIndexRef` reflect the just-committed state (they sync via effects).

### Change 3 — Stale-session generation guard
- New `fetchGenerationRef = useRef(0)` (~155). Incremented immediately after
  every `resetV05Session()`: refine-submit (~961) and mode-change (~822).
- `__gen` captured at mutate time (threaded through `requestRecommendation` into
  the mutation input). In `onSuccess`, if `capturedGen !== fetchGenerationRef.current`
  the result is DROPPED (no setListOutfits) — `isPrefetchingRef` is still reset
  so the pipeline resumes. Prevents a pre-reset prefetch from polluting the new
  session's list.
- Refine-submit also sets `isFirstLoadRef.current = true` so the new session
  REPLACES the list (clean swap, satisfies the "no duplicate/mixed list" AC)
  rather than appending.

### Supporting type
- Inline `buildViaV05` input object type extracted to a named `BuildViaV05Input`
  type (module scope) and reused by `buildViaV05` + `requestRecommendation`.
  `mode` made optional on the type; `buildViaV05` normalizes to
  `DEFAULT_RECOMMENDATION_MODE` so the `moodMap` index stays typed.

## Verification
- `npx tsc --noEmit`: clean for `HomeScreen.tsx` and `v05Api.ts`. Remaining
  errors are all in `_HomeScreen.tsx` (legacy, known) and `reactotron.config.ts`
  (pre-existing missing dev module, not touched).
- `yarn lint`: my new symbols (`requestRecommendation`, `ensureBuffer`,
  `fetchGenerationRef`, `ensureBufferRef`, `TARGET_AHEAD`, `BuildViaV05Input`,
  `__gen`) produce ZERO lint errors.
- The 3 `HomeScreen.tsx` lint errors now shown (`RECOMMENDATION_MODE_OPTIONS`,
  `handleSelectMode`, `onEditContext` unused) are PRE-EXISTING branch WIP, not
  mine: the working tree commented out the `modeSelectorRow` JSX and the
  edit-context `PillButton` (diff: `-<View style={styles.modeSelectorRow}>` →
  `+{/* <View ...`). Those symbols' only live usages were inside those now-
  commented JSX blocks. I never touched the render/JSX. HEAD's HomeScreen.tsx
  lints clean; the deltas come from the uncommitted WIP the task said to leave.

## Concerns / notes
- Did NOT run the simulator (no mobile-mcp). Code complete; visual + network-log
  verification (the 4 acceptance criteria) pending qa-mobile on sim.
- Residual micro-window per the plan's own design: on a refine-force while a
  prefetch is in flight, the stale prefetch's `onSuccess` resets the in-flight
  flag (plan explicitly specifies this) — if the user swipes in that small
  window before the forced `/build` resolves, a single extra prefetch could
  fire. Plan accepted this ("still reset isPrefetchingRef.current = false").
  Flagging for tech-lead awareness; not a deviation.
- The pre-existing WIP commenting out the mode selector + edit-context button is
  unrelated to this task and left untouched. Tech-lead may want to confirm that
  WIP is intentional before the branch merges (the 3 lint errors will block CI
  otherwise — but that is the branch owner's WIP, not this change).

**Status:** DONE_WITH_CONCERNS
**Summary:** Implemented all 3 changes (single in-flight guard, eager+chained
prefetch, stale-session generation guard) in HomeScreen.tsx with a minimal diff;
tsc clean, no new lint errors from my code.
**Concerns:** Pre-existing branch WIP adds 3 HomeScreen lint errors (commented-out
mode selector / edit-context) that will trip CI but are not mine; sim verification
pending qa-mobile.
