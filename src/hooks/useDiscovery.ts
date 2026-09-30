// AU-457 Discovery — feed/detail/trend-tag queries.
//
// Curated content changes rarely (admin-authored, not user-generated), so
// every query here uses a 60s `staleTime` and no focus-refetch — matches the
// `useActiveTrendingDrop` / wardrobe-list caching posture for similarly
// low-churn server state. All query keys share the `DISCOVERY_QUERY_KEY` root
// so a season/tag filter change never collides with a stale cache entry, and
// `invalidateQueries({ queryKey: [DISCOVERY_QUERY_KEY] })` clears every variant.

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  discoveryService,
  type DiscoveryColorOption,
  type DiscoveryListParams,
  type DiscoveryOutfitDetail,
  type DiscoveryOutfitsResponse,
} from '../services/discoveryService';

export const DISCOVERY_QUERY_KEY = 'discovery';
const DISCOVERY_STALE_TIME_MS = 60_000;

/**
 * A fresh shuffle seed for `DiscoveryListParams.seed`. Opaque to the server
 * (it only hashes it), so it needs to be distinct per draw, not
 * cryptographically random.
 */
export const newDiscoveryShuffleSeed = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

/**
 * Feed query — one cache entry per (season, tag, colors, seed, offset) page.
 *
 * `keepPrevious` holds the last page on screen while a new key loads (the
 * Home strip reshuffling on focus). Off by default: the Discovery feed merges
 * pages by filter, and a previous filter's page served as a placeholder would
 * be merged under the new one.
 */
export const useDiscoveryOutfits = (
  filters: DiscoveryListParams = {},
  options: { keepPrevious?: boolean } = {},
) =>
  useQuery<DiscoveryOutfitsResponse>({
    // `offset` is part of the key, not just the closure: without it every page
    // of a given filter shares one cache entry, so advancing the offset returns
    // the cached first page (still fresh inside `staleTime`) and pagination
    // silently stops after page 1.
    queryKey: [
      DISCOVERY_QUERY_KEY,
      'outfits',
      filters.season ?? null,
      filters.trendTag ?? null,
      filters.colors?.length ? filters.colors.join(',') : null,
      // A different seed is a different order: page 2 of one shuffle must
      // never be served from the cache of another.
      filters.seed ?? null,
      filters.offset ?? 0,
    ],
    queryFn: () => discoveryService.listOutfits(filters),
    staleTime: DISCOVERY_STALE_TIME_MS,
    refetchOnWindowFocus: false,
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
  });

/**
 * One outfit's detail. `data` resolves `null` on a 404 (missing or
 * unpublished, see `discoveryService.getOutfit`) — callers render the
 * "no longer available" state off `data === null`, not off `isError`.
 */
export const useDiscoveryOutfit = (id: string | undefined) =>
  useQuery<DiscoveryOutfitDetail | null>({
    queryKey: [DISCOVERY_QUERY_KEY, 'outfit', id],
    queryFn: () => discoveryService.getOutfit(id as string),
    enabled: !!id,
    staleTime: DISCOVERY_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });

/** Distinct trend tags across every servable outfit — powers the filter row. */
export const useDiscoveryTrendTags = () =>
  useQuery<string[]>({
    queryKey: [DISCOVERY_QUERY_KEY, 'trend-tags'],
    queryFn: () => discoveryService.listTrendTags(),
    staleTime: DISCOVERY_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });

/** Colors present across every servable outfit — powers the color filter. */
export const useDiscoveryColors = () =>
  useQuery<DiscoveryColorOption[]>({
    queryKey: [DISCOVERY_QUERY_KEY, 'colors'],
    queryFn: () => discoveryService.listColors(),
    staleTime: DISCOVERY_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });
