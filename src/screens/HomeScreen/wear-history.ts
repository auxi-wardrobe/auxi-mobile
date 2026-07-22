import { Favourite } from '../../services/favouriteService';

/**
 * "Worn X days ago" history for Home recommendations.
 *
 * In this app wearing an outfit == saving it as a favourite (the heart tap and
 * the "Wear this" mood flow both POST `/favourites`, which upserts on
 * `outfit_hash` and refreshes `updated_at`). So the user's saved favourites
 * double as their wear log: the newest `updated_at` for a given `outfit_hash`
 * is the last time they wore that look.
 *
 * When the recommender re-surfaces an outfit the user has already worn, Home
 * reads this map to badge the card ("Worn 12 days ago | Calm and Clear"). Tap
 * "Wear this" again and the backend bumps `updated_at`; invalidating the
 * favourites query rebuilds this map and the badge resets to "Worn today".
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Build `outfit_hash → last-worn ISO timestamp` from the user's favourites.
 * Uses `updated_at` (last wear) and falls back to `created_at`. When the same
 * hash appears more than once, the most recent wear wins. Favourites without a
 * hash (older payloads) or without a usable date are skipped.
 */
export const buildWearHistory = (
  favourites: Favourite[],
): Map<string, string> => {
  const map = new Map<string, string>();
  for (const fav of favourites) {
    const hash = fav.outfit_context?.outfit_hash;
    if (!hash) {
      continue;
    }
    const worn = fav.updated_at || fav.created_at;
    if (!worn || Number.isNaN(new Date(worn).getTime())) {
      continue;
    }
    const existing = map.get(hash);
    if (!existing || new Date(worn).getTime() > new Date(existing).getTime()) {
      map.set(hash, worn);
    }
  }
  return map;
};

/**
 * Overlay the app's local wear log (see wear-log.ts) onto the backend-derived
 * wear history, keeping the most recent timestamp per hash. The backend never
 * bumps a favourite's `updated_at` on a re-wear (its upsert only touches the
 * mood linkage, not the row), so its date is frozen at the first save — the
 * local log is the only source that reflects a repeat wear. Merging here lets a
 * just-worn look reset to "Worn today" and also surfaces on-device wears whose
 * favourite fell outside the lookup window. Returns a new map; inputs are left
 * untouched.
 */
export const mergeLocalWears = (
  wearHistory: Map<string, string>,
  localWears: Record<string, string>,
): Map<string, string> => {
  const merged = new Map(wearHistory);
  for (const [hash, worn] of Object.entries(localWears)) {
    if (!worn || Number.isNaN(new Date(worn).getTime())) {
      continue;
    }
    const existing = merged.get(hash);
    if (!existing || new Date(worn).getTime() > new Date(existing).getTime()) {
      merged.set(hash, worn);
    }
  }
  return merged;
};

/**
 * Whole calendar days between `iso` and `now` (local time), so a look worn
 * yesterday evening reads "1 day ago" rather than "0". Returns `null` when the
 * date is unparseable or in the future (clock skew) — callers hide the badge.
 * `0` means worn earlier today.
 */
export const wornDaysAgo = (iso: string, now: Date): number | null => {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) {
    return null;
  }
  const startOfThen = new Date(
    then.getFullYear(),
    then.getMonth(),
    then.getDate(),
  ).getTime();
  const startOfNow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  // Round: DST transitions make some day spans 23h/25h, which a floor would
  // mis-bucket.
  const days = Math.round((startOfNow - startOfThen) / DAY_MS);
  return days < 0 ? null : days;
};

/**
 * Project a wear-history map into `outfit_hash → days-since-worn`, dropping
 * entries whose date is unusable (see {@link wornDaysAgo}). `now` should be
 * captured once (per mount) so the result is stable across renders.
 */
export const buildWornDaysAgoByHash = (
  wearHistory: Map<string, string>,
  now: Date,
): Record<string, number> => {
  const out: Record<string, number> = {};
  wearHistory.forEach((iso, hash) => {
    const days = wornDaysAgo(iso, now);
    if (days !== null) {
      out[hash] = days;
    }
  });
  return out;
};
