// useDiscoveryFeed — Discovery feed screen state (AU-457).
//
// Owns filter selection, page accumulation, and the feed's analytics events
// (`discovery_feed_viewed` on focus, `discovery_filter_applied` on apply,
// `discovery_feed_empty` on a blacked-out cohort) so DiscoveryScreen stays
// wiring-only (mirrors `useActiveTrendingDrop`).
//
// Both filter axes are MULTI-select (season and trend tag), matching the
// wardrobe type filter. `GET /discovery/outfits` only accepts one value per
// axis, so an axis with 2+ selections is dropped from the request and narrowed
// client-side over the accumulated pages — see `screens/discovery/
// discovery-filter.ts` for the split, and the MIN_NARROWED_RESULTS effect
// below for the pagination consequence.
//
// The feed is gender-filtered SERVER-side from the user's onboarding
// direction — this hook sends nothing for it and needs no gender state. It
// only reports the applied value so a blackout is visible in Mixpanel.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { track } from '../services/analytics';
import { useDiscoveryOutfits, useDiscoveryTrendTags } from './useDiscovery';
import {
  analyticsValue,
  narrowOutfits,
  needsClientNarrowing,
  toServerFilters,
} from '../screens/discovery/discovery-filter';
import type {
  DiscoveryGender,
  DiscoveryOutfitCard,
  DiscoverySeason,
} from '../services/discoveryService';

const PAGE_SIZE = 20;

// When an axis is narrowed client-side a whole server page can survive as zero
// tiles, leaving nothing to scroll and so no `onEndReached` to fetch the next
// page. The hook keeps pulling pages until the grid holds at least one
// screenful (2 columns x 3 rows) or the catalogue runs out.
const MIN_NARROWED_RESULTS = 6;

export interface UseDiscoveryFeed {
  seasons: DiscoverySeason[];
  selectedTrendTags: string[];
  trendTags: string[];
  outfits: DiscoveryOutfitCard[];
  isFilterActive: boolean;
  loading: boolean;
  loadingMore: boolean;
  loadError: boolean;
  hasMore: boolean;
  onSeasonsChange: (next: DiscoverySeason[]) => void;
  onTrendTagsChange: (next: string[]) => void;
  onEndReached: () => void;
  onRetry: () => void;
}

export const useDiscoveryFeed = (): UseDiscoveryFeed => {
  const [seasons, setSeasons] = useState<DiscoverySeason[]>([]);
  const [selectedTrendTags, setSelectedTrendTags] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  const [rawOutfits, setRawOutfits] = useState<DiscoveryOutfitCard[]>([]);
  const [total, setTotal] = useState(0);
  const [lastPageCount, setLastPageCount] = useState(0);
  // Offset of the most recently merged page — `null` until the first one
  // lands. Compared against `offset` so the auto-advance below can tell "the
  // page I asked for is in" from "the request is still in flight".
  const [loadedOffset, setLoadedOffset] = useState<number | null>(null);

  // Identity of the current filter selection — the thing page accumulation is
  // scoped to. A plain string so it compares by value: the selection arrays get
  // a fresh identity on every "Show" tap even when nothing actually changed.
  const filterKey = `${seasons.join(',')}|${selectedTrendTags.join(',')}`;

  const serverFilters = toServerFilters(seasons, selectedTrendTags);
  const filters = useMemo(
    () => ({
      season: serverFilters.season,
      trendTag: serverFilters.trendTag,
      limit: PAGE_SIZE,
      offset,
    }),
    [serverFilters.season, serverFilters.trendTag, offset],
  );

  const outfitsQuery = useDiscoveryOutfits(filters);
  const trendTagsQuery = useDiscoveryTrendTags();

  // Pages held by offset rather than blind-appended, keyed by the filter they
  // belong to. Blind appending breaks two ways that both show up as duplicated
  // or vanished tiles: a background refetch of page 0 lands while `offset` is
  // already 20 (appending page 0 a second time), and returning to a filter
  // whose first page is still cached delivers no new `data` identity to append
  // at all.
  const pagesRef = useRef<{
    key: string;
    pages: Map<number, DiscoveryOutfitCard[]>;
  }>({ key: filterKey, pages: new Map() });

  useEffect(() => {
    const data = outfitsQuery.data;
    if (!data) {
      return;
    }
    const store = pagesRef.current;
    if (store.key !== filterKey) {
      store.key = filterKey;
      store.pages = new Map();
    }
    store.pages.set(data.offset ?? offset, data.outfits);
    setRawOutfits(
      [...store.pages.entries()]
        .sort((a, b) => a[0] - b[0])
        .flatMap(([, page]) => page),
    );
    setTotal(data.total);
    setLastPageCount(data.outfits.length);
    setLoadedOffset(data.offset ?? offset);
  }, [outfitsQuery.data, filterKey, offset]);

  // A filter change starts a fresh page. Done in the change handlers rather
  // than in an effect so the reset lands in the SAME commit as the selection —
  // an effect would let one render pair the new filter with the old offset.
  const resetPages = useCallback(() => {
    setOffset(0);
    setRawOutfits([]);
    setTotal(0);
    setLastPageCount(0);
    setLoadedOffset(null);
  }, []);

  // What the grid actually renders: the accumulated pages with any 2+-value
  // axis applied locally (a no-op when the backend could express the filter).
  const outfits = useMemo(
    () => narrowOutfits(rawOutfits, seasons, selectedTrendTags),
    [rawOutfits, seasons, selectedTrendTags],
  );

  // A page that comes back empty means the catalogue is exhausted regardless of
  // what `total` claims — without it a stale total would spin the auto-advance
  // below forever.
  const exhausted = lastPageCount === 0 && rawOutfits.length > 0;
  const hasMore = !exhausted && rawOutfits.length < total;
  const loading = outfitsQuery.isLoading && offset === 0;
  const loadingMore = outfitsQuery.isFetching && offset > 0;
  const loadError = outfitsQuery.isError && rawOutfits.length === 0;

  // Client-side narrowing can hide an entire server page, so the list would
  // render empty with no way to scroll for more. Pull pages until the grid has
  // a screenful or the catalogue ends.
  //
  // `loadedOffset === offset` is the step gate: it advances only once the page
  // it last asked for has actually been merged, so an in-flight request can
  // never be skipped over. That also makes the walk terminate — every pass
  // costs one real page, and `hasMore` goes false once the merged pages cover
  // `total` (or a page comes back empty).
  const narrowing = needsClientNarrowing(seasons, selectedTrendTags);
  useEffect(() => {
    if (!narrowing || !hasMore || loading || loadingMore || loadError) {
      return;
    }
    if (loadedOffset !== offset || outfits.length >= MIN_NARROWED_RESULTS) {
      return;
    }
    setOffset(prev => prev + PAGE_SIZE);
  }, [
    narrowing,
    hasMore,
    loading,
    loadingMore,
    loadError,
    outfits.length,
    offset,
    loadedOffset,
  ]);

  // Fires once per screen focus (mount + every re-focus), with whatever
  // filter is active AT focus time — refs avoid re-firing on every in-session
  // filter tweak (that path is covered by discovery_filter_applied below).
  const seasonsRef = useRef(seasons);
  const trendTagsRef = useRef(selectedTrendTags);
  useEffect(() => {
    seasonsRef.current = seasons;
    trendTagsRef.current = selectedTrendTags;
  }, [seasons, selectedTrendTags]);

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
        ...(seasonsRef.current.length
          ? { filter_season: analyticsValue(seasonsRef.current) }
          : {}),
        ...(trendTagsRef.current.length
          ? { filter_trend_tag: analyticsValue(trendTagsRef.current) }
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
  const isFilterActive = seasons.length > 0 || selectedTrendTags.length > 0;
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

  const onSeasonsChange = useCallback(
    (next: DiscoverySeason[]) => {
      setSeasons(next);
      resetPages();
      track('discovery_filter_applied', {
        filter_type: 'season',
        filter_value: analyticsValue(next),
      });
    },
    [resetPages],
  );

  const onTrendTagsChange = useCallback(
    (next: string[]) => {
      setSelectedTrendTags(next);
      resetPages();
      track('discovery_filter_applied', {
        filter_type: 'trend',
        filter_value: analyticsValue(next),
      });
    },
    [resetPages],
  );

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
    seasons,
    selectedTrendTags,
    trendTags: trendTagsQuery.data ?? [],
    outfits,
    isFilterActive,
    loading,
    loadingMore,
    loadError,
    hasMore,
    onSeasonsChange,
    onTrendTagsChange,
    onEndReached,
    onRetry,
  };
};
