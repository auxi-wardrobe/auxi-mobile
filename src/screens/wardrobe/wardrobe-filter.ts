import {
  WardrobeItem,
  matchesCategoryFilter,
} from '../../services/wardrobeService';
import { FilterTab, resolveFilterQuery } from './wardrobe-grid';

// The user-selectable category filters shown as multi-select chips in the type
// sheet (Figma "item type"). "All" is NOT a stored value — it is the implicit
// empty-selection state (no category constrained ⇒ everything shows). Selecting
// any specific category clears "All", and clearing every category returns to it.
// Values reuse the FilterTab tokens so `resolveFilterQuery` maps them to the
// backend category synonyms.
export const CATEGORY_FILTERS = [
  'Top',
  'Bottoms',
  'One-Piece',
  'Shoes',
  'Ac',
] as const;
export type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

// No category selected == "All". Kept as a named helper so the screen, the bar
// summary and the sheet all agree on what "all items" means.
export const isAllSelected = (selected: CategoryFilter[]): boolean =>
  selected.length === 0;

// Toggle a single category in the current multi-selection (pure, returns a new
// array in canonical CATEGORY_FILTERS order so the summary label is stable).
export const toggleCategory = (
  selected: CategoryFilter[],
  category: CategoryFilter,
): CategoryFilter[] => {
  const next = selected.includes(category)
    ? selected.filter(c => c !== category)
    : [...selected, category];
  return CATEGORY_FILTERS.filter(c => next.includes(c));
};

// Client-side multi-category filter. Empty selection (== All) is a passthrough.
// Otherwise an item is kept when its category matches ANY selected filter, using
// the same synonym matching as the backend fallback (matchesCategoryFilter).
export const filterItemsByCategories = (
  items: WardrobeItem[],
  selected: CategoryFilter[],
): WardrobeItem[] => {
  if (isAllSelected(selected)) {
    return items;
  }
  const queries = selected
    .map(c => resolveFilterQuery(c as FilterTab))
    .filter((q): q is string => Boolean(q));
  return items.filter(item =>
    queries.some(q => matchesCategoryFilter(item.category, q)),
  );
};

// Compact label for the type summary chip. All ⇒ the "All" copy; otherwise the
// selected category labels joined, e.g. "Top, Bottom" (Figma "item(s) selected").
export const categorySummaryLabel = (
  selected: CategoryFilter[],
  labelFor: (category: CategoryFilter) => string,
  allLabel: string,
): string =>
  isAllSelected(selected)
    ? allLabel
    : CATEGORY_FILTERS.filter(c => selected.includes(c))
        .map(labelFor)
        .join(', ');

// The single-category hint passed to the add-item upload so a new item lands in
// the active section. Only meaningful when exactly one category is filtered;
// with none or several selected it falls back to 'All' (no hint).
export const uploadCategoryHint = (selected: CategoryFilter[]): FilterTab =>
  selected.length === 1 ? (selected[0] as FilterTab) : 'All';
