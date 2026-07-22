import AsyncStorage from '@react-native-async-storage/async-storage';

// Local, per-user wear log — the app's own record of WHEN the user last wore
// each outfit (keyed by `outfit_hash`).
//
// Why this exists: the "Worn N days ago" badge (see wear-history.ts) derives
// its date from a favourite's `updated_at`/`created_at`. But the backend's
// `POST /favourites` upsert, when an outfit is re-worn, "reuses the existing
// favorite, only the mood linkage is updated" — the favourite row itself is
// not touched, so its `updated_at` (a SQLAlchemy `onupdate` column, which only
// fires on a row change) stays frozen at the FIRST save. That means the badge
// can never learn about a re-wear from the backend: it keeps showing the stale
// original date instead of resetting to "Worn today".
//
// So we record every wear locally the moment it happens (the "Wear this" mood
// flow and the heart tap both land here on success) and merge this log into the
// backend-derived wear history, taking the most recent timestamp per hash (see
// `mergeLocalWears`). This makes re-wears reset the badge immediately and
// durably — independent of the backend's frozen `updated_at` — and also covers
// on-device wears that fall outside the favourites lookup window.
//
// Privacy: the blob is keyed by user id, so one user can never read another's.

const KEY_PREFIX = '@auxi/home-wear-log/';

const keyFor = (userId: string | number): string => `${KEY_PREFIX}${userId}`;

// Session-scoped placeholder hashes (`outfit-<index>` from normalizeOutfits) and
// the namespaced schedule hashes (`scheduled-<id>`) are never valid save
// payloads, so a wear can never legitimately be recorded against them. Guarding
// keeps the log clean and avoids a stray entry ever masking a real backend date.
const NON_WEARABLE_PREFIXES = ['outfit-', 'scheduled-'];

const isWearableHash = (hash: string): boolean =>
  !!hash && !NON_WEARABLE_PREFIXES.some(prefix => hash.startsWith(prefix));

/** A hash → last-worn ISO timestamp map, as persisted. */
export type WearLog = Record<string, string>;

const isWearLog = (value: unknown): value is WearLog =>
  value != null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.values(value as Record<string, unknown>).every(
    v => typeof v === 'string',
  );

/**
 * Read this user's local wear log, or `{}` when there's no user, no blob, or a
 * corrupt/unreadable one (so the caller falls back to the backend history
 * rather than crashing).
 */
export const readWearLog = async (
  userId: string | number | undefined,
): Promise<WearLog> => {
  if (userId == null) {
    return {};
  }
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    return isWearLog(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

/**
 * Record a wear locally, keeping the most recent timestamp for a hash.
 *
 * Fire-and-forget and read-modify-write: it reloads the current blob so
 * concurrent Home instances (web remounts) don't clobber each other's entries.
 * A no-op for a missing user, a non-wearable hash, or a bad timestamp — a
 * failed write just means the next launch reads the backend date, never a
 * crash. Returns the merged log so callers can update in-memory state without a
 * re-read.
 */
export const recordWear = async (
  userId: string | number | undefined,
  outfitHash: string,
  worn: string,
): Promise<WearLog> => {
  if (
    userId == null ||
    !isWearableHash(outfitHash) ||
    !worn ||
    Number.isNaN(new Date(worn).getTime())
  ) {
    return {};
  }
  try {
    const current = await readWearLog(userId);
    const existing = current[outfitHash];
    if (existing && new Date(existing).getTime() >= new Date(worn).getTime()) {
      return current;
    }
    const next = { ...current, [outfitHash]: worn };
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(next));
    return next;
  } catch {
    return {};
  }
};
