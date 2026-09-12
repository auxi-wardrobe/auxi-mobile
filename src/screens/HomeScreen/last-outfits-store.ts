import AsyncStorage from '@react-native-async-storage/async-storage';
import { OutfitSheet } from './types';

// Persistent "latest suggestions" store — powers the "View latest outfits" CTA
// on the styling-limit page.
//
// Home's live deck already survives an in-session remount via the in-memory
// `deck-cache`, but that's wiped when the app is quit. So when a user returns
// the next day already over their daily styling limit, there's nothing in
// memory to show. This module mirrors the freshest few RECOMMENDATION sheets
// (their full item data + hash + caption) to AsyncStorage, keyed PER USER, so
// they can be restored read-only without re-hitting the AI engine.
//
// Why not the backend history endpoint: the live recommendation flow is the
// V05 engine, which does not write to the legacy `recommendation_logs` table
// that `GET /recommendation/history` reads — so that endpoint is empty for
// current users. Persisting client-side is the only source that reflects the
// outfits the app actually showed.
//
// Privacy: the blob is keyed by user id, so one user can never read another's.

const KEY_PREFIX = '@auxi/home-latest-outfits/';

const keyFor = (userId: string | number): string => `${KEY_PREFIX}${userId}`;

// A stored sheet is the display essentials only (items carry their own image
// urls, so no hydration is needed on restore).
//
// `savedAt` (epoch ms) was added so a reader can tell TODAY's suggestions from
// a previous day's — the Home landing page shows these under "Today's picks"
// and cold-starts a fresh build when the blob is stale. It is OPTIONAL on read:
// a blob written before this field existed simply has no date, and is treated
// as unknown-age rather than stale, so nothing regresses on upgrade.
type StoredSheet = Pick<OutfitSheet, 'items' | 'outfitHash' | 'caption'> & {
  savedAt?: number;
};

const isStoredSheetArray = (value: unknown): value is StoredSheet[] =>
  Array.isArray(value) &&
  value.every(
    o =>
      o != null &&
      typeof o === 'object' &&
      typeof (o as StoredSheet).outfitHash === 'string' &&
      Array.isArray((o as StoredSheet).items),
  );

/**
 * Persist up to `max` recommendation sheets as this user's "latest outfits".
 * Fire-and-forget: a failed write just means the next over-limit return has
 * nothing to restore — never worth surfacing or blocking on. A no-op when
 * there's no user or nothing to store (so it never clobbers a good blob with an
 * empty one during a transient empty deck).
 */
export const persistLatestOutfits = (
  userId: string | number | undefined,
  outfits: OutfitSheet[],
  max: number,
  now: number = Date.now(),
): void => {
  if (userId == null || outfits.length === 0 || max <= 0) {
    return;
  }
  const trimmed: StoredSheet[] = outfits.slice(-max).map(o => ({
    items: o.items,
    outfitHash: o.outfitHash,
    caption: o.caption ?? null,
    savedAt: now,
  }));
  AsyncStorage.setItem(keyFor(userId), JSON.stringify(trimmed)).catch(() => {});
};

/**
 * Read this user's persisted latest outfits, or `[]` when there's no user, no
 * blob, or a corrupt/unreadable one (so the caller falls back to the empty
 * message rather than crashing).
 */
export const readLatestOutfits = async (
  userId: string | number | undefined,
): Promise<OutfitSheet[]> => (await readLatestOutfitsEntry(userId)).sheets;

/**
 * As `readLatestOutfits`, plus WHEN the blob was written (epoch ms), or `null`
 * when it is unknown — either because there is nothing stored or because the
 * blob predates the `savedAt` field. Callers that care about freshness (the
 * landing page's "Today's picks") use this; everything else keeps the simpler
 * accessor above.
 */
export const readLatestOutfitsEntry = async (
  userId: string | number | undefined,
): Promise<{ sheets: OutfitSheet[]; savedAt: number | null }> => {
  const empty = { sheets: [] as OutfitSheet[], savedAt: null };
  if (userId == null) {
    return empty;
  }
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) {
      return empty;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!isStoredSheetArray(parsed)) {
      return empty;
    }
    // Every sheet in one write shares a timestamp; read it off the newest.
    const savedAt = parsed[parsed.length - 1]?.savedAt;
    return {
      sheets: parsed,
      savedAt: typeof savedAt === 'number' ? savedAt : null,
    };
  } catch {
    return empty;
  }
};
