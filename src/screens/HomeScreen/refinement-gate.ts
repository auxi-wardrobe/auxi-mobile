import { REFINE_AFTER_OUTFITS } from './constants';

// Pure decision logic for the progressive-refinement gate (Outfit Discovery &
// Refinement spec). Extracted from HomeScreen so the state machine — tier
// dedup, the generation pause, and the open-the-sheet threshold — is unit
// testable without rendering the whole screen. HomeScreen wires these in; the
// thresholds live in one place (REFINE_AFTER_OUTFITS).

/**
 * Auto-generation pauses once a tier's worth of outfits already exists, so the
 * Refine sheet can collect a preference signal before more are produced. A
 * forced fetch (cold-start prime, refine submit, skip) deliberately bypasses
 * the pause to seed the next tier.
 */
export const shouldPauseGeneration = (
  total: number,
  force: boolean,
): boolean => !force && total >= REFINE_AFTER_OUTFITS;

/**
 * The gate opens the Refine sheet once the user has viewed a tier's worth of
 * distinct outfits — but never while it's already open (avoids re-opening on
 * every render once the threshold is crossed).
 */
export const shouldOpenRefineGate = (
  tierViewedCount: number,
  isRefineOpen: boolean,
): boolean => !isRefineOpen && tierViewedCount >= REFINE_AFTER_OUTFITS;

/**
 * Record that `hash` was viewed in the current tier and return the new distinct
 * count. The Set dedups, so re-landing on an already-counted outfit is a no-op
 * (the count is unchanged). Clearing the Set (on submit/skip) re-arms the tier.
 */
export const registerTierView = (
  viewed: Set<string>,
  hash: string,
): number => {
  viewed.add(hash);
  return viewed.size;
};
