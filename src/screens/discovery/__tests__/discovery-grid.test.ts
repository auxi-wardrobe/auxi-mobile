import {
  DEFAULT_TILE_RATIO,
  showsSkeletonGrid,
  MAX_TILE_RATIO,
  MIN_TILE_RATIO,
  TILE_WIDTH,
  clampTileRatio,
  packMasonry,
  tileHeight,
} from '../discovery-grid';

interface Row {
  id: string;
}

const rows = (...ids: string[]): Row[] => ids.map(id => ({ id }));

describe('clampTileRatio', () => {
  it('passes plausible cover ratios through untouched', () => {
    expect(clampTileRatio(3 / 4)).toBeCloseTo(0.75);
    expect(clampTileRatio(1)).toBe(1);
    expect(clampTileRatio(3 / 2)).toBeCloseTo(1.5);
  });

  it('clamps the freak uploads a height-free grid would otherwise obey', () => {
    expect(clampTileRatio(0.05)).toBe(MIN_TILE_RATIO); // 1:20 strip
    expect(clampTileRatio(9)).toBe(MAX_TILE_RATIO); // panorama
  });

  it('falls back on garbage rather than producing NaN heights', () => {
    expect(clampTileRatio(0)).toBe(DEFAULT_TILE_RATIO);
    expect(clampTileRatio(Number.NaN)).toBe(DEFAULT_TILE_RATIO);
    expect(clampTileRatio(-2)).toBe(DEFAULT_TILE_RATIO);
  });
});

describe('packMasonry', () => {
  it('alternates columns when every tile is the same height', () => {
    const items = rows('a', 'b', 'c', 'd');
    const { columns, placed } = packMasonry(items, () => 1);

    expect(placed).toBe(4);
    expect(columns[0].map(tile => tile.item.id)).toEqual(['a', 'c']);
    expect(columns[1].map(tile => tile.item.id)).toEqual(['b', 'd']);
  });

  it('sends the next tile to whichever column is shorter', () => {
    // 'a' is tall (ratio 0.5 -> 2x column width), 'b' is wide (ratio 2).
    // The third tile must land under 'b', not under 'a'.
    const ratios: Record<string, number> = { a: 0.5, b: 2, c: 1 };
    const { columns } = packMasonry(rows('a', 'b', 'c'), item => ratios[item.id]);

    expect(columns[0].map(tile => tile.item.id)).toEqual(['a']);
    expect(columns[1].map(tile => tile.item.id)).toEqual(['b', 'c']);
  });

  it('keeps the feed index on the tile, not the column index', () => {
    const { columns } = packMasonry(rows('a', 'b', 'c'), () => 1);

    expect(columns[0].map(tile => tile.index)).toEqual([0, 2]);
    expect(columns[1].map(tile => tile.index)).toEqual([1]);
  });

  it('stops at the first unmeasured cover so feed order is preserved', () => {
    const ratios: Record<string, number> = { a: 1, c: 1 };
    const { columns, placed } = packMasonry(
      rows('a', 'b', 'c'),
      item => ratios[item.id],
    );

    expect(placed).toBe(1);
    expect(columns.flat().map(tile => tile.item.id)).toEqual(['a']);
  });

  it('is prefix-stable: measuring a later cover never moves a placed tile', () => {
    const first = packMasonry(rows('a', 'b'), () => 1);
    const ratios: Record<string, number> = { a: 1, b: 1, c: 0.5 };
    const second = packMasonry(rows('a', 'b', 'c'), item => ratios[item.id]);

    expect(second.columns[0].slice(0, 1)).toEqual(first.columns[0]);
    expect(second.columns[1].slice(0, 1)).toEqual(first.columns[1]);
  });

  it('measures height from the column width, the caption and the gap', () => {
    // A square cover is exactly one column wide and one column tall.
    expect(tileHeight(1)).toBeCloseTo(TILE_WIDTH + 20 + 12);
  });
});

describe('showsSkeletonGrid', () => {
  const state = {
    loading: false,
    loadingMore: false,
    outfitCount: 0,
    placed: 0,
  };

  it('covers the first load', () => {
    expect(showsSkeletonGrid({ ...state, loading: true })).toBe(true);
  });

  it('covers a client-narrowed filter walking pages forward', () => {
    expect(showsSkeletonGrid({ ...state, loadingMore: true })).toBe(true);
  });

  it('holds while outfits are in hand but no cover has been measured', () => {
    // The gap this exists for: the query resolved, so `loading` is false, but
    // the packer has nothing placed yet. Dropping the skeleton here leaves the
    // screen visually empty until the first cover sizes.
    expect(showsSkeletonGrid({ ...state, outfitCount: 20, placed: 0 })).toBe(
      true,
    );
  });

  it('gives way as soon as the first tile is placed', () => {
    expect(showsSkeletonGrid({ ...state, outfitCount: 20, placed: 1 })).toBe(
      false,
    );
  });

  it('stays out of the way of the empty state', () => {
    expect(showsSkeletonGrid(state)).toBe(false);
  });
});
