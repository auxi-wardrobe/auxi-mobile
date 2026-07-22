import {
  buildGridOutfitSheet,
  buildGridOutfitSheetWithPin,
  classifyCategoryFamily,
  dedupeByCategory,
  outerLayerPreferenceWeight,
  reorderColdOutfitsPreferOuter,
  resolveOnePieceConflicts,
} from '../outfit-normalize';
import { Item } from '../../../types/item';
import { OutfitSheet } from '../types';

const item = (over: Partial<Item> & Pick<Item, 'id' | 'category'>): Item => ({
  image_url: '',
  color: '',
  isSystem: false,
  ...over,
});

const sheet = (items: Item[]): OutfitSheet => ({
  items,
  outfitHash: 'hash',
});

const categories = (items: Array<Item | null>) =>
  items.filter((i): i is Item => i !== null).map(i => i.category);

describe('dedupeByCategory', () => {
  it('keeps one item per category, preferring the user item over a system fallback', () => {
    const userTop = item({ id: 'user-top', category: 'Top', isSystem: false });
    const systemTop = item({ id: 'sys-top', category: 'Top', isSystem: true });
    const bottom = item({ id: 'bottom', category: 'Bottom' });

    const result = dedupeByCategory([systemTop, userTop, bottom]);

    expect(result.map(i => i.id)).toEqual(['user-top', 'bottom']);
  });

  it('keeps the first occurrence when both duplicates have the same source', () => {
    const jeansA = item({ id: 'jeans-a', category: 'Bottom', isSystem: false });
    const jeansB = item({ id: 'jeans-b', category: 'Bottom', isSystem: false });

    expect(dedupeByCategory([jeansA, jeansB]).map(i => i.id)).toEqual([
      'jeans-a',
    ]);
  });

  it('never displaces the protected (pinned) item, even a system one', () => {
    const pinnedSystemTop = item({
      id: 'pin',
      category: 'Top',
      isSystem: true,
    });
    const userTop = item({ id: 'user-top', category: 'Top', isSystem: false });

    const result = dedupeByCategory([pinnedSystemTop, userTop], 'pin');

    expect(result.map(i => i.id)).toEqual(['pin']);
  });

  it('treats category casing/whitespace as the same bucket', () => {
    const a = item({ id: 'a', category: 'Top' });
    const b = item({ id: 'b', category: ' top ' });

    expect(dedupeByCategory([a, b])).toHaveLength(1);
  });

  it('collapses a free-form wardrobe category against the canonical family (Jeans = Bottom)', () => {
    // A pinned wardrobe item keeps its stored label ('Jeans'); the outfit's
    // backend item is the canonical 'Bottom'. They must not both survive.
    const pinnedJeans = item({ id: 'jeans', category: 'Jeans' });
    const bottom = item({ id: 'bottom', category: 'Bottom' });

    const result = dedupeByCategory([pinnedJeans, bottom], 'jeans');

    expect(result.map(i => i.id)).toEqual(['jeans']);
  });
});

describe('classifyCategoryFamily', () => {
  it('maps free-form labels onto canonical families', () => {
    expect(classifyCategoryFamily('Jeans')).toBe('bottom');
    expect(classifyCategoryFamily('Pants')).toBe('bottom');
    expect(classifyCategoryFamily('Skirt')).toBe('bottom');
    expect(classifyCategoryFamily('Bottom')).toBe('bottom');
    expect(classifyCategoryFamily('Blouse')).toBe('top');
    expect(classifyCategoryFamily('Jumpsuit')).toBe('one_piece');
    expect(classifyCategoryFamily('Dress')).toBe('one_piece');
    // A 'shirt dress' is a one-piece, not a top.
    expect(classifyCategoryFamily('Shirt dress')).toBe('one_piece');
  });

  it('returns empty for missing categories so they are never bucketed', () => {
    expect(classifyCategoryFamily(undefined)).toBe('');
    expect(classifyCategoryFamily('  ')).toBe('');
  });
});

describe('resolveOnePieceConflicts', () => {
  it('drops a one-piece when a Bottom is pinned (no pants + dress)', () => {
    const pinnedBottom = item({ id: 'pants', category: 'Bottom' });
    const dress = item({ id: 'dress', category: 'Dress' });
    const shoes = item({ id: 'shoes', category: 'Shoes' });

    const result = resolveOnePieceConflicts(
      [pinnedBottom, dress, shoes],
      'pants',
    );

    expect(result.map(i => i.id)).toEqual(['pants', 'shoes']);
  });

  it('drops separates when a one-piece is pinned', () => {
    const pinnedDress = item({ id: 'dress', category: 'Dress' });
    const top = item({ id: 'top', category: 'Top' });
    const bottom = item({ id: 'bottom', category: 'Bottom' });
    const shoes = item({ id: 'shoes', category: 'Shoes' });

    const result = resolveOnePieceConflicts(
      [pinnedDress, top, bottom, shoes],
      'dress',
    );

    expect(result.map(i => i.id)).toEqual(['dress', 'shoes']);
  });

  it('keeps a complete Top+Bottom pair over a stray one-piece when nothing is pinned', () => {
    const top = item({ id: 'top', category: 'Top' });
    const bottom = item({ id: 'bottom', category: 'Bottom' });
    const dress = item({ id: 'dress', category: 'Dress' });

    const result = resolveOnePieceConflicts([top, bottom, dress]);

    expect(result.map(i => i.id)).toEqual(['top', 'bottom']);
  });

  it('leaves a valid dress-only outfit untouched', () => {
    const dress = item({ id: 'dress', category: 'Dress' });
    const shoes = item({ id: 'shoes', category: 'Shoes' });

    expect(resolveOnePieceConflicts([dress, shoes]).map(i => i.id)).toEqual([
      'dress',
      'shoes',
    ]);
  });
});

describe('outerLayerPreferenceWeight', () => {
  it('maps each temperature band to its float weight', () => {
    // >15°C — outerwear not needed.
    expect(outerLayerPreferenceWeight(22)).toBe(0);
    expect(outerLayerPreferenceWeight(15)).toBe(0);
    // 7–15°C — optional, adds points.
    expect(outerLayerPreferenceWeight(14)).toBe(2);
    expect(outerLayerPreferenceWeight(7)).toBe(2);
    // 0–7°C — strongly preferred.
    expect(outerLayerPreferenceWeight(6)).toBe(10);
    expect(outerLayerPreferenceWeight(0)).toBe(10);
    // <0°C — near-mandatory.
    expect(outerLayerPreferenceWeight(-1)).toBe(100);
    expect(outerLayerPreferenceWeight(-5)).toBe(100);
  });
});

describe('reorderColdOutfitsPreferOuter', () => {
  const outerSheet = (hash: string): OutfitSheet => ({
    outfitHash: hash,
    items: [
      item({ id: `${hash}-outer`, category: 'Outerwear' }),
      item({ id: `${hash}-top`, category: 'Top' }),
      item({ id: `${hash}-shoes`, category: 'Shoes' }),
    ],
  });
  const lightSheet = (hash: string): OutfitSheet => ({
    outfitHash: hash,
    items: [
      item({ id: `${hash}-dress`, category: 'Dress' }),
      item({ id: `${hash}-shoes`, category: 'Shoes' }),
    ],
  });
  const hashes = (sheets: OutfitSheet[]) => sheets.map(s => s.outfitHash);

  it('leaves the deck untouched at/above 15°C (same reference)', () => {
    const deck = [lightSheet('a'), outerSheet('b')];
    expect(reorderColdOutfitsPreferOuter(deck, 20)).toBe(deck);
  });

  it('floats outer-bearing outfits ahead of too-light ones at 0–7°C', () => {
    const deck = [lightSheet('light'), outerSheet('warm')];
    expect(hashes(reorderColdOutfitsPreferOuter(deck, 4))).toEqual([
      'warm',
      'light',
    ]);
  });

  it('always leads with outerwear below 0°C, regardless of backend rank', () => {
    const deck = [lightSheet('l1'), lightSheet('l2'), outerSheet('warm')];
    expect(hashes(reorderColdOutfitsPreferOuter(deck, -5))).toEqual([
      'warm',
      'l1',
      'l2',
    ]);
  });

  it('is only a soft nudge at 7–15°C — a top-ranked light outfit is not leapfrogged from two slots back', () => {
    // weight 2 buys at most a one-slot jump, so the outer outfit at the very
    // back cannot overtake the top-ranked light outfit.
    const deck = [lightSheet('l0'), lightSheet('l1'), outerSheet('warm')];
    expect(hashes(reorderColdOutfitsPreferOuter(deck, 12))).toEqual([
      'l0',
      'warm',
      'l1',
    ]);
  });

  it('preserves backend order within outer-bearing and within light groups', () => {
    const deck = [
      lightSheet('l0'),
      outerSheet('w0'),
      lightSheet('l1'),
      outerSheet('w1'),
    ];
    expect(hashes(reorderColdOutfitsPreferOuter(deck, 4))).toEqual([
      'w0',
      'w1',
      'l0',
      'l1',
    ]);
  });

  it('reorders only — never adds or drops an outfit', () => {
    const deck = [lightSheet('a'), outerSheet('b'), lightSheet('c')];
    const result = reorderColdOutfitsPreferOuter(deck, -5);
    expect([...hashes(result)].sort()).toEqual(['a', 'b', 'c']);
  });

  it('returns a single-outfit batch unchanged', () => {
    const deck = [lightSheet('only')];
    expect(reorderColdOutfitsPreferOuter(deck, -5)).toBe(deck);
  });
});

describe('buildGridOutfitSheet', () => {
  it('drops a duplicate-category system item with no pin (2 jeans → 1)', () => {
    const userJeans = item({
      id: 'user-jeans',
      category: 'Bottom',
      isSystem: false,
    });
    const systemJeans = item({
      id: 'sys-jeans',
      category: 'Bottom',
      isSystem: true,
    });
    const top = item({ id: 'top', category: 'Top' });

    const result = buildGridOutfitSheet(sheet([userJeans, systemJeans, top]));

    expect(result.items.map(i => i.id)).toEqual(['user-jeans', 'top']);
    expect(categories(result.gridItems)).toEqual(['Bottom', 'Top']);
  });
});

describe('buildGridOutfitSheetWithPin', () => {
  it('removes a same-category system item when the pin is already in the outfit', () => {
    const pinnedTop = item({ id: 'pin', category: 'Top', isSystem: false });
    const systemTop = item({ id: 'sys-top', category: 'Top', isSystem: true });
    const bottom = item({ id: 'bottom', category: 'Bottom' });

    const result = buildGridOutfitSheetWithPin(
      sheet([systemTop, bottom, pinnedTop]),
      pinnedTop,
    );

    expect(result.items.map(i => i.id)).toEqual(['pin', 'bottom']);
  });

  it('drops the outfit own-category item when the pin is injected from elsewhere', () => {
    const pinnedTop = item({ id: 'pin', category: 'Top', isSystem: false });
    const systemTop = item({ id: 'sys-top', category: 'Top', isSystem: true });
    const bottom = item({ id: 'bottom', category: 'Bottom' });

    const result = buildGridOutfitSheetWithPin(
      sheet([systemTop, bottom]),
      pinnedTop,
    );

    expect(result.items[0].id).toBe('pin');
    expect(categories(result.gridItems)).toEqual(['Top', 'Bottom']);
  });

  it('never shows two bottoms when a wardrobe Bottom (free-form label) is pinned', () => {
    // Pinned item resolved from the wardrobe keeps its stored 'Jeans' label;
    // the outfit already carries a canonical 'Bottom'. Both are leg garments.
    const pinnedJeans = item({ id: 'pin', category: 'Jeans' });
    const outfitBottom = item({ id: 'outfit-bottom', category: 'Bottom' });
    const top = item({ id: 'top', category: 'Top' });

    const result = buildGridOutfitSheetWithPin(
      sheet([top, outfitBottom]),
      pinnedJeans,
    );

    expect(result.items.map(i => i.id)).toEqual(['pin', 'top']);
  });

  it('never pairs pinned pants with a one-piece (dress/jumpsuit)', () => {
    const pinnedPants = item({ id: 'pin', category: 'Bottom' });
    const dress = item({ id: 'dress', category: 'Dress' });
    const shoes = item({ id: 'shoes', category: 'Shoes' });

    const result = buildGridOutfitSheetWithPin(
      sheet([dress, shoes]),
      pinnedPants,
    );

    expect(result.items.map(i => i.id)).toEqual(['pin', 'shoes']);
    expect(categories(result.gridItems)).not.toContain('Dress');
  });
});
