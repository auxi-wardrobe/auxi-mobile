// useDiscoveryFeed — Discovery feed screen state (AU-457).
//
// Owns filter selection, page accumulation, and the feed's two analytics
// events (`discovery_feed_viewed` on focus, `discovery_filter_applied` on chip
// tap) so DiscoveryScreen stays wiring-only (mirrors `useActiveTrendingDrop`).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { track } from '../services/analytics';
import {
  useDiscoveryOutfits,
  useDiscoveryTrendTags,
} from './useDiscovery';
import type {
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

  useFocusEffect(
    useCallback(() => {
      track('discovery_feed_viewed', {
        ...(seasonRef.current ? { filter_season: seasonRef.current } : {}),
        ...(trendTagRef.current
          ? { filter_trend_tag: trendTagRef.current }
          : {}),
      });
    }, []),
  );

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
    isFilterActive: season !== null || trendTag !== null,
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
