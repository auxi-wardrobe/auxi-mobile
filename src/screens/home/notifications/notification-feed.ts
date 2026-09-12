import type { WardrobeItem } from '../../../services/wardrobeService';
import type { TryOnResultEntry } from '../../../services/tryOnResultStore';

// The Home bell's feed. Two kinds of result the user kicked off and then
// walked away from, both of which finish asynchronously and today only
// announce themselves through a push notification or a snackbar the user has
// to be on the right screen to catch:
//
//   • 'tryon'    — a "See this on me" render that completed. Source: the
//                  per-user `tryOnResultStore` (outfitHash → composite URL).
//   • 'beautify' — an Enhance-image studio shot that is READY and still
//                  awaiting the user's accept/discard. Source: the shared
//                  wardrobe list cache (`beautify_status === 'ready'`).
//
// Both are things the app ALREADY knows — this adds no endpoint and no
// polling, it just stops the results from being invisible once the snackbar
// is gone. Anything not in a terminal, actionable state is excluded: a
// 'pending' beautify has nothing to show yet, and 'accepted'/'discarded'/
// 'failed' are done or dead.

export type HomeNotificationKind = 'tryon' | 'beautify';

export interface HomeNotification {
  /** Stable identity, also the key of the per-user "seen" set. */
  id: string;
  kind: HomeNotificationKind;
  /** Epoch ms the result landed — the feed's sort key. */
  at: number;
  /** Thumbnail to show on the row, when one is known. */
  imageUrl?: string;
  /** Whatever the row needs to navigate: outfit hash or wardrobe item id. */
  targetId: string;
  /** Composite image URL — 'tryon' only (TryOnResult takes it directly). */
  compositeUrl?: string;
  /** Item display name — 'beautify' only, for the row's subtitle. */
  itemName?: string;
  seen: boolean;
}

/** Newest first, and never unbounded — the bell is a glance, not an archive. */
export const MAX_NOTIFICATIONS = 20;

const parseTime = (value: string | undefined): number => {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const tryOnNotificationId = (entry: TryOnResultEntry): string =>
  // The timestamp is part of the id ON PURPOSE: re-rendering the same outfit
  // is a NEW result the user has not seen, so it must not inherit the old
  // row's "seen" flag.
  `tryon:${entry.hash}:${entry.savedAt}`;

export const beautifyNotificationId = (item: WardrobeItem): string =>
  `beautify:${item.id}:${parseTime(item.updated_at ?? item.created_at)}`;

/**
 * Build the feed from the two sources plus the set of ids the user has
 * already opened. Pure and synchronous — the hook supplies the inputs.
 */
export const buildNotificationFeed = (
  tryOnEntries: readonly TryOnResultEntry[],
  wardrobeItems: WardrobeItem[],
  seenIds: ReadonlySet<string>,
): HomeNotification[] => {
  const tryOn: HomeNotification[] = tryOnEntries
    .filter(entry => !!entry.url)
    .map(entry => {
      const id = tryOnNotificationId(entry);
      return {
        id,
        kind: 'tryon' as const,
        at: entry.savedAt,
        imageUrl: entry.url,
        compositeUrl: entry.url,
        targetId: entry.hash,
        seen: seenIds.has(id),
      };
    });

  const beautify: HomeNotification[] = wardrobeItems
    // 'ready' is the only actionable state: a candidate exists and the user
    // has neither accepted nor discarded it yet.
    .filter(item => item.beautify_status === 'ready')
    .map(item => {
      const id = beautifyNotificationId(item);
      return {
        id,
        kind: 'beautify' as const,
        at: parseTime(item.updated_at ?? item.created_at),
        // Show the CANDIDATE (that's what's ready to review); fall back to the
        // item's current image so a row is never blank.
        imageUrl: item.image_studio_candidate ?? item.image_png ?? item.image_url,
        targetId: item.id,
        itemName: item.name,
        seen: seenIds.has(id),
      };
    });

  return [...tryOn, ...beautify]
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_NOTIFICATIONS);
};

/** Rows the user has not opened yet — drives the bell's badge dot. */
export const unseenCount = (feed: HomeNotification[]): number =>
  feed.reduce((count, item) => (item.seen ? count : count + 1), 0);
