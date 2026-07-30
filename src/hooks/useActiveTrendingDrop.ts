// useActiveTrendingDrop — AU-438 Trending Item Drop, Home card state.
//
// Owns the active-drop query, the optimistic hide, and the respond mutation so
// HomeScreen stays wiring-only. Server is the source of truth (the public
// `GET /trending-drop/active` already excludes drops the user has answered); the
// local AsyncStorage flag `@auxi/trending-drop/{userId}/{dropId}` is a
// belt-and-braces optimistic guard so the card vanishes INSTANTLY on respond
// and doesn't flash back before the query refetches.
//
// Contract notes handled here:
//   • respond `action` is lowercase ('add' | 'dismiss'); `response` is uppercase
//     (mapped in the service). We branch on the lowercase action variable.
//   • both buttons disable on tap (`isResponding` + an in-flight guard) so the
//     backend's concurrent-double-tap edge is never exercised.

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { configureCollapseNext, useReducedMotion } from '../theme/motion';
import { toast } from '../components/design-system/lib';
import {
  track,
  trackTrendingDropAdded,
  trackTrendingDropDismissed,
  trackTrendingDropViewed,
} from '../services/analytics';
import {
  trendingDropService,
  type TrendingDrop,
  type TrendingDropAction,
} from '../services/trendingDropService';

const TRENDING_DROP_QUERY_KEY = 'trending-drop-active';

const respondedFlagKey = (userId: string, dropId: string): string =>
  `@auxi/trending-drop/${userId}/${dropId}`;

export interface UseActiveTrendingDrop {
  /** The active, unanswered drop for this user, or null. */
  drop: TrendingDrop | null;
  /** True only once the responded-flag check has settled AND it's unanswered. */
  isVisible: boolean;
  onAdd: () => void;
  onDismiss: () => void;
  /** In-flight respond — both card buttons disable while true. */
  isResponding: boolean;
}

interface RespondContext {
  id: string;
  itemId: string;
}

export const useActiveTrendingDrop = (): UseActiveTrendingDrop => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id != null ? String(user.id) : undefined;
  const queryClient = useQueryClient();
  const reducedMotion = useReducedMotion();

  const { data } = useQuery({
    queryKey: [TRENDING_DROP_QUERY_KEY, userId],
    queryFn: trendingDropService.getActiveDrop,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
  const drop = data ?? null;
  const dropId = drop?.id ?? null;
  const itemId = drop?.item.id ?? null;

  // The drop id hidden locally — set when the AsyncStorage "already responded"
  // flag is present OR when the user just responded (optimistic hide).
  const [hiddenDropId, setHiddenDropId] = useState<string | null>(null);
  // Gate the first paint on the async flag read so an already-answered drop
  // never flashes before we know to hide it.
  const [checkedDropId, setCheckedDropId] = useState<string | null>(null);

  // On a new drop id: read the responded flag. If set → hide. Else → mark
  // checked and fire the (session-deduped) viewed event.
  useEffect(() => {
    if (!userId || !dropId || !itemId || checkedDropId === dropId) {
      return;
    }
    let cancelled = false;
    (async () => {
      let alreadyResponded = false;
      try {
        alreadyResponded =
          (await AsyncStorage.getItem(respondedFlagKey(userId, dropId))) != null;
      } catch (err) {
        if (__DEV__) {
          console.warn('[useActiveTrendingDrop] flag read failed', err);
        }
      }
      if (cancelled) {
        return;
      }
      if (alreadyResponded) {
        setHiddenDropId(dropId);
      } else {
        trackTrendingDropViewed(dropId, itemId);
      }
      setCheckedDropId(dropId);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, dropId, itemId, checkedDropId]);

  const { mutate, isPending } = useMutation({
    mutationFn: (action: TrendingDropAction) => {
      if (!dropId) {
        return Promise.reject(new Error('no active trending drop'));
      }
      return trendingDropService.respondToDrop(dropId, action);
    },
    onMutate: async (action): Promise<RespondContext | undefined> => {
      if (!dropId || !itemId) {
        return undefined;
      }
      // MINOR-2 (designer 260729): animate the card's removal so the deck
      // slides up calmly instead of snapping ~400px in one frame. Schedule the
      // collapse on the SAME commit as the optimistic hide below; reduce-motion
      // → instant (configureCollapseNext no-ops).
      configureCollapseNext(reducedMotion);
      // Optimistic hide + persist the flag so it stays hidden across a remount
      // in this session, before the query refetches.
      setHiddenDropId(dropId);
      if (userId) {
        try {
          await AsyncStorage.setItem(respondedFlagKey(userId, dropId), action);
        } catch {
          /* non-fatal — the server stays authoritative */
        }
      }
      return { id: dropId, itemId };
    },
    onSuccess: (_result, action, context) => {
      if (!context) {
        return;
      }
      if (action === 'add') {
        trackTrendingDropAdded(context.id, context.itemId);
        // Feed the shared wardrobe-grow taxonomy (tracking-plan §5.4/§5.25).
        track('wardrobe_item_added', {
          source: 'trending_drop',
          item_id: context.itemId,
        });
        toast.show({
          type: 'success',
          text1: t('trendingDrop.added_toast'),
          position: 'bottom',
        });
      } else {
        trackTrendingDropDismissed(context.id, context.itemId);
      }
      queryClient.invalidateQueries({
        queryKey: [TRENDING_DROP_QUERY_KEY],
      });
    },
    onError: (_error, _action, context) => {
      // Revert the optimistic hide + clear the flag so the user can retry.
      const id = context?.id;
      if (id) {
        setHiddenDropId(prev => (prev === id ? null : prev));
        if (userId) {
          AsyncStorage.removeItem(respondedFlagKey(userId, id)).catch(() => {});
        }
      }
      toast.show({
        type: 'error',
        text1: t('trendingDrop.error_title'),
        text2: t('common.try_again_moment'),
        position: 'bottom',
      });
    },
  });

  const onAdd = useCallback(() => {
    if (!dropId || isPending) {
      return;
    }
    mutate('add');
  }, [dropId, isPending, mutate]);

  const onDismiss = useCallback(() => {
    if (!dropId || isPending) {
      return;
    }
    mutate('dismiss');
  }, [dropId, isPending, mutate]);

  const isVisible =
    !!drop && checkedDropId === dropId && hiddenDropId !== dropId;

  return { drop, isVisible, onAdd, onDismiss, isResponding: isPending };
};
