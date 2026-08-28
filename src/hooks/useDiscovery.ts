// AU-457 Discovery — feed/detail/trend-tag queries.
//
// Curated content changes rarely (admin-authored, not user-generated), so
// every query here uses a 60s `staleTime` and no focus-refetch — matches the
// `useActiveTrendingDrop` / wardrobe-list caching posture for similarly
// low-churn server state. All query keys share the `DISCOVERY_QUERY_KEY` root
// so a season/tag filter change never collides with a stale cache entry, and
// `invalidateQueries({ queryKey: [DISCOVERY_QUERY_KEY] })` clears every variant.

import { useQuery } from '@tanstack/react-query';
import {
  discoveryService,
  type DiscoveryListParams,
  type DiscoveryOutfitDetail,
  type DiscoveryOutfitsResponse,
} from '../services/discoveryService';

export const DISCOVERY_QUERY_KEY = 'discovery';
const DISCOVERY_STALE_TIME_MS = 60_000;

/** Feed query — refetches whenever the season/tag filter changes. */
export const useDiscoveryOutfits = (filters: DiscoveryListParams = {}) =>
  useQuery<DiscoveryOutfitsResponse>({
    queryKey: [DISCOVERY_QUERY_KEY, 'outfits', filters.season ?? null, filters.trendTag ?? null],
    queryFn: () => discoveryService.listOutfits(filters),
    staleTime: DISCOVERY_STALE_TIME_MS,
    refetchOnWindowFocus: false,
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
