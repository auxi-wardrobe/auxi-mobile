import { Dimensions } from 'react-native';

// AU-457 Discovery — Pinterest-style masonry grid.
//
// Columns are FIXED width (mirrors the wardrobe grid's floor-division
// rationale, `screens/wardrobe/wardrobe-grid.ts`: flooring keeps ≥1pt of row
// slack so 2 columns never collapse to 1 on an @2x device's 0.5pt pixel grid).
// Tile HEIGHT is free — every cover renders at whatever aspect ratio the admin
// uploaded, so the two columns stagger instead of lining up in rows.
const { width: screenWidth } = Dimensions.get('window');

export const HORIZONTAL_PADDING = 16;
export const GRID_GAP = 12;
export const GRID_COLUMNS = 2;

export const TILE_WIDTH = Math.floor(
  (screenWidth - HORIZONTAL_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) /
    GRID_COLUMNS,
);

/**
 * Ratio = width / height. Used until the real cover size is known (and for
 * covers that are missing or fail to size).
 */
export const DEFAULT_TILE_RATIO = 3 / 4;

// "Height is free" — but not unbounded. A freak panorama or a 1:10 strip from
// the admin tool would otherwise either vanish to a sliver or eat three
// screenfuls, which is a broken feed, not a design. These bounds are wide
// enough that no plausible outfit cover (2:3 … 3:2) is ever touched.
export const MIN_TILE_RATIO = 0.4; // tallest: height = 2.5 x column width
export const MAX_TILE_RATIO = 2.5; // widest:  height = 0.4 x column width

export const clampTileRatio = (ratio: number): number => {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return DEFAULT_TILE_RATIO;
  }
  return Math.min(MAX_TILE_RATIO, Math.max(MIN_TILE_RATIO, ratio));
};

/**
 * Caption block below each cover: title lineHeight (16) + its marginTop (4).
 * Constant because the title is single-line — the packer needs a tile's total
 * height BEFORE layout, so a wrapping title would make the estimate a guess.
 */
export const CAPTION_BLOCK_HEIGHT = 20;

export const tileHeight = (ratio: number): number =>
  TILE_WIDTH / clampTileRatio(ratio) + CAPTION_BLOCK_HEIGHT + GRID_GAP;

export interface MasonryTile<T> {
  item: T;
  /** Position in the FEED, not in the column — analytics reports feed order. */
  index: number;
  ratio: number;
}

export interface MasonryLayout<T> {
  columns: MasonryTile<T>[][];
  /** How many leading feed items are placed. `< items.length` = still sizing. */
  placed: number;
}

/**
 * Greedy shortest-column packing, in feed order.
 *
 * Two properties make this safe to run on every render as the cover sizes
 * stream in:
 *   • It is a pure function of (items, ratios) — no placement state to drift.
 *   • It is prefix-stable: placing item N+1 can never move items 1..N, because
 *     the column heights they produced are unchanged. So a tile never jumps
 *     out from under a thumb mid-scroll.
 * That second property only holds while every placed tile's height is already
 * known, hence the `break` on the first unsized item rather than a skip: an
 * item placed at the fallback ratio and re-measured later WOULD reshuffle
 * everything after it.
 */
export const packMasonry = <T>(
  items: T[],
  ratioOf: (item: T) => number | undefined,
  columnCount: number = GRID_COLUMNS,
): MasonryLayout<T> => {
  const columns: MasonryTile<T>[][] = Array.from(
    { length: columnCount },
    () => [],
  );
  const heights = new Array<number>(columnCount).fill(0);
  let placed = 0;

  for (const item of items) {
    const ratio = ratioOf(item);
    if (ratio === undefined) {
      break;
    }
    let target = 0;
    for (let i = 1; i < columnCount; i += 1) {
      if (heights[i] < heights[target]) {
        target = i;
      }
    }
    columns[target].push({ item, index: placed, ratio });
    heights[target] += tileHeight(ratio);
    placed += 1;
  }

  return { columns, placed };
};
