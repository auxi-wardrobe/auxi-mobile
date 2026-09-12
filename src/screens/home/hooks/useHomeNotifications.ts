import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import {
  getTryOnResultEntries,
  subscribeTryOnResults,
} from '../../../services/tryOnResultStore';
import {
  wardrobeKeys,
  wardrobeService,
} from '../../../services/wardrobeService';
import {
  buildNotificationFeed,
  unseenCount,
  type HomeNotification,
} from '../notifications/notification-feed';
import { readSeenIds, writeSeenIds } from '../notifications/seen-store';

/**
 * The Home bell's feed: completed "See this on me" renders and ready
 * Enhance-image studio shots, newest first, plus an unseen count for the badge.
 *
 * Neither source costs a request the app wasn't already making. The try-on
 * side is a module-scope store — SUBSCRIBED, so a render that finishes while
 * the user sits on Home updates the badge live. The beautify side reads the
 * SHARED wardrobe list cache under `wardrobeKeys.list()`, the very entry the
 * recommender and the Wardrobe "All" tab already populate.
 */
export const useHomeNotifications = () => {
  const { user } = useAuth();

  // Published snapshot: its identity changes on every mutation and only then,
  // so subscribing here means a render that finishes while the user sits on
  // Home updates the badge live, with no polling.
  const tryOnEntries = useSyncExternalStore(
    subscribeTryOnResults,
    getTryOnResultEntries,
  );

  const wardrobeQuery = useQuery({
    queryKey: wardrobeKeys.list(),
    queryFn: () => wardrobeService.getWardrobeItems(),
    enabled: !!user?.id,
  });

  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    readSeenIds(user?.id).then(ids => {
      if (!cancelled) {
        setSeenIds(ids);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const feed = useMemo(
    () => buildNotificationFeed(tryOnEntries, wardrobeQuery.data ?? [], seenIds),
    [tryOnEntries, wardrobeQuery.data, seenIds],
  );

  const markSeen = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) {
        return;
      }
      setSeenIds(previous => {
        const next = new Set(previous);
        ids.forEach(id => next.add(id));
        writeSeenIds(user?.id, next);
        return next;
      });
    },
    [user?.id],
  );

  const markAllSeen = useCallback(
    () => markSeen(feed.filter(item => !item.seen).map(item => item.id)),
    [feed, markSeen],
  );

  return {
    feed,
    unseen: unseenCount(feed),
    markSeen,
    markAllSeen,
  };
};

export type { HomeNotification };
