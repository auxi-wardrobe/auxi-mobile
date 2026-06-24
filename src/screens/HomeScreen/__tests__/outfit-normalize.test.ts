import {
  buildGridOutfitSheet,
  buildGridOutfitSheetWithPin,
  dedupeByCategory,
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
});
