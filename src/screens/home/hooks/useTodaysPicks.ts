import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../context/AuthContext';
import { useSchedule } from '../../../context/ScheduleContext';
import { toDayKey } from '../../../utils/dateKey';
import { buildScheduledOutfitSheets } from '../../HomeScreen/scheduled-outfits';
import { readHomeDeckSnapshot } from '../../HomeScreen/deck-cache';
import { readLatestOutfits } from '../../HomeScreen/last-outfits-store';
import type { OutfitSheet } from '../../HomeScreen/types';
import {
  pickTodaysSheets,
  TODAYS_PICKS_LIMIT,
  type TodaysPicks,
  type TodaysPicksSource,
} from '../todays-picks';

export { TODAYS_PICKS_LIMIT };
export type { TodaysPicks, TodaysPicksSource };

// "Today's picks" for the landing page.
//
// DELIBERATELY READ-ONLY. The V05 recommendation engine lives on HomeScreen
// and is metered against the user's daily AI limit — firing it a second time
// from the landing page would burn a suggestion just to render a preview and
// would fork the deck the recommender is showing. So this hook only READS what
// the app already has: today's schedule, the live deck snapshot, and the
// persisted "latest outfits" blob. `pickTodaysSheets` owns the precedence.

export const useTodaysPicks = (): TodaysPicks => {
  const { user } = useAuth();
  const { scheduledByDay } = useSchedule();
  const [deck, setDeck] = useState<OutfitSheet[]>([]);
  const [persisted, setPersisted] = useState<OutfitSheet[] | null>(null);

  // Both non-schedule sources are read on FOCUS, not on mount: the deck
  // snapshot lives at module scope (nothing for React to subscribe to) and the
  // persisted blob is written by the recommender, so coming back from it must
  // re-read rather than show the preview the user already acted on.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setDeck(readHomeDeckSnapshot(user?.id)?.listOutfits ?? []);
      readLatestOutfits(user?.id).then(outfits => {
        if (!cancelled) {
          setPersisted(outfits);
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

  return useMemo(
    () => pickTodaysSheets(scheduled, deck, persisted),
    [scheduled, deck, persisted],
  );
};
