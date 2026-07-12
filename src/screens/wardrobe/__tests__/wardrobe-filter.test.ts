import { WardrobeItem } from '../../../services/wardrobeService';
import {
  CategoryFilter,
  categorySummaryLabel,
  filterItemsByCategories,
  isAllSelected,
  toggleCategory,
  uploadCategoryHint,
} from '../wardrobe-filter';

const item = (id: string, category: string): WardrobeItem =>
  ({ id, category } as WardrobeItem);

const TOP = item('t', 'top');
const SHIRT = item('sh', 'Shirt'); // synonym of top
const BOTTOM = item('b', 'jeans'); // synonym of bottom
const DRESS = item('d', 'dress'); // one_piece
const SHOE = item('s', 'sneakers'); // shoes
const ACC = item('a', 'belt'); // accessory
const UNKNOWN = item('u', 'gizmo');

const ALL = [TOP, SHIRT, BOTTOM, DRESS, SHOE, ACC, UNKNOWN];

describe('isAllSelected', () => {
  it('is true only for an empty selection', () => {
    expect(isAllSelected([])).toBe(true);
    expect(isAllSelected(['Top'])).toBe(false);
  });
});

describe('toggleCategory', () => {
  it('adds a category not present', () => {
    expect(toggleCategory([], 'Top')).toEqual(['Top']);
  });

  it('removes a category already present', () => {
    expect(toggleCategory(['Top', 'Shoes'], 'Top')).toEqual(['Shoes']);
  });

  it('keeps canonical CATEGORY_FILTERS order regardless of tap order', () => {
    const out = toggleCategory(toggleCategory(['Shoes'], 'Top'), 'Bottoms');
    // canonical order is Top, Bottoms, One-Piece, Shoes, Ac
    expect(out).toEqual(['Top', 'Bottoms', 'Shoes']);
  });
});

describe('filterItemsByCategories', () => {
  it('returns everything for the empty (All) selection', () => {
    expect(filterItemsByCategories(ALL, [])).toBe(ALL);
  });

  it('keeps items matching a single category (incl. synonyms)', () => {
    const out = filterItemsByCategories(ALL, ['Top']);
    expect(out).toEqual([TOP, SHIRT]);
  });

  it('unions matches across several selected categories', () => {
    const out = filterItemsByCategories(ALL, ['Bottoms', 'Shoes']);
    expect(out).toEqual([BOTTOM, SHOE]);
  });

  it('excludes items that match no selected category', () => {
    const out = filterItemsByCategories(ALL, ['Ac']);
    expect(out).toEqual([ACC]);
    expect(out).not.toContain(UNKNOWN);
  });
});

describe('categorySummaryLabel', () => {
  const labelFor = (c: CategoryFilter) => (c === 'Ac' ? 'Acc.' : c);

  it('shows the All label when nothing is selected', () => {
    expect(categorySummaryLabel([], labelFor, 'All')).toBe('All');
  });

  it('joins selected labels in canonical order', () => {
    expect(categorySummaryLabel(['Shoes', 'Top'], labelFor, 'All')).toBe(
      'Top, Shoes',
    );
  });
});

describe('uploadCategoryHint', () => {
  it('returns All when nothing or several categories are selected', () => {
    expect(uploadCategoryHint([])).toBe('All');
    expect(uploadCategoryHint(['Top', 'Shoes'])).toBe('All');
  });

  it('returns the single category when exactly one is selected', () => {
    expect(uploadCategoryHint(['Bottoms'])).toBe('Bottoms');
  });
});
