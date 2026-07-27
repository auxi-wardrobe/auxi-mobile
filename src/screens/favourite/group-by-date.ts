import { Favourite } from '../../services/favouriteService';

export interface FavouriteDateGroup {
  /** Display label for the group header, e.g. "6 May". */
  label: string;
  /** Sortable key (YYYY-MM-DD) used to order groups, most recent first. */
  dayKey: string;
  favourites: Favourite[];
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** "2026-05-06T..." → "6 May" (Figma date-header format). */
export const formatDateLabel = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** "2026-05-06T..." → "2026-05-06" sort key (empty string when unparseable). */
const toDayKey = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const time = (iso: string): number => {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/** Local wear log projected onto the favourites list: `outfit_hash → last-worn
 * ISO`. Wearing a look never advances its favourite's `created_at`/`updated_at`
 * (the backend upsert only touches the mood linkage), so this client-side log
 * is the only signal that a saved look was just re-worn. */
export type WornOverrides = Record<string, string>;

/**
 * Effective "last worn" date for a favourite: the local wear log (when it holds
 * a newer stamp for this outfit) wins over the backend `created_at`, so a
 * re-worn look sorts and labels under the day it was actually last worn rather
 * than the day it was first saved. Falls back to `created_at` when there's no
 * override (or the override is older / unusable).
 */
export const effectiveWornAt = (
  fav: Favourite,
  overrides?: WornOverrides,
): string => {
  const hash = fav.outfit_context?.outfit_hash;
  const override = hash ? overrides?.[hash] : undefined;
  if (!override || Number.isNaN(new Date(override).getTime())) {
    return fav.created_at;
  }
  if (Number.isNaN(new Date(fav.created_at).getTime())) {
    return override;
  }
  return time(override) > time(fav.created_at) ? override : fav.created_at;
};

/**
 * Bucket favourites by calendar day of their effective last-worn date, most
 * recent day first, and within a day newest-worn first. `overrides` is the
 * local wear log (see {@link effectiveWornAt}); omit it to fall back to
 * `created_at` for both the bucket and the header label.
 */
export const groupFavouritesByDate = (
  favourites: Favourite[],
  overrides?: WornOverrides,
): FavouriteDateGroup[] => {
  const buckets = new Map<string, FavouriteDateGroup>();

  for (const fav of favourites) {
    const wornAt = effectiveWornAt(fav, overrides);
    const dayKey = toDayKey(wornAt);
    const existing = buckets.get(dayKey);
    if (existing) {
      existing.favourites.push(fav);
    } else {
      buckets.set(dayKey, {
        dayKey,
        label: formatDateLabel(wornAt),
        favourites: [fav],
      });
    }
  }

  // Within a day, order by effective wear time desc so a just-worn look leads
  // its group (backend order is created_at desc, which no longer reflects a
  // re-wear). Ties keep input order via the timestamp comparison.
  for (const bucket of buckets.values()) {
    bucket.favourites.sort(
      (a, b) =>
        time(effectiveWornAt(b, overrides)) -
        time(effectiveWornAt(a, overrides)),
    );
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.dayKey < b.dayKey ? 1 : a.dayKey > b.dayKey ? -1 : 0,
  );
};
