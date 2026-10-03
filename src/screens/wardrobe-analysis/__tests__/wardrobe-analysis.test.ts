import type { WardrobeItem } from '../../../services/wardrobeService';
import {
  OTHER_COLOR_ID,
  analysableItems,
  classifyCategory,
  colorFamilyFor,
  computeCategoryCounts,
  computeColorDistribution,
  computeItemTypes,
  formatPercent,
} from '../wardrobe-analysis';

let seq = 0;
const item = (overrides: Partial<WardrobeItem> = {}): WardrobeItem => ({
  id: `item-${(seq += 1)}`,
  ...overrides,
});

describe('analysableItems', () => {
  it('drops deleted and still-preparing items', () => {
    const kept = item({ category: 'top' });
    const result = analysableItems([
      kept,
      item({ category: 'top', is_deleted: true }),
      item({ category: 'top', is_preparing: true }),
    ]);
    expect(result).toEqual([kept]);
  });
});

describe('classifyCategory', () => {
  it.each([
    ['top', 'top'],
    ['T-Shirt', 'top'],
    ['bottom', 'bottom'],
    ['jeans', 'bottom'],
    ['shoes', 'shoes'],
    ['sneakers', 'shoes'],
    ['outerwear', 'outerwear'],
    ['denim jacket', 'outerwear'],
    ['dress', 'one_piece'],
    ['shirt dress', 'one_piece'],
    ['accessory', 'accessory'],
    ['hat', 'accessory'],
    ['footwear', 'shoes'],
    ['socks', 'accessory'],
    ['scarf', 'accessory'],
    ['swimwear', 'other'],
    [undefined, 'other'],
  ])('%s → %s', (category, expected) => {
    expect(classifyCategory(category)).toBe(expected);
  });
});

describe('computeCategoryCounts', () => {
  it('counts tops / bottoms / shoes and folds everything else into others', () => {
    const counts = computeCategoryCounts([
      item({ category: 'top' }),
      item({ category: 'shirt' }),
      item({ category: 'bottom' }),
      item({ category: 'shoes' }),
      item({ category: 'dress' }),
      item({ category: 'jacket' }),
      item({ category: 'bag' }),
    ]);
    expect(counts).toEqual({
      total: 7,
      tops: 2,
      bottoms: 1,
      shoes: 1,
      others: 3,
    });
  });

  it('falls back to the subcategory when the category is unrecognised', () => {
    const counts = computeCategoryCounts([
      item({ category: 'clothing', subcategory: 'trousers' }),
      item({ category: 'garment', subcategory: 'knit' }),
    ]);
    expect(counts).toMatchObject({ tops: 1, bottoms: 1, others: 0 });
  });

  it('is all zero for an empty wardrobe', () => {
    expect(computeCategoryCounts([])).toEqual({
      total: 0,
      tops: 0,
      bottoms: 0,
      shoes: 0,
      others: 0,
    });
  });
});

describe('computeItemTypes', () => {
  it('groups by category in canonical order with subtype counts sorted by size', () => {
    const groups = computeItemTypes([
      item({ category: 'shoes', subcategory: 'boots' }),
      item({ category: 'top', subcategory: 'shirt' }),
      item({ category: 'top', subcategory: 't_shirt' }),
      item({ category: 'top', subcategory: 't_shirt' }),
      item({ category: 'shoes', subcategory: 'sneakers' }),
      item({ category: 'shoes', subcategory: 'sneakers' }),
    ]);
    expect(groups).toEqual([
      {
        group: 'top',
        count: 3,
        types: [
          { label: 'T Shirt', count: 2 },
          { label: 'Shirt', count: 1 },
        ],
      },
      {
        group: 'shoes',
        count: 3,
        types: [
          { label: 'Sneakers', count: 2 },
          { label: 'Boots', count: 1 },
        ],
      },
    ]);
  });

  it('falls back to the category name when there is no subcategory', () => {
    const [group] = computeItemTypes([item({ category: 'jeans' })]);
    expect(group).toEqual({
      group: 'bottom',
      count: 1,
      types: [{ label: 'Jeans', count: 1 }],
    });
  });
});

describe('colorFamilyFor', () => {
  it.each([
    ['Black', 'black'],
    ['light blue', 'blue'],
    ['dark blue', 'navy'],
    ['Navy Blue', 'navy'],
    ['olive green', 'olive'],
    ['off-white', 'beige'],
    ['golden brown', 'brown'],
    ['charcoal', 'grey'],
    ['multicolor', OTHER_COLOR_ID],
  ])('%s → %s', (name, expected) => {
    expect(colorFamilyFor(name)).toBe(expected);
  });
});

describe('computeColorDistribution', () => {
  it('shares are of colour-tagged items only, largest first, other last', () => {
    const shares = computeColorDistribution([
      item({ dominant_color: 'black' }),
      item({ dominant_color: 'Black' }),
      item({ dominant_color: 'white' }),
      item({ dominant_color: 'leopard print' }),
      item({ colors: ['navy', 'white'] }),
      item({}), // untagged: not in the denominator
    ]);
    expect(shares.map(s => [s.id, s.count])).toEqual([
      ['black', 2],
      ['white', 1],
      ['navy', 1],
      [OTHER_COLOR_ID, 1],
    ]);
    expect(shares[0].percent).toBeCloseTo(40);
    expect(shares.reduce((sum, s) => sum + s.percent, 0)).toBeCloseTo(100);
  });

  it('is empty when nothing is colour-tagged', () => {
    expect(computeColorDistribution([item({}), item({})])).toEqual([]);
  });
});

describe('formatPercent', () => {
  it('uses one decimal and the locale separator', () => {
    expect(formatPercent(34.5, 'en-EN')).toBe('34.5');
    expect(formatPercent(34.5, 'fr-FR')).toBe('34,5');
    expect(formatPercent(100 / 3, 'en-EN')).toBe('33.3');
    expect(formatPercent(50, 'en-EN')).toBe('50');
  });
});
