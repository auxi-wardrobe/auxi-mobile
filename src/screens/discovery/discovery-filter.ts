// Discovery feed filters — multi-select season + multi-select trend tag.
//
// Mirrors `screens/wardrobe/wardrobe-filter.ts` deliberately: the Discovery
// filter is the SAME interaction as the wardrobe type filter (a summary pill
// that opens a bottom sheet of multi-select chips, committed on "Show"), so
// the two share a shape and a vocabulary.
//
// The wire contract is the constraint that shapes everything here:
// `GET /discovery/outfits` takes ONE `season` and ONE `trend_tag`
// (`services/discoveryService.ts`). So per axis:
//
//   • 0 selected  → "All" — nothing sent, nothing narrowed.
//   • 1 selected  → sent as the server param. The server narrows; the client
//                   must NOT re-narrow (see `narrowOutfits` for why).
//   • 2+ selected → the axis is dropped from the request and narrowed
//                   CLIENT-side over the accumulated pages, the same
//                   "fetch wide, narrow locally" trade the wardrobe grid makes.
//
// Everything below is pure so it can be unit-tested without a renderer.

import type {
  DiscoveryOutfitCard,
  DiscoverySeason,
} from '../../services/discoveryService';

/** Canonical season order — drives both the chip order and the summary label. */
export const DISCOVERY_SEASONS: DiscoverySeason[] = [
  'spring',
  'summer',
  'fall',
  'winter',
];

// No season selected == "All season". Named so the pill, the sheet and the
// request builder all agree on what "everything" means.
export const isAllSeasons = (selected: DiscoverySeason[]): boolean =>
  selected.length === 0;

/** No tag selected == every tag. */
export const isAllTrendTags = (selected: string[]): boolean =>
  selected.length === 0;

// Toggle one season in the current multi-selection. Pure; returns a new array
// in canonical DISCOVERY_SEASONS order so the summary label is stable
// regardless of tap order.
export const toggleSeason = (
  selected: DiscoverySeason[],
  season: DiscoverySeason,
): DiscoverySeason[] => {
  const next = selected.includes(season)
    ? selected.filter(s => s !== season)
    : [...selected, season];
  return DISCOVERY_SEASONS.filter(s => next.includes(s));
};

// Toggle one trend tag. Tags are server-authored and unordered, so `available`
// (the `/discovery/trend-tags` list) supplies the canonical order. A selected
// tag that is no longer offered keeps its place at the end rather than being
// silently dropped — the user can still see and clear it.
export const toggleTrendTag = (
  selected: string[],
  tag: string,
  available: string[],
): string[] => {
  const next = selected.includes(tag)
    ? selected.filter(t => t !== tag)
    : [...selected, tag];
  return [
    ...available.filter(t => next.includes(t)),
    ...next.filter(t => !available.includes(t)),
  ];
};

export interface DiscoveryServerFilters {
  season?: DiscoverySeason;
  trendTag?: string;
}

/**
 * The subset of the selection the BACKEND can apply. An axis is only sent when
 * exactly one value is selected, because the endpoint takes a scalar. Two
 * seasons is not expressible on the wire, so that axis is dropped here and
 * picked up by `narrowOutfits` instead.
 */
export const toServerFilters = (
  seasons: DiscoverySeason[],
  trendTags: string[],
): DiscoveryServerFilters => ({
  season: seasons.length === 1 ? seasons[0] : undefined,
  trendTag: trendTags.length === 1 ? trendTags[0] : undefined,
});

/** True when at least one axis has to be narrowed on the client. */
export const needsClientNarrowing = (
  seasons: DiscoverySeason[],
  trendTags: string[],
): boolean => seasons.length > 1 || trendTags.length > 1;

/**
 * Client-side narrowing of the accumulated feed.
 *
 * Only axes with 2+ selections are narrowed. An axis with exactly one value
 * was already applied by the backend and is deliberately left alone: the
 * server owns the definition of "this outfit belongs to summer" (an outfit's
 * `season` is nullable and the backend may well serve untagged rows for a
 * season query), and re-deriving it here from `outfit.season === season` would
 * quietly change what a single-season filter returns.
 *
 * Within an axis the selections are OR'd (summer OR winter); across axes they
 * are AND'd (a summer/winter outfit that also carries one of the chosen tags).
 */
export const narrowOutfits = (
  outfits: DiscoveryOutfitCard[],
  seasons: DiscoverySeason[],
  trendTags: string[],
): DiscoveryOutfitCard[] => {
  if (!needsClientNarrowing(seasons, trendTags)) {
    return outfits;
  }
  const bySeason = seasons.length > 1 ? seasons : null;
  const byTag = trendTags.length > 1 ? trendTags : null;
  return outfits.filter(outfit => {
    if (bySeason && (!outfit.season || !bySeason.includes(outfit.season))) {
      return false;
    }
    if (byTag && !outfit.trend_tags?.some(tag => byTag.includes(tag))) {
      return false;
    }
    return true;
  });
};

// Compact label for a summary pill: "All season" when nothing is selected,
// otherwise the selected labels joined — "Summer, Winter".
export const summaryLabel = <T extends string>(
  selected: T[],
  labelFor: (value: T) => string,
  allLabel: string,
): string =>
  selected.length === 0 ? allLabel : selected.map(labelFor).join(', ');

/** Stable analytics dimension for a filter axis — 'all' or the joined values. */
export const analyticsValue = (selected: string[]): string =>
  selected.length === 0 ? 'all' : selected.join(',');
