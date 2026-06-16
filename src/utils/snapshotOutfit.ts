// AU-307 — deep clone for `lastOutfitSnapshot`.
//
// Spec §13 flags perf — for typical outfits (≤9 items, light Item shape) the
// cost is negligible (<1ms on Hermes), so a straight deep clone is fine. If
// outfits balloon (>5KB JSON) move to a shallow + structural-sharing approach.
//
// `structuredClone` is in Hermes since RN 0.74 (we're on 0.83), but we keep a
// JSON-stringify fallback for safety — neither path can throw on the plain
// Outfit shape (no functions, no cycles, no DOM nodes).

import type { Outfit } from '../services/recommendationService';

declare const structuredClone:
  | (<T>(value: T) => T)
  | undefined;

export const snapshotOutfit = (outfit: Outfit): Outfit => {
  if (typeof structuredClone === 'function') {
    return structuredClone(outfit);
  }
  return JSON.parse(JSON.stringify(outfit)) as Outfit;
};
