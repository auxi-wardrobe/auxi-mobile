/**
 * Pure aggregation behind the Wardrobe Analysis screen. Everything is derived
 * client-side from the same `GET /wardrobe/items` list the grid already caches
 * (`wardrobeKeys.list('All')`), so the screen opens instantly from Wardrobe and
 * needs no new endpoint.
 */
import { ITEM_TYPES } from '../../content/item-types';
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
// Catalog codes
// ---------------------------------------------------------------------------

// Catalog items (Macgie starter items, database adds) carry structured codes
// instead of AI tags: `category_code` (TEE, LOF…) and `physical_attributes.
// color_code` (BLK, NVY…). Both are also baked into `human_readable_id`
// (`{SYS|USR}_{LAYER}_{CATEGORY}_{COLOR}_{FIT}_{INDEX}`, e.g.
// `USR_L2_TEE_WHT_REG_01`), which is the fallback when the list endpoint
// omits the explicit fields.
const HRID_PATTERN = /^(?:SYS|USR)_[A-Z0-9]+_([A-Z]{2,4})_([A-Z]{2,4})(?:_|$)/;

const asCode = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : null;

const hridParts = (item: WardrobeItem): RegExpMatchArray | null =>
  typeof item.human_readable_id === 'string'
    ? item.human_readable_id.toUpperCase().match(HRID_PATTERN)
    : null;

export const itemCategoryCode = (item: WardrobeItem): string | null =>
  asCode(item.category_code) ?? hridParts(item)?.[1] ?? null;

export const itemColorCode = (item: WardrobeItem): string | null => {
  const attrs = item.physical_attributes as
    | Record<string, unknown>
    | null
    | undefined;
  return (
    asCode(item.color_code) ??
    asCode(attrs?.color_code) ??
    hridParts(item)?.[2] ??
    null
  );
};

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

// docs_agent CATEGORY_CODE_TO_CATEGORY.
const GROUP_BY_CATEGORY_CODE: Record<string, CategoryGroup> = {
  UND: 'top',
  TEE: 'top',
  SHR: 'top',
  BLZ: 'outerwear',
  JKT: 'outerwear',
  JNS: 'bottom',
  CHI: 'bottom',
  PNT: 'bottom',
  SNK: 'shoes',
  BTS: 'shoes',
  LOF: 'shoes',
};

/**
 * By category; when that is unrecognised, by the catalog `category_code`, then
 * by the AI subcategory ("trousers", "knit"…).
 */
const classifyItem = (item: WardrobeItem): CategoryGroup => {
  const byCategory = classifyCategory(item.category);
  if (byCategory !== 'other') return byCategory;
  const code = itemCategoryCode(item);
  if (code && GROUP_BY_CATEGORY_CODE[code]) return GROUP_BY_CATEGORY_CODE[code];
  return typeof item.subcategory === 'string'
    ? classifyCategory(item.subcategory)
    : 'other';
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
  /**
   * Known type (`ITEM_TYPES[].id`, rendered via `wardrobe.analysis.types.*`)
   * — or null for an unrecognised one, shown by its raw `label`.
   */
  typeId: string | null;
  /** Fallback display text for an unrecognised type (title-cased tag). */
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

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Keyword → type, matched at the start of a word (see content/item-types.ts).
const TYPE_MATCHERS = ITEM_TYPES.map(type => ({
  id: type.id,
  pattern: new RegExp(
    `\\b(?:${type.keywords.map(escapeRegExp).join('|')})`,
    'i',
  ),
}));

// AI tags are snake_case ("t_shirt"); match them like words.
const typeByKeyword = (text: unknown): string | null => {
  if (typeof text !== 'string' || !text.trim()) return null;
  const words = text.replace(/_/g, ' ');
  return TYPE_MATCHERS.find(m => m.pattern.test(words))?.id ?? null;
};

const TYPE_BY_CODE = new Map(
  ITEM_TYPES.flatMap(type => type.codes.map(code => [code, type.id] as const)),
);

/**
 * The item's type: catalog `category_code` (LOF → loafers), else a keyword in
 * the AI `subcategory`, else a keyword in its `name` ("Black Leather
 * Loafers"), else in its category ("jeans"). Unrecognised items keep their raw subcategory as the label, and
 * as a last resort fall back to the category.
 */
export const itemType = (
  item: WardrobeItem,
): { typeId: string | null; label: string } | null => {
  const code = itemCategoryCode(item);
  const typeId =
    (code ? TYPE_BY_CODE.get(code) : undefined) ??
    typeByKeyword(item.subcategory) ??
    typeByKeyword(item.name) ??
    typeByKeyword(item.category) ??
    null;
  if (typeId) return { typeId, label: typeId };
  const raw =
    (typeof item.subcategory === 'string' && item.subcategory.trim()) ||
    item.category?.trim() ||
    '';
  return raw ? { typeId: null, label: titleCase(raw) } : null;
};

/**
 * Items grouped by category, each with its subtype counts (Figma "Item Types":
 * Top 15 → T-Shirt 7, Shirt 7…). Groups follow `CATEGORY_GROUPS` order and are
 * omitted when empty; subtypes are sorted by count, then name.
 */
export const computeItemTypes = (items: WardrobeItem[]): ItemTypeGroup[] => {
  const byGroup = new Map<CategoryGroup, Map<string, ItemTypeEntry>>();
  const groupCounts = new Map<CategoryGroup, number>();

  items.forEach(item => {
    const group = classifyItem(item);
    groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
    const type = itemType(item);
    if (!type) return;
    const key = type.typeId ? `type:${type.typeId}` : `raw:${type.label}`;
    const types = byGroup.get(group) ?? new Map<string, ItemTypeEntry>();
    const entry = types.get(key) ?? { ...type, count: 0 };
    entry.count += 1;
    types.set(key, entry);
    byGroup.set(group, types);
  });

  return CATEGORY_GROUPS.filter(group => (groupCounts.get(group) ?? 0) > 0).map(
    group => ({
      group,
      count: groupCounts.get(group) ?? 0,
      types: Array.from(byGroup.get(group)?.values() ?? []).sort(
        (a, b) => b.count - a.count || a.label.localeCompare(b.label),
      ),
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

const FAMILY_BY_CODE = new Map(
  COLOR_FAMILIES.flatMap(f => f.codes.map(code => [code, f.id] as const)),
);

/** The colour name an item is analysed by: its dominant colour, else its first tagged colour. */
const primaryColorName = (item: WardrobeItem): string | null => {
  const dominant =
    typeof item.dominant_color === 'string' ? item.dominant_color.trim() : '';
  if (dominant) return dominant;
  const first = Array.isArray(item.colors) ? item.colors[0] : undefined;
  return typeof first === 'string' && first.trim() ? first.trim() : null;
};

/**
 * The item's colour family, or null when it has no colour at all. AI tags
 * (photo uploads, or a colour the user edited) win; catalog items fall back to
 * their palette `color_code` — an unknown code (e.g. MUL = multi) is "other".
 */
export const itemColorFamily = (item: WardrobeItem): string | null => {
  const name = primaryColorName(item);
  if (name) return colorFamilyFor(name);
  const code = itemColorCode(item);
  if (code) return FAMILY_BY_CODE.get(code) ?? OTHER_COLOR_ID;
  return null;
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
    const family = itemColorFamily(item);
    if (!family) return;
    tagged += 1;
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
