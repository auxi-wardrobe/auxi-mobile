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
  itemColorFamily,
  itemType,
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

describe('itemType', () => {
  it.each([
    // catalog: explicit category_code
    [
      { category: 'shoes', category_code: 'LOF', name: 'Black Loafers' },
      'loafers',
    ],
    // catalog: code only in the human_readable_id
    [
      { category: 'shoes', human_readable_id: 'USR_SH_SNK_WHT_REG_01' },
      'sneakers',
    ],
    // AI subcategory
    [{ category: 'top', subcategory: 't_shirt' }, 't_shirt'],
    [{ category: 'top', subcategory: 'shirt' }, 'shirt'],
    // name keywords (word-start, order-sensitive)
    [{ category: 'shoes', name: 'Chelsea Boots' }, 'boots'],
    [{ category: 'top', name: 'White Oxford Shirt' }, 'shirt'],
    [{ category: 'top', name: 'Striped Tee' }, 't_shirt'],
    [{ category: 'dress', name: 'Linen Shirt Dress' }, 'dress'],
    [{ category: 'top', name: 'Short Sleeve Shirt' }, 'shirt'],
    [{ category: 'accessory', name: 'Wool Socks' }, 'socks'],
  ])('%o → %s', (fields, expected) => {
    expect(itemType(item(fields as Partial<WardrobeItem>))?.typeId).toBe(
      expected,
    );
  });

  it('keeps an unrecognised subcategory as a raw label', () => {
    expect(itemType(item({ category: 'top', subcategory: 'bustier' }))).toEqual(
      { typeId: null, label: 'Bustier' },
    );
  });

  it('does not match a keyword inside another word', () => {
    // "steel" must not read as a tee
    expect(
      itemType(item({ category: 'accessory', name: 'Steel Bracelet' }))?.typeId,
    ).toBe('jewelry');
  });
});

describe('computeItemTypes', () => {
  it('splits catalog shoes by code: Shoes 2 = 1 loafers + 1 sneakers', () => {
    const [shoes] = computeItemTypes([
      item({ category: 'shoes', category_code: 'LOF', name: 'Loafers' }),
      item({ category: 'shoes', human_readable_id: 'USR_SH_SNK_BLK_REG_01' }),
    ]);
    expect(shoes).toEqual({
      group: 'shoes',
      count: 2,
      types: [
        { typeId: 'loafers', label: 'loafers', count: 1 },
        { typeId: 'sneakers', label: 'sneakers', count: 1 },
      ],
    });
  });

  it('groups by category in canonical order with subtype counts sorted by size', () => {
    const groups = computeItemTypes([
      item({ category: 'shoes', subcategory: 'boots' }),
      item({ category: 'top', subcategory: 'shirt' }),
      item({ category: 'top', subcategory: 't_shirt' }),
      item({ category: 'top', subcategory: 't_shirt' }),
      item({ category: 'shoes', subcategory: 'sneakers' }),
      item({ category: 'shoes', subcategory: 'sneakers' }),
    ]);
    expect(
      groups.map(g => [
        g.group,
        g.count,
        g.types.map(t => [t.typeId, t.count]),
      ]),
    ).toEqual([
      [
        'top',
        3,
        [
          ['t_shirt', 2],
          ['shirt', 1],
        ],
      ],
      [
        'shoes',
        3,
        [
          ['sneakers', 2],
          ['boots', 1],
        ],
      ],
    ]);
  });

  it('classifies by category_code when the category is missing', () => {
    const [group] = computeItemTypes([item({ category_code: 'JNS' })]);
    expect(group.group).toBe('bottom');
    expect(group.types[0].typeId).toBe('jeans');
  });

  it('falls back to the category name when nothing else is known', () => {
    const [group] = computeItemTypes([item({ category: 'jeans' })]);
    expect(group).toEqual({
      group: 'bottom',
      count: 1,
      types: [{ typeId: 'jeans', label: 'jeans', count: 1 }],
    });
  });
});

describe('itemColorFamily', () => {
  it('reads catalog palette codes when there is no AI colour', () => {
    expect(itemColorFamily(item({ color_code: 'NVY' }))).toBe('navy');
    expect(
      itemColorFamily(item({ physical_attributes: { color_code: 'blk' } })),
    ).toBe('black');
    expect(
      itemColorFamily(item({ human_readable_id: 'USR_L2_TEE_WHT_REG_01' })),
    ).toBe('white');
    expect(itemColorFamily(item({ color_code: 'MUL' }))).toBe(OTHER_COLOR_ID);
  });

  it('prefers the AI / user-edited colour over the code', () => {
    expect(
      itemColorFamily(item({ dominant_color: 'olive', color_code: 'BLK' })),
    ).toBe('olive');
  });

  it('is null when the item has no colour at all', () => {
    expect(itemColorFamily(item({ name: 'Mystery' }))).toBeNull();
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

  it('counts catalog items that only carry a palette code', () => {
    const shares = computeColorDistribution([
      item({ human_readable_id: 'USR_L2_TEE_BLK_REG_01' }),
      item({ physical_attributes: { color_code: 'BLK' } }),
      item({ color_code: 'WHT' }),
    ]);
    expect(shares.map(s => [s.id, s.count])).toEqual([
      ['black', 2],
      ['white', 1],
    ]);
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
