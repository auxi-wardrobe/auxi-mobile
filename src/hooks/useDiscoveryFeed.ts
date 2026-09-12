// useDiscoveryFeed — Discovery feed screen state (AU-457).
//
// Owns filter selection, page accumulation, and the feed's analytics events
// (`discovery_feed_viewed` on focus, `discovery_filter_applied` on chip tap,
// `discovery_feed_empty` on a blacked-out cohort) so DiscoveryScreen stays
// wiring-only (mirrors `useActiveTrendingDrop`).
//
// The feed is gender-filtered SERVER-side from the user's onboarding
// direction — this hook sends nothing for it and needs no gender state. It
// only reports the applied value so a blackout is visible in Mixpanel.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { track } from '../services/analytics';
import {
  useDiscoveryOutfits,
  useDiscoveryTrendTags,
} from './useDiscovery';
import type {
  DiscoveryGender,
  DiscoveryOutfitCard,
  DiscoverySeason,
} from '../services/discoveryService';

const PAGE_SIZE = 20;

export interface UseDiscoveryFeed {
  season: DiscoverySeason | null;
  trendTag: string | null;
  trendTags: string[];
  outfits: DiscoveryOutfitCard[];
  isFilterActive: boolean;
  loading: boolean;
  loadingMore: boolean;
  loadError: boolean;
  hasMore: boolean;
  onSeasonChange: (next: DiscoverySeason | null) => void;
  onTrendTagChange: (next: string | null) => void;
  onEndReached: () => void;
  onRetry: () => void;
}

export const useDiscoveryFeed = (): UseDiscoveryFeed => {
  const [season, setSeason] = useState<DiscoverySeason | null>(null);
  const [trendTag, setTrendTag] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [outfits, setOutfits] = useState<DiscoveryOutfitCard[]>([]);

  const filters = useMemo(
    () => ({
      season: season ?? undefined,
      trendTag: trendTag ?? undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [season, trendTag, offset],
  );

  const outfitsQuery = useDiscoveryOutfits(filters);
  const trendTagsQuery = useDiscoveryTrendTags();

  // A filter change starts a fresh page — reset the accumulator and offset so
  // the list reflects the new filtered set instead of the prior page's tail.
  useEffect(() => {
    setOffset(0);
    setOutfits([]);
  }, [season, trendTag]);

  useEffect(() => {
    if (!outfitsQuery.data) {
      return;
    }
    setOutfits(prev =>
      offset === 0
        ? outfitsQuery.data.outfits
        : [...prev, ...outfitsQuery.data.outfits],
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outfitsQuery.data]);

  const total = outfitsQuery.data?.total ?? 0;
  const hasMore = outfits.length < total;
  const loading = outfitsQuery.isLoading && offset === 0;
  const loadingMore = outfitsQuery.isFetching && offset > 0;
  const loadError = outfitsQuery.isError && outfits.length === 0;

  // Fires once per screen focus (mount + every re-focus), with whatever
  // filter is active AT focus time — refs avoid re-firing on every in-session
  // filter tweak (that path is covered by discovery_filter_applied below).
  const seasonRef = useRef(season);
  const trendTagRef = useRef(trendTag);
  useEffect(() => {
    seasonRef.current = season;
    trendTagRef.current = trendTag;
  }, [season, trendTag]);

  // What the server said it applied. Held in a ref because the focus event
  // fires BEFORE the first query resolves — on a cold start it is still null
  // and the property is omitted rather than sent as null.
  const appliedGenderRef = useRef<DiscoveryGender | null>(null);
  useEffect(() => {
    if (outfitsQuery.data) {
      appliedGenderRef.current = outfitsQuery.data.applied_gender;
    }
  }, [outfitsQuery.data]);

  useFocusEffect(
    useCallback(() => {
      track('discovery_feed_viewed', {
        ...(seasonRef.current ? { filter_season: seasonRef.current } : {}),
        ...(trendTagRef.current
          ? { filter_trend_tag: trendTagRef.current }
          : {}),
        ...(appliedGenderRef.current
          ? { wardrobe_gender: appliedGenderRef.current }
          : {}),
      });
    }, []),
  );

  // Strict gender targeting means a cohort with no published outfits for its
  // gender gets a silently EMPTY feed — no error, no crash, nothing to see in
  // logs. This event is how that becomes visible in Mixpanel instead of in a
  // support ticket. Only fires on an UNFILTERED empty feed: a filter that
  // matches nothing is a normal user action, not a coverage failure.
  const isFilterActive = season !== null || trendTag !== null;
  const emptyTrackedRef = useRef(false);
  useEffect(() => {
    const settled = !!outfitsQuery.data && !outfitsQuery.isFetching;
    if (!settled || outfitsQuery.data.total !== 0 || isFilterActive) {
      emptyTrackedRef.current = false;
      return;
    }
    if (emptyTrackedRef.current) {
      return;
    }
    emptyTrackedRef.current = true;
    track('discovery_feed_empty', {
      ...(outfitsQuery.data.applied_gender
        ? { wardrobe_gender: outfitsQuery.data.applied_gender }
        : {}),
    });
  }, [outfitsQuery.data, outfitsQuery.isFetching, isFilterActive]);

  const onSeasonChange = useCallback((next: DiscoverySeason | null) => {
    setSeason(next);
    track('discovery_filter_applied', {
      filter_type: 'season',
      filter_value: next ?? 'all',
    });
  }, []);

  const onTrendTagChange = useCallback((next: string | null) => {
    setTrendTag(next);
    track('discovery_filter_applied', {
      filter_type: 'trend',
      filter_value: next ?? 'all',
    });
  }, []);

  const onEndReached = useCallback(() => {
    if (!loading && !loadingMore && !loadError && hasMore) {
      setOffset(prev => prev + PAGE_SIZE);
    }
  }, [loading, loadingMore, loadError, hasMore]);

  const onRetry = useCallback(() => {
    track('discovery_load_retry_tapped', {});
    outfitsQuery.refetch();
  }, [outfitsQuery]);

  return {
    season,
    trendTag,
    trendTags: trendTagsQuery.data ?? [],
    outfits,
    isFilterActive,
    loading,
    loadingMore,
    loadError,
    hasMore,
    onSeasonChange,
    onTrendTagChange,
    onEndReached,
    onRetry,
  };
};
