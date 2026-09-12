import type { OutfitSheet } from '../HomeScreen/types';
import { toDayKey } from '../../utils/dateKey';

// Pure source-resolution for the landing page's "Today's picks". Kept out of
// the hook (which pulls AuthContext + ScheduleContext, and with them the whole
// service tree) so the rules that actually matter are unit-testable alone.

export type TodaysPicksSource =
  | 'scheduled'
  | 'deck'
  | 'fresh'
  | 'persisted'
  | 'none';

/** Why there is nothing to show. `null` = no failure (yet). */
export type TodaysPicksFailure = 'aiLimit' | 'wardrobeGap' | 'failed' | null;

export interface TodaysPicks {
  sheets: OutfitSheet[];
  source: TodaysPicksSource;
  loading: boolean;
  failure: TodaysPicksFailure;
}

export interface TodaysPicksInput {
  /** Outfits the user planned for today. */
  scheduled: OutfitSheet[];
  /** The recommender's live in-memory deck for this session. */
  deck: OutfitSheet[];
  /** Outfits the landing page itself just built (this session's cold start). */
  fresh: OutfitSheet[];
  /** Persisted "latest outfits"; `null` while that read is unsettled. */
  persisted: OutfitSheet[] | null;
  /** When the persisted blob was written; `null` = unknown age. */
  persistedAt: number | null;
  /** True while the landing page's cold-start build is in flight. */
  fetching: boolean;
  failure: TodaysPicksFailure;
}

/** How many outfits the landing carousel shows before "see more" takes over. */
export const TODAYS_PICKS_LIMIT = 5;

/**
 * Is the persisted blob from a day that is not today?
 *
 * These outfits render under "Today's picks", so yesterday's suggestions do
 * not qualify — a stale blob is treated as absent, which is what triggers the
 * landing's cold-start build. An UNKNOWN age (a blob written before `savedAt`
 * existed) is NOT treated as stale: showing it is better than spending a build
 * on an upgrade artefact, and the next write dates it correctly.
 */
export const isPersistedStale = (
  persistedAt: number | null,
  now: Date = new Date(),
): boolean =>
  persistedAt !== null && toDayKey(new Date(persistedAt)) !== toDayKey(now);

/**
 * Resolve what the landing page shows, newest-INTENT first:
 *
 *   1. outfits the user SCHEDULED for today — an explicit plan beats a
 *      generated suggestion;
 *   2. the recommender's live deck — what the engine is currently showing them;
 *   3. outfits this page just built (its own cold start);
 *   4. today's persisted "latest outfits" — so a warm restart is instant.
 *
 * Reports `loading` while a source that could still produce something is
 * pending, so the page shows skeletons rather than flashing an empty state.
 */
export const pickTodaysSheets = ({
  scheduled,
  deck,
  fresh,
  persisted,
  persistedAt,
  fetching,
  failure,
}: TodaysPicksInput): TodaysPicks => {
  const settle = (
    sheets: OutfitSheet[],
    source: TodaysPicksSource,
  ): TodaysPicks => ({
    sheets: sheets.slice(0, TODAYS_PICKS_LIMIT),
    source,
    loading: false,
    failure: null,
  });

  if (scheduled.length > 0) {
    return settle(scheduled, 'scheduled');
  }
  if (deck.length > 0) {
    return settle(deck, 'deck');
  }
  if (fresh.length > 0) {
    return settle(fresh, 'fresh');
  }
  if (persisted === null) {
    // The persisted read has not settled — something may still arrive.
    return { sheets: [], source: 'none', loading: true, failure: null };
  }
  if (persisted.length > 0 && !isPersistedStale(persistedAt)) {
    // The persisted blob is oldest-first; the freshest suggestions are its
    // tail (see `persistLatestOutfits`, which slices with a negative index).
    return settle([...persisted].reverse(), 'persisted');
  }
  if (fetching) {
    return { sheets: [], source: 'none', loading: true, failure: null };
  }
  return { sheets: [], source: 'none', loading: false, failure };
};

/**
 * Should the landing page spend a build? Only when every cheaper source is
 * exhausted AND nothing has failed yet — one attempt, never a retry loop.
 */
export const shouldColdStart = (input: TodaysPicksInput): boolean =>
  input.scheduled.length === 0 &&
  input.deck.length === 0 &&
  input.fresh.length === 0 &&
  input.persisted !== null &&
  (input.persisted.length === 0 || isPersistedStale(input.persistedAt)) &&
  !input.fetching &&
  input.failure === null;
