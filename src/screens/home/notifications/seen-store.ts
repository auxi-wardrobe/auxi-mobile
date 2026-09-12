import AsyncStorage from '@react-native-async-storage/async-storage';

// Which notification rows this user has already opened.
//
// Without it the bell's badge would never clear. Mirrors the shape of the
// other small per-user caches in the app (`tryOnResultStore`,
// `last-outfits-store`): an in-memory set for synchronous reads, mirrored to
// AsyncStorage under a per-user key so one user never sees another's state,
// and bounded so it cannot grow forever.
//
// Ids are opaque strings from `notification-feed` and embed the result's
// timestamp, so a NEW render of the same outfit is correctly unseen again.

const KEY_PREFIX = '@auxi/home-notifications-seen/';
// Comfortably above MAX_NOTIFICATIONS so a still-visible row is never
// forgotten and re-marked unread, while the blob stays small.
const MAX_SEEN = 200;

const keyFor = (userId: string | number): string => `${KEY_PREFIX}${userId}`;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(entry => typeof entry === 'string');

/** Read this user's seen ids. Missing/corrupt blob → empty set, never a throw. */
export const readSeenIds = async (
  userId: string | number | undefined,
): Promise<Set<string>> => {
  if (userId == null) {
    return new Set();
  }
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    return isStringArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
};

/**
 * Persist the seen set, keeping only the most recent `MAX_SEEN` ids
 * (insertion order — a Set preserves it, so the tail is newest).
 * Fire-and-forget: a failed write only means a row re-appears unread.
 */
export const writeSeenIds = (
  userId: string | number | undefined,
  ids: ReadonlySet<string>,
): void => {
  if (userId == null) {
    return;
  }
  const trimmed = Array.from(ids).slice(-MAX_SEEN);
  AsyncStorage.setItem(keyFor(userId), JSON.stringify(trimmed)).catch(() => {});
};
