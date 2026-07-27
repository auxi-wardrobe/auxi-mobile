import {
  effectiveWornAt,
  groupFavouritesByDate,
} from '../group-by-date';
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

describe('effectiveWornAt', () => {
  it('returns created_at when there is no override', () => {
    const fav = favourite({ id: 'f1', outfit_context: { outfit_hash: 'h1' } });
    expect(effectiveWornAt(fav)).toBe('2026-07-01T10:00:00Z');
    expect(effectiveWornAt(fav, {})).toBe('2026-07-01T10:00:00Z');
  });

  it('lets a newer local wear override created_at', () => {
    const fav = favourite({
      id: 'f1',
      outfit_context: { outfit_hash: 'h1' },
      created_at: '2026-07-01T10:00:00Z',
    });
    expect(effectiveWornAt(fav, { h1: '2026-07-20T09:00:00Z' })).toBe(
      '2026-07-20T09:00:00Z',
    );
  });

  it('keeps created_at when the override is older or unusable', () => {
    const fav = favourite({
      id: 'f1',
      outfit_context: { outfit_hash: 'h1' },
      created_at: '2026-07-20T10:00:00Z',
    });
    expect(effectiveWornAt(fav, { h1: '2026-07-01T09:00:00Z' })).toBe(
      '2026-07-20T10:00:00Z',
    );
    expect(effectiveWornAt(fav, { h1: 'nonsense' })).toBe(
      '2026-07-20T10:00:00Z',
    );
  });

  it('ignores overrides for favourites without a hash', () => {
    const fav = favourite({ id: 'f1', outfit_context: null });
    expect(effectiveWornAt(fav, { h1: '2026-07-20T09:00:00Z' })).toBe(
      '2026-07-01T10:00:00Z',
    );
  });
});

describe('groupFavouritesByDate', () => {
  it('buckets by created_at, most recent day first, when no overrides', () => {
    const groups = groupFavouritesByDate([
      favourite({ id: 'a', created_at: '2026-07-01T10:00:00Z' }),
      favourite({ id: 'b', created_at: '2026-07-03T10:00:00Z' }),
    ]);
    expect(groups.map(g => g.dayKey)).toEqual(['2026-07-03', '2026-07-01']);
  });

  it('floats a re-worn look to today via the local wear log', () => {
    const groups = groupFavouritesByDate(
      [
        favourite({
          id: 'old',
          outfit_context: { outfit_hash: 'h1' },
          created_at: '2026-07-01T10:00:00Z',
        }),
        favourite({
          id: 'newer',
          outfit_context: { outfit_hash: 'h2' },
          created_at: '2026-07-05T10:00:00Z',
        }),
      ],
      { h1: '2026-07-22T08:00:00Z' },
    );
    // The re-worn 'old' look now leads under its wear day, ahead of 'newer'.
    expect(groups[0].dayKey).toBe('2026-07-22');
    expect(groups[0].label).toBe('22 Jul');
    expect(groups[0].favourites[0].id).toBe('old');
  });

  it('orders newest-worn first within a day', () => {
    const groups = groupFavouritesByDate(
      [
        favourite({
          id: 'x',
          outfit_context: { outfit_hash: 'hx' },
          created_at: '2026-07-22T06:00:00Z',
        }),
        favourite({
          id: 'y',
          outfit_context: { outfit_hash: 'hy' },
          created_at: '2026-07-22T05:00:00Z',
        }),
      ],
      { hy: '2026-07-22T23:00:00Z' },
    );
    // 'y' was re-worn late in the day, so it leads 'x' despite an older created_at.
    expect(groups).toHaveLength(1);
    expect(groups[0].favourites.map(f => f.id)).toEqual(['y', 'x']);
  });
});
