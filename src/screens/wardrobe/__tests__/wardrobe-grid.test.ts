import {
  PREPARING_TIMEOUT_MS,
  anyPreparing,
  findExpiredPreparingIds,
  syncPreparingFirstSeen,
} from '../wardrobe-grid';
import { WardrobeItem } from '../../../services/wardrobeService';

const item = (over: Partial<WardrobeItem>): WardrobeItem =>
  ({ id: 'x', category: 'top', ...over } as WardrobeItem);

describe('anyPreparing', () => {
  it('is false for undefined / null / empty', () => {
    expect(anyPreparing(undefined)).toBe(false);
    expect(anyPreparing(null)).toBe(false);
    expect(anyPreparing([])).toBe(false);
  });

  it('is false when no item is preparing', () => {
    expect(anyPreparing([item({ is_preparing: false }), item({})])).toBe(false);
  });

  it('is true when at least one item is preparing', () => {
    expect(
      anyPreparing([item({ is_preparing: false }), item({ is_preparing: true })]),
    ).toBe(true);
  });
});

describe('syncPreparingFirstSeen', () => {
  it('records first-seen time for newly preparing items only', () => {
    const map = new Map<string, number>();
    syncPreparingFirstSeen(map, [item({ id: 'a', is_preparing: true })], 1000);
    expect(map.get('a')).toBe(1000);

    // Seen again later — the original timestamp is kept.
    syncPreparingFirstSeen(map, [item({ id: 'a', is_preparing: true })], 5000);
    expect(map.get('a')).toBe(1000);
  });

  it('forgets an item once it is seen NOT preparing', () => {
    const map = new Map<string, number>([['a', 1000]]);
    syncPreparingFirstSeen(map, [item({ id: 'a', is_preparing: false })], 2000);
    expect(map.has('a')).toBe(false);
  });

  it('keeps counting down for items absent from the (filtered) list', () => {
    const map = new Map<string, number>([['a', 1000]]);
    syncPreparingFirstSeen(map, [item({ id: 'b', is_preparing: true })], 2000);
    expect(map.get('a')).toBe(1000);
    expect(map.get('b')).toBe(2000);
  });

  it('ignores items without an id', () => {
    const map = new Map<string, number>();
    syncPreparingFirstSeen(
      map,
      [item({ id: undefined as unknown as string, is_preparing: true })],
      1000,
    );
    expect(map.size).toBe(0);
  });
});

describe('findExpiredPreparingIds', () => {
  it('returns only ids past the timeout', () => {
    const map = new Map<string, number>([
      ['old', 0],
      ['fresh', 25_000],
    ]);
    expect(findExpiredPreparingIds(map, PREPARING_TIMEOUT_MS)).toEqual(['old']);
  });

  it('treats exactly-at-timeout as expired', () => {
    const map = new Map<string, number>([['a', 1000]]);
    expect(findExpiredPreparingIds(map, 1000 + PREPARING_TIMEOUT_MS)).toEqual([
      'a',
    ]);
  });

  it('returns nothing when everything is within the window', () => {
    const map = new Map<string, number>([['a', 1000]]);
    expect(findExpiredPreparingIds(map, 2000)).toEqual([]);
  });
});
