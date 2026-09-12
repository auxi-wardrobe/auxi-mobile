/* eslint-env jest */
/**
 * The Home bell's feed: completed "See this on me" renders and READY
 * Enhance-image studio shots.
 *
 * The rules this locks:
 *  - only actionable results appear — a 'pending' beautify has nothing to show
 *    and 'accepted'/'discarded'/'failed' are done or dead;
 *  - the two kinds interleave strictly by time, newest first;
 *  - re-rendering the same outfit is a NEW unread row, not the old one
 *    inheriting its "seen" flag.
 */
import type { WardrobeItem } from '../../../services/wardrobeService';
import type { TryOnResultEntry } from '../../../services/tryOnResultStore';
import {
  buildNotificationFeed,
  MAX_NOTIFICATIONS,
  tryOnNotificationId,
  unseenCount,
} from '../notifications/notification-feed';

const tryOn = (hash: string, savedAt: number): TryOnResultEntry => ({
  hash,
  url: `https://cdn.test/${hash}.jpg`,
  savedAt,
});

const item = (
  id: string,
  status: WardrobeItem['beautify_status'],
  updatedAt?: string,
): WardrobeItem =>
  ({
    id,
    name: `Item ${id}`,
    beautify_status: status,
    updated_at: updatedAt,
  } as WardrobeItem);

const NONE = new Set<string>();

describe('buildNotificationFeed', () => {
  it('includes completed try-on renders', () => {
    const feed = buildNotificationFeed([tryOn('h1', 1000)], [], NONE);
    expect(feed).toHaveLength(1);
    expect(feed[0]).toMatchObject({
      kind: 'tryon',
      targetId: 'h1',
      compositeUrl: 'https://cdn.test/h1.jpg',
      seen: false,
    });
  });

  it('includes ONLY beautify candidates that are ready to review', () => {
    const feed = buildNotificationFeed(
      [],
      [
        item('ready-1', 'ready', '2026-09-12T08:00:00Z'),
        item('pending-1', 'pending', '2026-09-12T08:00:00Z'),
        item('accepted-1', 'accepted', '2026-09-12T08:00:00Z'),
        item('discarded-1', 'discarded', '2026-09-12T08:00:00Z'),
        item('failed-1', 'failed', '2026-09-12T08:00:00Z'),
        item('none-1', 'none', '2026-09-12T08:00:00Z'),
      ],
      NONE,
    );
    expect(feed.map(n => n.targetId)).toEqual(['ready-1']);
    expect(feed[0].kind).toBe('beautify');
  });

  it('interleaves both kinds newest first', () => {
    const feed = buildNotificationFeed(
      [tryOn('older', Date.parse('2026-09-12T07:00:00Z')),
       tryOn('newest', Date.parse('2026-09-12T10:00:00Z'))],
      [item('middle', 'ready', '2026-09-12T09:00:00Z')],
      NONE,
    );
    expect(feed.map(n => n.targetId)).toEqual(['newest', 'middle', 'older']);
  });

  it('marks rows the user has already opened as seen', () => {
    const entry = tryOn('h1', 1000);
    const feed = buildNotificationFeed(
      [entry],
      [],
      new Set([tryOnNotificationId(entry)]),
    );
    expect(feed[0].seen).toBe(true);
    expect(unseenCount(feed)).toBe(0);
  });

  // Regression: a re-render of the same outfit is a result the user has NOT
  // seen. Keying on the hash alone would silently inherit the old seen flag.
  it('treats a re-render of the same outfit as a new unread row', () => {
    const first = tryOn('h1', 1000);
    const second = tryOn('h1', 2000);
    const seen = new Set([tryOnNotificationId(first)]);
    expect(buildNotificationFeed([second], [], seen)[0].seen).toBe(false);
  });

  it('skips try-on entries with no image', () => {
    const feed = buildNotificationFeed(
      [{ hash: 'h1', url: '', savedAt: 1000 }],
      [],
      NONE,
    );
    expect(feed).toEqual([]);
  });

  it('is bounded — the bell is a glance, not an archive', () => {
    const many = Array.from({ length: MAX_NOTIFICATIONS + 5 }, (_, i) =>
      tryOn(`h${i}`, i),
    );
    expect(buildNotificationFeed(many, [], NONE)).toHaveLength(
      MAX_NOTIFICATIONS,
    );
  });

  it('is empty when nothing has finished', () => {
    expect(buildNotificationFeed([], [], NONE)).toEqual([]);
    expect(unseenCount([])).toBe(0);
  });
});
