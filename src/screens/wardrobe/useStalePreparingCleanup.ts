import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '../../components/design-system/lib';
import {
  WardrobeItem,
  wardrobeKeys,
  wardrobeService,
} from '../../services/wardrobeService';
import { track } from '../../services/analytics';
import {
  PREPARING_TIMEOUT_MS,
  STALE_PREPARING_CHECK_MS,
  findExpiredPreparingIds,
  isPreparing,
  syncPreparingFirstSeen,
} from './wardrobe-grid';

interface UseStalePreparingCleanupParams {
  items: WardrobeItem[] | undefined;
  // Gate on screen focus so only the focused Wardrobe instance runs the ticker
  // (the screen can be mounted twice — select mode pushes a second copy) and
  // the removal toast never fires under another screen.
  enabled: boolean;
}

/**
 * Stale-upload watchdog: an item that stays in the preparing state for more
 * than PREPARING_TIMEOUT_MS is assumed to have failed processing — it is
 * removed automatically and an error toast tells the user to try again.
 *
 * The countdown starts when the client FIRST observes the item preparing
 * (fetch/poll), so no server clock is trusted. Before deleting, the item's
 * state is re-checked against the server: the preparing→ready transition may
 * have happened while the screen was unfocused or between polls, and a ready
 * item must never be deleted.
 */
export const useStalePreparingCleanup = ({
  items,
  enabled,
}: UseStalePreparingCleanupParams): void => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // itemId → epoch ms when the client first saw the item preparing.
  const firstSeenAtRef = useRef<Map<string, number>>(new Map());
  // Removals currently in flight, so a slow delete isn't re-triggered by the
  // next tick.
  const removingIdsRef = useRef<Set<string>>(new Set());

  // Sync the first-seen bookkeeping on every fetch/poll result.
  useEffect(() => {
    if (items) {
      syncPreparingFirstSeen(firstSeenAtRef.current, items, Date.now());
    }
  }, [items]);

  const removeStaleItem = useCallback(
    async (id: string) => {
      try {
        // Re-check fresh server state before deleting — never remove an item
        // that finished processing (or was already deleted) since our last poll.
        const fresh = await wardrobeService.getWardrobeItem(id);
        if (!fresh || !isPreparing(fresh)) {
          firstSeenAtRef.current.delete(id);
          return;
        }

        await wardrobeService.deleteWardrobeItem(id);
        firstSeenAtRef.current.delete(id);
        track('preparing_item_timed_out', {
          item_id: id,
          timeout_ms: PREPARING_TIMEOUT_MS,
        });

        // Drop the item from every cached wardrobe list immediately (it can
        // live under any filter tab), then revalidate in the background.
        queryClient.setQueriesData<WardrobeItem[]>(
          { queryKey: wardrobeKeys.all },
          old => old?.filter(item => item.id !== id),
        );
        queryClient.invalidateQueries({ queryKey: wardrobeKeys.all });

        toast.show({
          type: 'error',
          text1: t('wardrobe.list.preparing_timeout_title'),
          text2: t('wardrobe.list.preparing_timeout_body'),
          position: 'bottom',
        });
      } catch (error) {
        console.error('Stale preparing cleanup failed', error);
        // getWardrobeItem/deleteWardrobeItem already report to Sentry
        // (feature: 'wardrobe').
        // Transient failure (network, 5xx): restart the countdown so the
        // removal is retried after another timeout window instead of
        // hammering the API every tick.
        firstSeenAtRef.current.set(id, Date.now());
      } finally {
        removingIdsRef.current.delete(id);
      }
    },
    [queryClient, t],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const interval = setInterval(() => {
      const expired = findExpiredPreparingIds(
        firstSeenAtRef.current,
        Date.now(),
      );
      for (const id of expired) {
        if (removingIdsRef.current.has(id)) {
          continue;
        }
        removingIdsRef.current.add(id);
        removeStaleItem(id);
      }
    }, STALE_PREPARING_CHECK_MS);
    return () => clearInterval(interval);
  }, [enabled, removeStaleItem]);
};
