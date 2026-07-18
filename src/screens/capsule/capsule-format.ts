// Pure formatting helpers for the Capsule Wardrobe screens. No React / RN
// imports so they're trivially unit-testable. Copy strings live in i18n; these
// helpers only shape the interpolation values + derive display data.
import type {
  Capsule,
  CapsuleFull,
  CapsuleStatus,
} from '../../services/capsuleService';
import type { WardrobeItem } from '../../services/wardrobeService';
import { resolveItemImage } from '../../utils/url';

/**
 * Best display image for a WardrobeItem (studio → png → url). Coerces the
 * optional WardrobeItem image fields to the shape `resolveItemImage` expects
 * (its `image_url` is required), mirroring WardrobeGridTile.
 */
export const resolveWardrobeItemImage = (
  item: WardrobeItem,
): string | undefined =>
  resolveItemImage({
    image_studio: item.image_studio ?? null,
    image_png: item.image_png ?? null,
    image_url: item.image_url ?? '',
  });

/** A capsule reached a terminal generation state (no longer in flight). */
export const isTerminalStatus = (status: CapsuleStatus): boolean =>
  status === 'success' || status === 'success_with_gaps' || status === 'failed';

/** True when the capsule generated fewer outfits than requested. */
export const hasGaps = (capsule: Pick<CapsuleFull, 'status'>): boolean =>
  capsule.status === 'success_with_gaps';

/**
 * Interpolation values for the gaps banner copy
 * ("We created {{made}} outfits instead of {{target}}.").
 * `made` = outfits actually generated; `target` = requested outfit_target.
 */
export const gapsInterpolation = (
  capsule: Pick<CapsuleFull, 'outfit_count' | 'requirements'>,
): { made: number; target: number } => ({
  made: capsule.outfit_count ?? 0,
  target: capsule.requirements?.outfit_target ?? capsule.outfit_count ?? 0,
});

/**
 * Ordered category rows for the detail groups, filtered to non-empty buckets.
 * Returns a stable key + count so the screen maps them to localized labels.
 */
export type CapsuleCategoryRow = {
  key: 'outer' | 'top' | 'bottom' | 'footwear' | 'accessory';
  count: number;
};

const CATEGORY_ORDER: CapsuleCategoryRow['key'][] = [
  'outer',
  'top',
  'bottom',
  'footwear',
  'accessory',
];

export const categoryRows = (
  groups: CapsuleFull['category_groups'] | undefined,
): CapsuleCategoryRow[] => {
  if (!groups) {
    return [];
  }
  return CATEGORY_ORDER.map(key => ({ key, count: groups[key] ?? 0 })).filter(
    row => row.count > 0,
  );
};

/**
 * Human weather range string with a sensible fallback when the backend hasn't
 * populated `summary.weather_range` yet. Prefers the server string; otherwise
 * derives from the requirements temp range.
 */
export const weatherRangeLabel = (
  capsule: Pick<CapsuleFull, 'summary' | 'requirements'>,
): string => {
  const fromSummary = capsule.summary?.weather_range?.trim();
  if (fromSummary) {
    return fromSummary;
  }
  const { temp_min, temp_max } = capsule.requirements ?? {
    temp_min: null,
    temp_max: null,
  };
  if (typeof temp_min === 'number' && typeof temp_max === 'number') {
    return `${temp_min}°–${temp_max}°C`;
  }
  return '—';
};

/** Whether the create button should be enabled (name is non-blank). */
export const isCapsuleNameValid = (name: string): boolean =>
  name.trim().length > 0;

/** Item ids already present in a capsule — for the "Already in capsule" tag. */
export const capsuleItemIdSet = (
  capsule: Pick<CapsuleFull, 'items'> | undefined,
): Set<string> =>
  new Set((capsule?.items ?? []).map(item => item.id).filter(Boolean));

/** Newest-first sort for the list (defensive — backend already sorts). */
export const sortCapsulesNewestFirst = (capsules: Capsule[]): Capsule[] =>
  [...capsules].sort((a, b) => {
    const at = Date.parse(a.created_at || '') || 0;
    const bt = Date.parse(b.created_at || '') || 0;
    return bt - at;
  });
