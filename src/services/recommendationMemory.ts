// Long-term recommendation memory.
//
// The V05 `/recommendation/build` endpoint accepts a `memory` input
// (`BuildMemory`) — the last-N vibe signatures + reasoning strings the user
// has already seen — which the engine uses for its novelty filter (R10) and
// reasoning de-dup. The shape was wired on the backend long ago but the
// frontend never populated it, so cross-session repeats were never avoided.
//
// This module closes that gap. It keeps a small ring of the most recent
// served outfits at module scope (so it threads into the next `/build`
// instantly) and mirrors it to AsyncStorage keyed PER USER so it survives app
// restarts — i.e. genuinely "long-term", not session-scoped.
//
// Privacy: the persisted blob is keyed by user id, so one user can never read
// another's memory. On logout we drop the in-memory ring (see
// `setRecommendationMemoryUser(null)`) but intentionally LEAVE the per-user
// blob on disk so the same user keeps continuity on re-login. AuthContext owns
// the identity transitions that drive hydrate / clear.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BuildMemory, V05Outfit, VibeSignature } from './v05Api';

/** Backend novelty filter (R10) reads the last 5 — matching that here keeps
 *  the persisted blob bounded and the `/build` payload small. */
const MAX_REMEMBERED = 5;
const KEY_PREFIX = '@auxi/rec-memory/';

interface RememberedOutfit {
  hash: string;
  signature: VibeSignature;
  reasoning: string;
}

// Active user's storage key + the in-memory ring. `null` key = signed out;
// `recordServedOutfit` still updates the ring but `persist()` is a no-op, so
// nothing is written without an owner.
let activeUserKey: string | null = null;
let ring: RememberedOutfit[] = [];

const storageKeyFor = (userId: string): string => `${KEY_PREFIX}${userId}`;

const isRememberedArray = (value: unknown): value is RememberedOutfit[] =>
  Array.isArray(value) &&
  value.every(
    e =>
      e != null &&
      typeof e === 'object' &&
      typeof (e as RememberedOutfit).hash === 'string' &&
      typeof (e as RememberedOutfit).reasoning === 'string' &&
      (e as RememberedOutfit).signature != null,
  );

/** Fire-and-forget mirror to disk. A failed write just means the next session
 *  starts a little colder — never worth surfacing or blocking on. */
const persist = (): void => {
  if (!activeUserKey) {
    return;
  }
  AsyncStorage.setItem(activeUserKey, JSON.stringify(ring)).catch(() => {});
};

/**
 * Point the memory at a user (login / cold-start restore) or clear it
 * (logout / session expiry). Hydrates the ring from that user's persisted
 * blob so their `/build` immediately benefits from prior sessions. Passing
 * `null` drops the in-memory ring WITHOUT deleting the on-disk blob, so the
 * same user keeps continuity on re-login while a different user never sees it.
 */
export const setRecommendationMemoryUser = async (
  userId: string | null,
): Promise<void> => {
  const nextKey = userId ? storageKeyFor(userId) : null;
  if (nextKey === activeUserKey) {
    return;
  }
  activeUserKey = nextKey;
  ring = [];
  if (!nextKey) {
    return;
  }
  try {
    const raw = await AsyncStorage.getItem(nextKey);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (isRememberedArray(parsed)) {
      ring = parsed.slice(-MAX_REMEMBERED);
    }
  } catch {
    // Corrupt/unreadable store → behave as empty rather than crashing a build.
    ring = [];
  }
};

/**
 * Record an outfit the user was just served (build anchor or try_another
 * serve). Skips consecutive re-serves of the same outfit (try_another
 * `cycled`) so the memory stays a list of DISTINCT recent looks. Keeps only
 * the last `MAX_REMEMBERED`.
 */
export const recordServedOutfit = (
  outfit: Pick<V05Outfit, 'vibe_signature' | 'reasoning_human' | 'outfit_hash'>,
): void => {
  if (!outfit?.vibe_signature || !outfit.outfit_hash) {
    return;
  }
  if (ring.length > 0 && ring[ring.length - 1].hash === outfit.outfit_hash) {
    return;
  }
  ring.push({
    hash: outfit.outfit_hash,
    signature: outfit.vibe_signature,
    reasoning: outfit.reasoning_human ?? '',
  });
  if (ring.length > MAX_REMEMBERED) {
    ring = ring.slice(-MAX_REMEMBERED);
  }
  persist();
};

/**
 * The `memory` payload for the next `/build`, or `undefined` when nothing has
 * been served yet (the backend treats empty arrays as a no-op, so we omit the
 * field entirely to keep the request minimal).
 */
export const getBuildMemory = (): BuildMemory | undefined => {
  if (ring.length === 0) {
    return undefined;
  }
  return {
    recent_signatures: ring.map(r => r.signature),
    recent_reasoning_used: ring.map(r => r.reasoning).filter(Boolean),
  };
};
