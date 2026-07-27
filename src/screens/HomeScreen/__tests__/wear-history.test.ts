import {
  buildWearHistory,
  buildWornDaysAgoByHash,
  mergeLocalWears,
  wornDaysAgo,
} from '../wear-history';
import { Favourite } from '../../../services/favouriteService';

const favourite = (
  over: Partial<Favourite> & Pick<Favourite, 'id'>,
): Favourite => ({
  user_id: 'u1',
  outfit_items: [],
  outfit_context: null,
  outfit_thumbnail_url: null,
  created_at: '2026-07-01T10:00:00Z',
  updated_at: '2026-07-01T10:00:00Z',
  ...over,
});

describe('buildWearHistory', () => {
  it('maps outfit_hash → last-worn (updated_at)', () => {
    const map = buildWearHistory([
      favourite({
        id: 'f1',
        outfit_context: { outfit_hash: 'h1' },
        updated_at: '2026-07-08T09:00:00Z',
      }),
    ]);
    expect(map.get('h1')).toBe('2026-07-08T09:00:00Z');
  });

  it('falls back to created_at when updated_at is empty', () => {
    const map = buildWearHistory([
      favourite({
        id: 'f1',
        outfit_context: { outfit_hash: 'h1' },
        created_at: '2026-07-02T09:00:00Z',
        updated_at: '',
      }),
    ]);
    expect(map.get('h1')).toBe('2026-07-02T09:00:00Z');
  });

  it('keeps the most recent wear when a hash repeats', () => {
    const map = buildWearHistory([
      favourite({
        id: 'f1',
        outfit_context: { outfit_hash: 'h1' },
        updated_at: '2026-07-01T09:00:00Z',
      }),
      favourite({
        id: 'f2',
        outfit_context: { outfit_hash: 'h1' },
        updated_at: '2026-07-09T09:00:00Z',
      }),
    ]);
    expect(map.get('h1')).toBe('2026-07-09T09:00:00Z');
  });

  it('skips favourites without a hash or a usable date', () => {
    const map = buildWearHistory([
      favourite({ id: 'f1', outfit_context: null }),
      favourite({ id: 'f2', outfit_context: {} }),
      favourite({
        id: 'f3',
        outfit_context: { outfit_hash: 'h3' },
        created_at: 'not-a-date',
        updated_at: 'not-a-date',
      }),
    ]);
    expect(map.size).toBe(0);
  });
});

describe('mergeLocalWears', () => {
  it('overlays a local wear that is newer than the backend date', () => {
    const backend = new Map<string, string>([['h1', '2026-07-01T10:00:00Z']]);
    const merged = mergeLocalWears(backend, { h1: '2026-07-20T09:00:00Z' });
    expect(merged.get('h1')).toBe('2026-07-20T09:00:00Z');
  });

  it('adds a hash the backend history does not know about', () => {
    const backend = new Map<string, string>();
    const merged = mergeLocalWears(backend, { h2: '2026-07-20T09:00:00Z' });
    expect(merged.get('h2')).toBe('2026-07-20T09:00:00Z');
  });

  it('keeps the backend date when the local wear is older', () => {
    const backend = new Map<string, string>([['h1', '2026-07-20T09:00:00Z']]);
    const merged = mergeLocalWears(backend, { h1: '2026-07-01T10:00:00Z' });
    expect(merged.get('h1')).toBe('2026-07-20T09:00:00Z');
  });

  it('ignores unusable local timestamps and never mutates the input', () => {
    const backend = new Map<string, string>([['h1', '2026-07-01T10:00:00Z']]);
    const merged = mergeLocalWears(backend, { h1: 'nonsense', h2: '' });
    expect(merged.get('h1')).toBe('2026-07-01T10:00:00Z');
    expect(merged.has('h2')).toBe(false);
    expect(backend.size).toBe(1);
  });
});

describe('wornDaysAgo', () => {
  const now = new Date(2026, 6, 20, 12, 0, 0); // 20 Jul 2026, local noon

  it('returns whole calendar days for the example (12 days ago)', () => {
    const worn = new Date(2026, 6, 8, 8, 0, 0).toISOString();
    expect(wornDaysAgo(worn, now)).toBe(12);
  });

  it('returns 0 for earlier today', () => {
    const worn = new Date(2026, 6, 20, 7, 0, 0).toISOString();
    expect(wornDaysAgo(worn, now)).toBe(0);
  });

  it('counts by calendar day, not elapsed 24h windows', () => {
    // Worn late yesterday, checked early today → 1 day, not 0.
    const worn = new Date(2026, 6, 19, 23, 0, 0).toISOString();
    expect(wornDaysAgo(worn, now)).toBe(1);
  });

  it('returns null for future dates (clock skew) and bad input', () => {
    const future = new Date(2026, 6, 25, 8, 0, 0).toISOString();
    expect(wornDaysAgo(future, now)).toBeNull();
    expect(wornDaysAgo('nonsense', now)).toBeNull();
  });
});

describe('buildWornDaysAgoByHash', () => {
  it('projects a wear-history map to hash → days, dropping unusable dates', () => {
    const now = new Date(2026, 6, 20, 12, 0, 0);
    const history = new Map<string, string>([
      ['h1', new Date(2026, 6, 8, 8, 0, 0).toISOString()],
      ['h2', new Date(2026, 6, 20, 6, 0, 0).toISOString()],
      ['h3', 'nonsense'],
    ]);
    expect(buildWornDaysAgoByHash(history, now)).toEqual({ h1: 12, h2: 0 });
  });
});
