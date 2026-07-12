// Persistent "last successful See-this-on-me result" cache.
//
// When a self-visualization render succeeds, the composite (AI try-on) image
// URL is durable on the backend — but the app never remembered WHICH outfit it
// belonged to, so re-tapping "See on me" on the same outfit always re-ran the
// whole capture/reuse flow. This module closes that gap: it maps an
// `outfitHash → last successful result URL` so re-entry can show the previous
// AI photo immediately (with a Retake affordance) instead of regenerating.
//
// Mirrors the recommendationMemory pattern (services/recommendationMemory.ts):
// a small in-memory map kept at module scope (so reads are synchronous during
// the See-this-on-me mount) that is mirrored to AsyncStorage keyed PER USER so
// it survives app restarts.
//
// Privacy: the persisted blob is keyed by user id, so one user can never read
// another's try-on results. On logout we drop the in-memory map (see
// `setTryOnResultUser(null)`) but intentionally LEAVE the per-user blob on disk
// so the same user keeps continuity on re-login. AuthContext owns the identity
// transitions that drive hydrate / clear.

import AsyncStorage from '@react-native-async-storage/async-storage';

// Bound the persisted map so it can't grow without limit — a user only ever
// needs the most recent looks back. Oldest entries are evicted first.
const MAX_REMEMBERED = 40;
const KEY_PREFIX = '@auxi/tryon-result/';

interface StoredResult {
  hash: string;
  url: string;
  /** Epoch ms of the last write — used for LRU eviction (oldest dropped). */
  savedAt: number;
}

// Active user's storage key + the in-memory map (hash → entry). `null` key =
// signed out; writes still update the map but `persist()` is a no-op, so
// nothing is written without an owner.
let activeUserKey: string | null = null;
let results = new Map<string, StoredResult>();

const storageKeyFor = (userId: string): string => `${KEY_PREFIX}${userId}`;

const isStoredResultArray = (value: unknown): value is StoredResult[] =>
  Array.isArray(value) &&
  value.every(
    e =>
      e != null &&
      typeof e === 'object' &&
      typeof (e as StoredResult).hash === 'string' &&
      typeof (e as StoredResult).url === 'string' &&
      typeof (e as StoredResult).savedAt === 'number',
  );

/** Fire-and-forget mirror to disk. A failed write just means re-entry falls
 *  back to regenerating next session — never worth surfacing or blocking on. */
const persist = (): void => {
  if (!activeUserKey) {
    return;
  }
  AsyncStorage.setItem(
    activeUserKey,
    JSON.stringify(Array.from(results.values())),
  ).catch(() => {});
};

/**
 * Point the result cache at a user (login / cold-start restore) or clear it
 * (logout / session expiry). Hydrates the map from that user's persisted blob
 * so re-entry benefits from prior sessions. Passing `null` drops the in-memory
 * map WITHOUT deleting the on-disk blob, so the same user keeps continuity on
 * re-login while a different user never sees it.
 */
export const setTryOnResultUser = async (
  userId: string | null,
): Promise<void> => {
  const nextKey = userId ? storageKeyFor(userId) : null;
  if (nextKey === activeUserKey) {
    return;
  }
  activeUserKey = nextKey;
  results = new Map();
  if (!nextKey) {
    return;
  }
  try {
    const raw = await AsyncStorage.getItem(nextKey);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (isStoredResultArray(parsed)) {
      for (const entry of parsed) {
        results.set(entry.hash, entry);
      }
    }
  } catch {
    // Corrupt/unreadable store → behave as empty rather than crashing the flow.
    results = new Map();
  }
};

/**
 * Record the last successful try-on result for an outfit. Re-writing an outfit
 * moves it to the most-recent position; the oldest entries beyond
 * `MAX_REMEMBERED` are evicted so the persisted blob stays bounded.
 */
export const recordTryOnResult = (
  outfitHash: string,
  resultUrl: string,
  now: number = Date.now(),
): void => {
  if (!outfitHash || !resultUrl) {
    return;
  }
  // Delete-then-set so the re-written entry lands at the end of the Map's
  // insertion order (Map preserves it) — the tail is "most recent".
  results.delete(outfitHash);
  results.set(outfitHash, { hash: outfitHash, url: resultUrl, savedAt: now });
  while (results.size > MAX_REMEMBERED) {
    const oldest = results.keys().next().value as string | undefined;
    if (oldest === undefined) {
      break;
    }
    results.delete(oldest);
  }
  persist();
};

/**
 * The last successful try-on result URL for an outfit, or `null` when none has
 * been generated yet. Synchronous (reads the in-memory map) so the
 * See-this-on-me screen can decide on mount whether to show the cached result.
 */
export const getTryOnResult = (outfitHash: string): string | null => {
  return results.get(outfitHash)?.url ?? null;
};

/**
 * Forget the cached result for an outfit (e.g. the user retook and we don't
 * want the stale photo to reappear before the new render finishes).
 */
export const clearTryOnResult = (outfitHash: string): void => {
  if (results.delete(outfitHash)) {
    persist();
  }
};
