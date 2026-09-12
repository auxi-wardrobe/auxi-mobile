import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../context/AuthContext';
import { useSchedule } from '../../../context/ScheduleContext';
import { toDayKey } from '../../../utils/dateKey';
import { track } from '../../../services/analytics';
import { markAiLimitReached, clearAiLimit } from '../../../services/aiLimitStore';
import { AI_DAILY_LIMIT_CODE, getApiErrorCode } from '../../../utils/aiError';
import { buildScheduledOutfitSheets } from '../../HomeScreen/scheduled-outfits';
import {
  readHomeDeckSnapshot,
  saveHomeDeckSnapshot,
} from '../../HomeScreen/deck-cache';
import {
  persistLatestOutfits,
  readLatestOutfitsEntry,
} from '../../HomeScreen/last-outfits-store';
import { LATEST_OUTFITS_COUNT } from '../../HomeScreen/constants';
import type { OutfitSheet } from '../../HomeScreen/types';
import { buildColdStartOutfits } from '../cold-start-outfits';
import {
  pickTodaysSheets,
  shouldColdStart,
  TODAYS_PICKS_LIMIT,
  type TodaysPicks,
  type TodaysPicksFailure,
  type TodaysPicksSource,
} from '../todays-picks';

export { TODAYS_PICKS_LIMIT };
export type { TodaysPicks, TodaysPicksFailure, TodaysPicksSource };

// "Today's picks" for the landing page.
//
// Reads, in precedence order: today's schedule, the recommender's live deck
// snapshot, this page's own cold-start build, and today's persisted blob
// (`pickTodaysSheets` owns the rules). When every one of those is empty it
// spends ONE build so the homepage is never a "nothing here, go look over
// there" panel — and writes that build into the SAME deck snapshot the
// recommender restores from, so the session still costs exactly one build and
// both screens show the same outfit. See `cold-start-outfits.ts`.

export const useTodaysPicks = (tempC: number | null): TodaysPicks => {
  const { user } = useAuth();
  const { scheduledByDay } = useSchedule();
  const [deck, setDeck] = useState<OutfitSheet[]>([]);
  const [fresh, setFresh] = useState<OutfitSheet[]>([]);
  const [persisted, setPersisted] = useState<OutfitSheet[] | null>(null);
  const [persistedAt, setPersistedAt] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);
  const [failure, setFailure] = useState<TodaysPicksFailure>(null);

  // One cold-start attempt per user per mount-cycle. A build is expensive and
  // metered — a failure must never become a retry loop.
  const attemptedForUserRef = useRef<string | number | null>(null);
  // Whether this hook is still mounted. NOT a per-effect `cancelled` local:
  // the cold-start effect re-runs whenever its inputs change (starting the
  // build flips `fetching`, which is itself an input), and a per-effect flag
  // would be tripped by that very re-run — discarding the build we just paid
  // for. Only a real unmount may drop the result.
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  // Both non-schedule sources are read on FOCUS, not on mount: the deck
  // snapshot lives at module scope (nothing for React to subscribe to) and the
  // persisted blob is written by the recommender, so coming back from it must
  // re-read rather than show the preview the user already acted on.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setDeck(readHomeDeckSnapshot(user?.id)?.listOutfits ?? []);
      readLatestOutfitsEntry(user?.id).then(entry => {
        if (!cancelled) {
          setPersisted(entry.sheets);
          setPersistedAt(entry.savedAt);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [user?.id]),
  );

  const scheduled = useMemo(
    () => buildScheduledOutfitSheets(scheduledByDay[toDayKey(new Date())]),
    [scheduledByDay],
  );

  const input = useMemo(
    () => ({
      scheduled,
      deck,
      fresh,
      persisted,
      persistedAt,
      fetching,
      failure,
    }),
    [scheduled, deck, fresh, persisted, persistedAt, fetching, failure],
  );

  // Cold start. Waits for the weather reading because temperature is what the
  // engine builds against — firing without it would produce an outfit for the
  // wrong climate, which is worse than a moment of skeletons.
  useEffect(() => {
    const userId = user?.id;
    if (userId == null || tempC === null) {
      return;
    }
    if (attemptedForUserRef.current === userId) {
      return;
    }
    if (!shouldColdStart(input)) {
      return;
    }
    attemptedForUserRef.current = userId;
    setFetching(true);

    buildColdStartOutfits({ user, tempC })
      .then(outcome => {
        if (!mountedRef.current) {
          return;
        }
        if (outcome.kind === 'wardrobeGap') {
          setFailure('wardrobeGap');
          return;
        }
        // A build succeeded → the daily AI budget isn't spent; clear any
        // remembered limit so a stale mark can't gate another surface.
        clearAiLimit();
        setFresh(outcome.sheets);
        if (outcome.sheets.length === 0) {
          // Nothing came back but the engine did not report a wardrobe gap —
          // don't write an empty deck over whatever the recommender may have,
          // and let the generic empty state stand.
          return;
        }
        // Hand the deck to the recommender: its mount effect restores this
        // snapshot instead of cold-starting, so the session spends ONE build
        // and both screens show the same outfit.
        saveHomeDeckSnapshot({
          userId,
          listOutfits: outcome.sheets,
          activeIndex: 0,
          saveStateByHash: {},
        });
        persistLatestOutfits(userId, outcome.sheets, LATEST_OUTFITS_COUNT);
        track('home_landing_cold_start_built', {
          outfit_count: outcome.sheets.length,
        });
      })
      .catch(error => {
        if (!mountedRef.current) {
          return;
        }
        if (getApiErrorCode(error) === AI_DAILY_LIMIT_CODE) {
          markAiLimitReached();
          setFailure('aiLimit');
          return;
        }
        setFailure('failed');
      })
      .finally(() => {
        if (mountedRef.current) {
          setFetching(false);
        }
      });
  }, [user, tempC, input]);

  return useMemo(() => pickTodaysSheets(input), [input]);
};
