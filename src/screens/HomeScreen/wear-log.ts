import AsyncStorage from '@react-native-async-storage/async-storage';

// Local, per-user wear log — the app's own record of WHEN the user last wore
// each outfit (keyed by `outfit_hash`).
//
// Why this exists: the "Worn N days ago" badge and the Favourites ordering
// derive their date from a favourite's `updated_at`/`created_at`. But the
// backend's `POST /favourites` upsert, when an outfit is re-worn, "reuses the
// existing favorite, only the mood linkage is updated" — the favourite row is
// not touched, so its date stays frozen at the FIRST save. A re-wear therefore
// can't be learned from the backend at all.
//
// So we record every wear locally the moment it happens (the "Wear this" mood
// flow and the heart tap both land here on success) and merge it into the
// backend-derived data, most-recent-per-hash wins.
//
// Two storage layers, because they cover different failure modes:
//   1. A MODULE-LEVEL in-memory cache (`memory`) — the reliable cross-screen /
//      cross-remount channel. The web build unmounts screens on navigation
//      (see deck-cache.ts) and ships NO functional AsyncStorage
//      (@react-native-async-storage has no web build and isn't aliased in
//      vite), so a wear recorded on Home must survive purely in memory to
//      reach the Favourites screen. Same pattern deck-cache uses.
//   2. AsyncStorage — best-effort durability so a native app restart still
//      remembers recent wears. A no-op on web (rejects, caught), which is why
//      layer 1 exists.
//
// Privacy: both layers key by user id, so one user can never read another's.

const KEY_PREFIX = '@auxi/home-wear-log/';

const keyFor = (userId: string | number): string => `${KEY_PREFIX}${userId}`;

// Session-scoped placeholder hashes (`outfit-<index>` from normalizeOutfits) and
// the namespaced schedule hashes (`scheduled-<id>`) are never valid save
// payloads, so a wear can never legitimately be recorded against them. Guarding
// keeps the log clean and avoids a stray entry ever masking a real backend date.
const NON_WEARABLE_PREFIXES = ['outfit-', 'scheduled-'];

const isWearableHash = (hash: string): boolean =>
  !!hash && !NON_WEARABLE_PREFIXES.some(prefix => hash.startsWith(prefix));

/** A hash → last-worn ISO timestamp map, as persisted / cached. */
export type WearLog = Record<string, string>;

// In-memory cache, keyed by user id (as a string). Module scope so it outlives
// any single screen mount — see the header note.
const memory = new Map<string, WearLog>();

const memKey = (userId: string | number): string => String(userId);

const isWearLog = (value: unknown): value is WearLog =>
  value != null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.values(value as Record<string, unknown>).every(
    v => typeof v === 'string',
  );

/** Merge two logs, keeping the newest usable timestamp per hash. */
const mergeNewest = (a: WearLog, b: WearLog): WearLog => {
  const out: WearLog = { ...a };
  for (const [hash, worn] of Object.entries(b)) {
    if (!worn || Number.isNaN(new Date(worn).getTime())) {
      continue;
    }
    const existing = out[hash];
    if (
      !existing ||
      Number.isNaN(new Date(existing).getTime()) ||
      new Date(worn).getTime() > new Date(existing).getTime()
    ) {
      out[hash] = worn;
    }
  }
  return out;
};

/**
 * Synchronously read this user's in-memory wear log (or `{}`). Use this for an
 * instant first paint — it already holds any wear recorded this session, even
 * on web where AsyncStorage is a no-op. Pair it with {@link readWearLog} to
 * also fold in anything persisted from a previous native launch.
 */
export const peekWearLog = (userId: string | number | undefined): WearLog =>
  userId == null ? {} : memory.get(memKey(userId)) ?? {};

/**
 * Read this user's wear log: the persisted blob (native only) merged with the
 * in-memory cache, most-recent-per-hash wins. Returns `{}` for no user. On web
 * (or a corrupt/missing blob) this resolves to just the in-memory cache rather
 * than crashing. Seeds the in-memory cache with the merged result.
 */
export const readWearLog = async (
  userId: string | number | undefined,
): Promise<WearLog> => {
  if (userId == null) {
    return {};
  }
  const cached = memory.get(memKey(userId)) ?? {};
  let persisted: WearLog = {};
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isWearLog(parsed)) {
        persisted = parsed;
      }
    }
  } catch {
    // Web / unavailable storage — fall back to the in-memory cache.
  }
  const merged = mergeNewest(persisted, cached);
  memory.set(memKey(userId), merged);
  return merged;
};

/**
 * Record a wear, keeping the most recent timestamp for a hash. Updates the
 * in-memory cache synchronously (so a subsequent {@link peekWearLog} sees it
 * even before the write settles / on web) and best-effort persists to
 * AsyncStorage. A no-op for a missing user, a non-wearable hash, or a bad
 * timestamp. Returns the merged log.
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
    return userId == null ? {} : peekWearLog(userId);
  }
  const current = memory.get(memKey(userId)) ?? {};
  const existing = current[outfitHash];
  if (existing && new Date(existing).getTime() >= new Date(worn).getTime()) {
    return current;
  }
  const next = { ...current, [outfitHash]: worn };
  memory.set(memKey(userId), next);
  try {
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(next));
  } catch {
    // Web / unavailable storage — the in-memory cache above still carries it
    // for the rest of the session, which is what the Favourites screen reads.
  }
  return next;
};

/** Test-only: clear the in-memory cache between cases. */
export const __resetWearLogMemory = (): void => {
  memory.clear();
};
