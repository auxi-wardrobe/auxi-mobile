# Home — Try-Another Prefetch Pipeline + Airtight Spam Guard

**Date:** 2026-05-26
**Branch:** `feat/au-253-home-grid-view`
**Scope:** `auxi/src/screens/HomeScreen.tsx` (+ minor `auxi/src/services/v05Api.ts`)
**Owner agent:** `mobile-dev` → verify `qa-mobile`

## Problem (from CEO)

1. **Spam bug:** while a `try_another` call is loading, swiping again must NOT fire
   another call (avoid hitting the LLM rate limit).
2. **Waiting feel:** prefetch one outfit ahead so the next outfit is already
   loading before the user reaches it. Model: `build → +1 try_another`, then
   each consumed outfit `→ +1 try_another`. Both calls hit the LLM, so eager
   prefetch hides latency.

## Current state (committed on this branch)

- `triggerPrefetchIfNeeded` (`HomeScreen.tsx:609`) already guards with
  `isPrefetchingRef.current || isStartPending` and fires `/try_another` when
  `nextIndex >= total - PREFETCH_LOOKAHEAD` (=2). `/build` returns 3 outfits.
- `recommendV05` (`v05Api.ts:616`) retries `429 session_locked` with backoff.
- `LoadingMoreIndicator` (`HomeScreen.tsx:1078`) shows on tail underrun.

**The guard is already correct for the swipe path.** The two real gaps:
- Prefetch is **swipe-driven only** — it never fires right after build, and it
  never chains (fire-next-when-one-resolves). So a user who pauses then
  fast-swipes outruns the buffer and waits.
- Fetch entry points are **asymmetric**: only the prefetch path sets
  `isPrefetchingRef`; cold-start / refine / mode / retry don't. A prefetch that
  resolves *after* a `resetV05Session()` (refine/mode) can append stale-session
  outfits.

## Decision (CEO delegated model choice)

Keep `build = 3` (instant first impression, no per-card wait). Layer a
**self-feeding 1-ahead-ish pipeline** on top, with a single in-flight guard.

## Changes

### Change 1 — Single in-flight guard (airtight)
- Every fetch goes through one helper. Set `isPrefetchingRef = true` before any
  `valenGetRecommendation(...)` mutate (cold-start, refine, mode, retry,
  prefetch); reset only in `onSuccess`/`onError`. Guard rejects any call while
  `isPrefetchingRef.current` is true.
- **Exception — user-intent overrides:** refine-submit / mode-change reset the
  session and represent a NEW intent; they must win even if a prefetch is in
  flight. Do NOT allow a 2nd concurrent network call — instead bump the
  generation (Change 3) and start the new fetch; the in-flight stale result is
  dropped on arrival. The new fetch sets the in-flight flag normally.

### Change 2 — Eager + chained prefetch
- Extract `ensureBuffer()` (rename/generalize of the prefetch trigger) reading
  refs: fire one prefetch when
  `!inFlight && (total - 1 - activeIndex) < TARGET_AHEAD`.
  `TARGET_AHEAD = 2` (≡ current lookahead; tunable constant).
- Call `ensureBuffer()` from **three** places:
  1. **Build `onSuccess`** (cold start) → prime the pipeline immediately (the
     CEO's "build → +1 try_another"). Fire one prefetch right after the first
     build resolves so #4 has a head start, even though build already gave 3.
  2. **`advanceToSheet`** (swipe) — already wired, keep.
  3. **Prefetch `onSuccess`** — chain: re-check and fire the next if still short.
     This is the key add — buffer fills even while the user pauses.

### Change 3 — Stale-session generation guard
- Add `fetchGenerationRef` (number), start at 0. Increment wherever
  `resetV05Session()` is called (refine submit `:874`, any mode change). Capture
  the generation value at mutate time; in `onSuccess`, if captured generation
  !== current `fetchGenerationRef.current`, **drop** the result (don't
  append/replace). Prevents a pre-reset prefetch from polluting the new session.

### Change 4 — Stop chaining on a depleted pool (regression fix, found in QA)
- Change 2's chaining regressed: a `try_another` against a depleted pool returns
  `200` with an EMPTY outfit (`v05_pool_insufficient`). Empty never grows
  `ahead`, so the chain re-fired instantly (~85ms apart, no LLM) and spam-looped
  into the backend's 20/min limiter (cold-start fanned out to ~10 calls + 429).
- Fix: `poolDepletedRef` — set when a resolve adds 0 outfits; stops both the
  chain (in `onSuccess`) and swipe-driven `ensureBuffer`. Cleared on cold-start
  build and on every `resetV05Session()` (refine / mode change).
- Verified on sim (com.auxi2026.app): cold-start 1 build + 1 try_another (was
  1 + ~10); 6 rapid advances → 2 try_another (was 11), 0 self-inflicted 429.

## Out of scope (YAGNI)
- No aggregate rate-limit throttle unless a real 429 rate-limit is observed
  (CEO unsure; single-in-flight already self-throttles to 1 call / resolve).
- No backend changes; `build` stays `count: 3`.
- No change to the `session_locked` backoff (keep as safety net).

## Acceptance criteria
- [ ] Rapid-swipe (5+ fast swipes): **exactly one** `/v05/recommendation/try_another`
      in flight at any instant (verified via network log on sim).
- [ ] Immediately after `/build` resolves, one `/try_another` fires with **zero**
      swipes (eager prime).
- [ ] After a prefetch resolves while the user is paused near the tail, the next
      prefetch fires automatically (chained) until `TARGET_AHEAD` is met.
- [ ] Refine-submit while a prefetch is in flight: the stale prefetch result is
      dropped, the new session's outfits replace cleanly (no duplicate/mixed list).
- [ ] `npx tsc --noEmit` clean (legacy `_HomeScreen.tsx` errors exempt),
      `yarn lint` no new errors/warnings beyond baseline.

## Key files / anchors
- `HomeScreen.tsx`: `buildViaV05` @428 · useMutation `onSuccess`@520 `onError`@546 ·
  cold-start useEffect @552 · `triggerPrefetchIfNeeded` @609 · `advanceToSheet` @754 ·
  `handleShowAnother` @893 · `handleMomentumScrollEnd` @913 · `handleSubmitContext`
  (refine, resets session @874, fetch @878) · error-retry @1049 ·
  `isPrefetchingRef` @344 · `PREFETCH_LOOKAHEAD` @136 · `LoadingMoreIndicator` @1078
- `v05Api.ts`: `recommendV05` @616 · `resetV05Session` @536 · session vars @532
