/**
 * AU-347 / #164 — "which saved outfit is currently in view" math for the
 * Favourite list. Pure + UI-free so it can be unit-tested without a renderer
 * (same shape as `snap-offsets.ts`).
 *
 * The Favourite list is a date-grouped vertical ScrollView; the screen-level
 * sticky `FavouriteActionBar` acts on whichever outfit is snapped into view. As
 * the list scrolls we map the scroll offset to the nearest measured card: each
 * card's absolute Y is its date group's Y plus the card's Y within that group
 * (both captured via onLayout). The active index is the card whose absolute Y is
 * closest to the current scroll offset.
 */

export interface ActiveIndexEntry {
  /** Date group key the card belongs to (matches onLayout bookkeeping). */
  dayKey: string;
  /** The favourite's id (matches onLayout bookkeeping). */
  id: string;
}

/**
 * Index (into `entries`) of the card nearest the current scroll offset. Entries
 * whose group or own layout hasn't been measured yet are skipped. Returns 0 when
 * nothing is measured (the safe default — the first card is initially in view).
 */
export const computeActiveIndex = (
  entries: ActiveIndexEntry[],
  groupY: Record<string, number>,
  cardY: Record<string, number>,
  scrollY: number,
): number => {
  let best = 0;
  let bestDist = Infinity;
  entries.forEach((entry, i) => {
    const gy = groupY[entry.dayKey];
    const cy = cardY[entry.id];
    if (gy == null || cy == null) {
      return;
    }
    const dist = Math.abs(gy + cy - scrollY);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
};
