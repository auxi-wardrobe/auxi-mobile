import type { WardrobeItem } from '../../../services/wardrobeService';
import {
  OTHER_COLOR_ID,
  analysableItems,
  classifyCategory,
  colorFamilyFor,
  computeCategoryCounts,
  computeColorDistribution,
  computeItemTypes,
  countItemsInPalette,
  itemColorHex,
  formatPercent,
  isPatterned,
  itemColorFamily,
  itemType,
  ONE_PIECE_TYPE_ID,
  OTHER_TYPE_ID,
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
    ['one_piece', 'one_piece'],
    ['One-piece', 'one_piece'],
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
  it('counts tops (+ outerwear) / bottoms (+ one-pieces) / shoes / accessories', () => {
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
      tops: 3, // top + shirt + jacket (outerwear counts as tops)
      bottoms: 2, // bottom + dress (one-pieces count as bottoms)
      shoes: 1,
      accessories: 1, // bag
    });
  });

  it('falls back to the subcategory when the category is unrecognised', () => {
    const counts = computeCategoryCounts([
      item({ category: 'clothing', subcategory: 'trousers' }),
      item({ category: 'garment', subcategory: 'knit' }),
    ]);
    expect(counts).toMatchObject({ tops: 1, bottoms: 1 });
  });

  it('is all zero for an empty wardrobe', () => {
    expect(computeCategoryCounts([])).toEqual({
      total: 0,
      tops: 0,
      bottoms: 0,
      shoes: 0,
      accessories: 0,
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
    expect(itemType(item(fields as Partial<WardrobeItem>)).typeId).toBe(
      expected,
    );
  });

  it('keeps an unrecognised subcategory as a raw label', () => {
    expect(itemType(item({ category: 'top', subcategory: 'bustier' }))).toEqual(
      { typeId: null, label: 'Bustier' },
    );
  });

  it('reads the AI description when subcategory and name say nothing', () => {
    expect(
      itemType(
        item({
          category: 'top',
          subcategory: 'top',
          name: 'My favourite',
          description: 'Light blue denim shirt with white buttons.',
        }),
      ).typeId,
    ).toBe('shirt');
  });

  it("only takes types of the item's own group", () => {
    // A top named "Ringer …" must not become Jewelry; a top whose
    // description mentions jeans must not become Jeans.
    expect(itemType(item({ category: 'top', name: 'Ringer' })).typeId).toBe(
      OTHER_TYPE_ID,
    );
    expect(
      itemType(
        item({
          category: 'top',
          description: 'Cropped blouse, pairs well with jeans and loafers.',
        }),
      ).typeId,
    ).toBe('blouse');
  });

  it('is "other" — not the group name again — when nothing is known', () => {
    expect(itemType(item({ category: 'top' })).typeId).toBe(OTHER_TYPE_ID);
    expect(itemType(item({ category: 'top', subcategory: 'top' })).typeId).toBe(
      OTHER_TYPE_ID,
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

  it('folds one-pieces into Bottoms as a single "One Piece" row', () => {
    const groups = computeItemTypes([
      item({ category: 'bottom', subcategory: 'jeans' }),
      item({ category: 'one_piece', subcategory: 'dress' }),
      item({ category: 'one_piece', name: 'Linen Jumpsuit' }),
      item({ category: 'dress' }),
    ]);
    expect(groups.map(g => [g.group, g.count])).toEqual([['bottom', 4]]);
    expect(groups[0].types.map(t => [t.typeId, t.count])).toEqual([
      [ONE_PIECE_TYPE_ID, 3],
      ['jeans', 1],
    ]);
  });

  it('lists unknown-type items as "other", last', () => {
    const [tops] = computeItemTypes([
      item({ category: 'top' }),
      item({ category: 'top' }),
      item({ category: 'top', subcategory: 'blouse' }),
    ]);
    expect(tops.types.map(t => [t.typeId, t.count])).toEqual([
      ['blouse', 1],
      [OTHER_TYPE_ID, 2],
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
  });

  it('counts a solid item as its dominant colour only', () => {
    // White shirt with black buttons → white.
    expect(
      itemColorFamily(
        item({ dominant_color: 'white', colors: ['white', 'black'] }),
      ),
    ).toBe('white');
    expect(
      itemColorFamily(item({ dominant_color: 'black', pattern: 'solid' })),
    ).toBe('black');
  });

  it('puts patterned items in other', () => {
    expect(
      itemColorFamily(item({ dominant_color: 'navy', pattern: 'striped' })),
    ).toBe(OTHER_COLOR_ID);
    expect(
      itemColorFamily(
        item({
          color_code: 'BLK',
          physical_attributes: { pattern_type: 'PLAID' },
        }),
      ),
    ).toBe(OTHER_COLOR_ID);
    expect(itemColorFamily(item({ color_code: 'MUL' }))).toBe(OTHER_COLOR_ID);
    expect(itemColorFamily(item({ dominant_color: 'floral print' }))).toBe(
      OTHER_COLOR_ID,
    );
  });

  it('is null when the item has no colour at all', () => {
    expect(itemColorFamily(item({ name: 'Mystery' }))).toBeNull();
  });
});

describe('isPatterned', () => {
  it.each([
    [{ pattern: 'solid', dominant_color: 'black' }, false],
    [{ pattern: 'Plain', dominant_color: 'black' }, false],
    [{ dominant_color: 'black' }, false],
    [{ physical_attributes: { pattern_type: 'SOLID' } }, false],
    [{ pattern: 'floral' }, true],
    [{ physical_attributes: { pattern_type: 'STRIPED' } }, true],
    [{ dominant_color: 'black and white stripe' }, true],
    [{ dominant_color: 'leopard' }, true],
  ])('%o → %s', (fields, expected) => {
    expect(isPatterned(item(fields as Partial<WardrobeItem>))).toBe(expected);
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
  it('counts each item once — patterns as other — summing to 100%', () => {
    const shares = computeColorDistribution([
      item({ dominant_color: 'black' }),
      item({ dominant_color: 'Black', pattern: 'solid' }),
      item({ dominant_color: 'white', colors: ['white', 'black'] }),
      item({ dominant_color: 'navy', pattern: 'striped' }),
      item({ dominant_color: 'leopard print' }),
      item({}), // no colour: not in the denominator
    ]);
    expect(shares.map(s => [s.id, s.count])).toEqual([
      ['black', 2],
      ['white', 1],
      [OTHER_COLOR_ID, 2],
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

describe('itemColorHex', () => {
  it('prefers color_hex, then the palette code, then the family swatch', () => {
    expect(
      itemColorHex(
        item({ color_hex: ['#7BA5D6', '#FFFFFF'] as unknown as string }),
      ),
    ).toBe('#7BA5D6');
    expect(itemColorHex(item({ color_hex: '#123456' }))).toBe('#123456');
    expect(itemColorHex(item({ color_code: 'LBL' }))).toBe('#a0c2f1');
    expect(itemColorHex(item({ dominant_color: 'navy blue' }))).toBe('#193579');
  });

  it('has no single colour for patterned or colourless items', () => {
    expect(
      itemColorHex(item({ dominant_color: 'navy', pattern: 'striped' })),
    ).toBeNull();
    expect(itemColorHex(item({ color_code: 'MUL' }))).toBeNull();
    expect(itemColorHex(item({ dominant_color: 'leopard' }))).toBeNull();
    expect(itemColorHex(item({}))).toBeNull();
  });
});

describe('countItemsInPalette', () => {
  // Fair / Light best colours include soft navy #233661 and baby blue #a0c2f1.
  const FAIR = ['#c5a5d3', '#cc8698', '#c3ebe3', '#a0c2f1', '#233661'];

  it('counts items whose colour is ≥70% alike to a best colour', () => {
    const n = countItemsInPalette(
      [
        item({ color_code: 'NVY' }), // navy ≈ soft navy ✓
        item({ color_hex: '#7ba5d6' }), // light blue ≈ baby blue ✓
        item({ dominant_color: 'red' }), // ✗
        item({ dominant_color: 'navy', pattern: 'striped' }), // patterned ✗
        item({}), // no colour ✗
      ],
      FAIR,
    );
    expect(n).toBe(2);
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
