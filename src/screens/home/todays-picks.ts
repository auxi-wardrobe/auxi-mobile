import type { OutfitSheet } from '../HomeScreen/types';

// Pure source-precedence for the landing page's "Today's picks". Kept out of
// the hook (which pulls AuthContext + ScheduleContext, and with them the whole
// service tree) so the rule that actually matters is unit-testable alone.

export type TodaysPicksSource = 'scheduled' | 'deck' | 'persisted' | 'none';

export interface TodaysPicks {
  sheets: OutfitSheet[];
  source: TodaysPicksSource;
  /** True until the persisted-store read settles (the other sources are sync). */
  loading: boolean;
}

/** How many outfits the landing carousel shows before "see more" takes over. */
export const TODAYS_PICKS_LIMIT = 5;

/**
 * Pick what the landing page shows, newest-INTENT first:
 *
 *   1. outfits the user SCHEDULED for today — an explicit plan beats a
 *      generated suggestion;
 *   2. the live recommender deck (in-memory, this session) — what the engine
 *      is currently showing them;
 *   3. the persisted "latest outfits" blob — so a cold start still has
 *      something, without re-running the metered AI engine.
 *
 * `persisted === null` means that read has not settled yet: report `loading`
 * rather than flashing the empty state on every cold start.
 */
export const pickTodaysSheets = (
  scheduled: OutfitSheet[],
  deck: OutfitSheet[],
  persisted: OutfitSheet[] | null,
): TodaysPicks => {
  if (scheduled.length > 0) {
    return {
      sheets: scheduled.slice(0, TODAYS_PICKS_LIMIT),
      source: 'scheduled',
      loading: false,
    };
  }
  if (deck.length > 0) {
    return {
      sheets: deck.slice(0, TODAYS_PICKS_LIMIT),
      source: 'deck',
      loading: false,
    };
  }
  if (persisted === null) {
    return { sheets: [], source: 'none', loading: true };
  }
  if (persisted.length > 0) {
    // The persisted blob is oldest-first; the freshest suggestions are its
    // tail (see `persistLatestOutfits`, which slices with a negative index).
    return {
      sheets: persisted.slice(-TODAYS_PICKS_LIMIT).reverse(),
      source: 'persisted',
      loading: false,
    };
  }
  return { sheets: [], source: 'none', loading: false };
};
