// AU-303 two-axis Home swipe (Figma node 3140-8191).
// Pure helper: group a flat outfit buffer into SETS of `size` (default 3) so the
// Home pager has two coordinates — vertical = setIndex, horizontal = outfitIndex
// within the set. `listOutfits` stays the single source of truth in HomeScreen;
// the grouped view is derived (useMemo) and re-derives on every append.
//
// GateGuard: importer = HomeScreen.tsx (derives `sets` from flat list) + its
// unit test. No duplicate (grep/ls src/utils confirms no existing chunk/group
// util). Generic over T — no data I/O. Instruction: "fix AU-303 wrong swipe
// behavior per spec, two-axis".

export const OUTFITS_PER_SET = 3;

export type OutfitSet<T> = {
  setIndex: number;
  outfits: T[]; // length 1..size — a trailing partial set is allowed
};

/**
 * Chunk a flat array into ordered sets of `size`. A trailing partial set
 * (fewer than `size` items) is preserved — the pager renders fewer horizontal
 * pages and the dot row reflects the actual count.
 */
export const groupOutfitsIntoSets = <T>(
  outfits: readonly T[],
  size: number = OUTFITS_PER_SET,
): OutfitSet<T>[] => {
  if (!Array.isArray(outfits) || outfits.length === 0) {
    return [];
  }
  const step = size > 0 ? size : OUTFITS_PER_SET;
  const sets: OutfitSet<T>[] = [];
  for (let i = 0; i < outfits.length; i += step) {
    sets.push({
      setIndex: sets.length,
      outfits: outfits.slice(i, i + step),
    });
  }
  return sets;
};

/** Flat index ⟷ (setIndex, outfitIndex) helpers — keep legacy flat-index code
 * (favorite / caption / hash dedup) working off the derived 2-axis position. */
export const toFlatIndex = (
  setIndex: number,
  outfitIndex: number,
  size: number = OUTFITS_PER_SET,
): number => setIndex * size + outfitIndex;

export const fromFlatIndex = (
  flatIndex: number,
  size: number = OUTFITS_PER_SET,
): { setIndex: number; outfitIndex: number } => {
  const step = size > 0 ? size : OUTFITS_PER_SET;
  const safe = Math.max(0, flatIndex);
  return {
    setIndex: Math.floor(safe / step),
    outfitIndex: safe % step,
  };
};
