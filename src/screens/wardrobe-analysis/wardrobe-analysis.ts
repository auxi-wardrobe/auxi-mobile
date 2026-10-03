/**
 * Pure aggregation behind the Wardrobe Analysis screen. Everything is derived
 * client-side from the same `GET /wardrobe/items` list the grid already caches
 * (`wardrobeKeys.list('All')`), so the screen opens instantly from Wardrobe and
 * needs no new endpoint.
 */
import { COLOR_FAMILIES, OTHER_COLOR_HEX } from '../../content/wardrobe-colors';
import {
  WardrobeItem,
  matchesCategoryFilter,
} from '../../services/wardrobeService';

// ---------------------------------------------------------------------------
// Item selection
// ---------------------------------------------------------------------------

/**
 * Items that count towards the analysis: everything in the grid except
 * soft-deleted rows and uploads still being processed (no tags yet, so they
 * would land in "other" and skew every number until they finish).
 */
export const analysableItems = (items: WardrobeItem[]): WardrobeItem[] =>
  items.filter(item => !item.is_deleted && !item.is_preparing);

// ---------------------------------------------------------------------------
// Category groups (stat tiles + item-type breakdown)
// ---------------------------------------------------------------------------

export const CATEGORY_GROUPS = [
  'top',
  'bottom',
  'one_piece',
  'outerwear',
  'shoes',
  'accessory',
  'other',
] as const;
export type CategoryGroup = (typeof CATEGORY_GROUPS)[number];

// Classification order: the specific groups go first so e.g. a "denim jacket"
// is outerwear and a "shirt dress" is a one-piece, not a top. Uses the same
// synonym matcher as the grid's type filter so the two never disagree.
const CLASSIFY_ORDER: Exclude<CategoryGroup, 'other'>[] = [
  'one_piece',
  'outerwear',
  'shoes',
  'bottom',
  'accessory',
  'top',
];

// Synonyms the grid matcher doesn't know but the analysis should still place
// (Figma lists Socks / Scarf under Accessories; some sources say "footwear").
const EXTRA_SYNONYMS: Partial<Record<CategoryGroup, string[]>> = {
  top: ['knit', 'sweater', 'hoodie', 'cardigan', 'polo', 'tank'],
  bottom: ['trouser', 'legging', 'chino'],
  outerwear: ['parka', 'trench'],
  shoes: ['footwear', 'sandal', 'loafer', 'trainer', 'slide'],
  accessory: ['scarf', 'sock', 'watch', 'sunglass', 'glove'],
};

const matchesGroup = (
  category: string | undefined,
  group: CategoryGroup,
): boolean => {
  if (matchesCategoryFilter(category, group)) return true;
  const normalized = category?.trim().toLowerCase() ?? '';
  return (
    normalized.length > 0 &&
    (EXTRA_SYNONYMS[group] ?? []).some(word => normalized.includes(word))
  );
};

export const classifyCategory = (category: string | undefined): CategoryGroup =>
  CLASSIFY_ORDER.find(group => matchesGroup(category, group)) ?? 'other';

/** By category; when that is unrecognised, by the AI subcategory ("trousers", "knit"…). */
const classifyItem = (item: WardrobeItem): CategoryGroup => {
  const byCategory = classifyCategory(item.category);
  if (byCategory !== 'other' || typeof item.subcategory !== 'string') {
    return byCategory;
  }
  return classifyCategory(item.subcategory);
};

export interface CategoryCounts {
  total: number;
  tops: number;
  bottoms: number;
  shoes: number;
  /** Everything that isn't a top, bottom or shoe (dresses, outerwear, accessories…). */
  others: number;
}

export const computeCategoryCounts = (
  items: WardrobeItem[],
): CategoryCounts => {
  let tops = 0;
  let bottoms = 0;
  let shoes = 0;
  items.forEach(item => {
    const group = classifyItem(item);
    if (group === 'top') tops += 1;
    else if (group === 'bottom') bottoms += 1;
    else if (group === 'shoes') shoes += 1;
  });
  return {
    total: items.length,
    tops,
    bottoms,
    shoes,
    others: items.length - tops - bottoms - shoes,
  };
};

export interface ItemTypeEntry {
  /** Display label, title-cased from the item's subcategory (or category). */
  label: string;
  count: number;
}

export interface ItemTypeGroup {
  group: CategoryGroup;
  count: number;
  types: ItemTypeEntry[];
}

const titleCase = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, ch => ch.toUpperCase());

const itemTypeLabel = (item: WardrobeItem): string | null => {
  const raw =
    (typeof item.subcategory === 'string' && item.subcategory.trim()) ||
    item.category?.trim() ||
    '';
  return raw ? titleCase(raw) : null;
};

/**
 * Items grouped by category, each with its subtype counts (Figma "Item Types":
 * Top 15 → T-Shirt 7, Shirt 7…). Groups follow `CATEGORY_GROUPS` order and are
 * omitted when empty; subtypes are sorted by count, then name.
 */
export const computeItemTypes = (items: WardrobeItem[]): ItemTypeGroup[] => {
  const byGroup = new Map<CategoryGroup, Map<string, number>>();
  const groupCounts = new Map<CategoryGroup, number>();

  items.forEach(item => {
    const group = classifyItem(item);
    groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
    const label = itemTypeLabel(item);
    if (!label) return;
    const types = byGroup.get(group) ?? new Map<string, number>();
    types.set(label, (types.get(label) ?? 0) + 1);
    byGroup.set(group, types);
  });

  return CATEGORY_GROUPS.filter(group => (groupCounts.get(group) ?? 0) > 0).map(
    group => ({
      group,
      count: groupCounts.get(group) ?? 0,
      types: Array.from(byGroup.get(group)?.entries() ?? [])
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    }),
  );
};

// ---------------------------------------------------------------------------
// Colour distribution
// ---------------------------------------------------------------------------

export const OTHER_COLOR_ID = 'other';

export interface ColorShare {
  /** Colour-family id (`COLOR_FAMILIES[].id`) or `OTHER_COLOR_ID`. */
  id: string;
  hex: string;
  count: number;
  /** 0–100, share of the items that have a colour tag. */
  percent: number;
}

/** The colour name an item is analysed by: its dominant colour, else its first tagged colour. */
const primaryColorName = (item: WardrobeItem): string | null => {
  const dominant =
    typeof item.dominant_color === 'string' ? item.dominant_color.trim() : '';
  if (dominant) return dominant;
  const first = Array.isArray(item.colors) ? item.colors[0] : undefined;
  return typeof first === 'string' && first.trim() ? first.trim() : null;
};

export const colorFamilyFor = (colorName: string): string => {
  const normalized = colorName.toLowerCase();
  return (
    COLOR_FAMILIES.find(family =>
      family.keywords.some(keyword => normalized.includes(keyword)),
    )?.id ?? OTHER_COLOR_ID
  );
};

const HEX_BY_FAMILY = new Map(COLOR_FAMILIES.map(f => [f.id, f.hex]));

/**
 * Share of each colour family across the wardrobe, largest first ("other"
 * always last). Items without any colour tag are left out of the denominator,
 * so untagged items don't read as a mystery colour.
 */
export const computeColorDistribution = (
  items: WardrobeItem[],
): ColorShare[] => {
  const counts = new Map<string, number>();
  let tagged = 0;
  items.forEach(item => {
    const name = primaryColorName(item);
    if (!name) return;
    tagged += 1;
    const family = colorFamilyFor(name);
    counts.set(family, (counts.get(family) ?? 0) + 1);
  });
  if (tagged === 0) return [];

  return Array.from(counts.entries())
    .map(([id, count]) => ({
      id,
      hex: HEX_BY_FAMILY.get(id) ?? OTHER_COLOR_HEX,
      count,
      percent: (count / tagged) * 100,
    }))
    .sort((a, b) => {
      if (a.id === OTHER_COLOR_ID) return 1;
      if (b.id === OTHER_COLOR_ID) return -1;
      return b.count - a.count;
    });
};

/**
 * "34.5" / "34,5" — one decimal, trailing ".0" dropped, decimal separator per
 * locale (the Figma reads "34,5%").
 */
export const formatPercent = (percent: number, locale: string): string => {
  const rounded = Math.round(percent * 10) / 10;
  try {
    return rounded.toLocaleString(locale, { maximumFractionDigits: 1 });
  } catch {
    return String(rounded);
  }
};
