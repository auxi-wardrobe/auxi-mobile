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

/**
 * Bucket favourites by calendar day (using `created_at`), most recent day
 * first. Within a day the input order is preserved — the caller already asks
 * the API for `sort: 'recent'`, so the newest outfit leads each group.
 */
export const groupFavouritesByDate = (
  favourites: Favourite[],
): FavouriteDateGroup[] => {
  const buckets = new Map<string, FavouriteDateGroup>();

  for (const fav of favourites) {
    const dayKey = toDayKey(fav.created_at);
    const existing = buckets.get(dayKey);
    if (existing) {
      existing.favourites.push(fav);
    } else {
      buckets.set(dayKey, {
        dayKey,
        label: formatDateLabel(fav.created_at),
        favourites: [fav],
      });
    }
  }

  return Array.from(buckets.values()).sort((a, b) =>
    a.dayKey < b.dayKey ? 1 : a.dayKey > b.dayKey ? -1 : 0,
  );
};
