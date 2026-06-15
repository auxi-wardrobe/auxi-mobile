/**
 * AU-347 — snap-offset math for the Favourite Collection "review one outfit at
 * a time" motion. Pure + UI-free so it can be unit-tested without a renderer.
 *
 * The Favourite list is a date-grouped vertical ScrollView. Each outfit card is
 * a snap target. We measure (via onLayout) each date group's Y within the
 * scroll content and each card's Y within its group; a card's absolute snap
 * offset is the sum. ScrollView.snapToOffsets then settles on the nearest card.
 */

export interface SnapOffsetGroup {
  /** Stable key for the date group (matches onLayout bookkeeping). */
  dayKey: string;
  /** Favourite ids in render order within the group. */
  ids: string[];
}

/**
 * Build the ascending, de-duplicated list of content offsets (one per measured
 * outfit card) for ScrollView.snapToOffsets. Cards whose group or own layout
 * hasn't been measured yet are skipped, so the array grows as layout settles.
 */
export const computeSnapOffsets = (
  groups: SnapOffsetGroup[],
  groupY: Record<string, number>,
  cardY: Record<string, number>,
): number[] => {
  const offsets: number[] = [];
  for (const group of groups) {
    const gy = groupY[group.dayKey];
    if (gy == null) {
      continue;
    }
    for (const id of group.ids) {
      const cy = cardY[id];
      if (cy == null) {
        continue;
      }
      offsets.push(Math.max(0, Math.round(gy + cy)));
    }
  }
  return Array.from(new Set(offsets)).sort((a, b) => a - b);
};
