/**
 * Pure aggregation behind the Wardrobe Analysis screen. Everything is derived
 * client-side from the same `GET /wardrobe/items` list the grid already caches
 * (`wardrobeKeys.list('All')`), so the screen opens instantly from Wardrobe and
 * needs no new endpoint.
 */
import { ITEM_TYPES } from '../../content/item-types';
import {
  COLOR_CODE_HEX,
  COLOR_FAMILIES,
  OTHER_COLOR_HEX,
} from '../../content/wardrobe-colors';
import { isHexColor, isSimilarToAny } from '../../utils/color-similarity';
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
  /** Every item — including unclassified ones, which have no tile. */
  total: number;
  /** Tops, plus outerwear. */
  tops: number;
  /** Bottoms, plus one-pieces (they live in the Bottoms group). */
  bottoms: number;
  shoes: number;
  accessories: number;
}

export const computeCategoryCounts = (
  items: WardrobeItem[],
): CategoryCounts => {
  let tops = 0;
  let bottoms = 0;
  let shoes = 0;
  let accessories = 0;
  items.forEach(item => {
    const group = classifyItem(item);
    // Outerwear is reported under tops (product decision).
    if (group === 'top' || group === 'outerwear') tops += 1;
    // One-pieces are reported under bottoms (product decision): the
    // "bottoms" tile matches the Bottoms group in Item Types.
    else if (group === 'bottom' || group === 'one_piece') bottoms += 1;
    else if (group === 'shoes') shoes += 1;
    else if (group === 'accessory') accessories += 1;
  });
  return { total: items.length, tops, bottoms, shoes, accessories };
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
  group: type.group as CategoryGroup,
  pattern: new RegExp(
    `\\b(?:${type.keywords.map(escapeRegExp).join('|')})`,
    'i',
  ),
}));

// Types an item of `group` may take. An unclassified item ("other") may take
// any type; everything else only its own group's types, so a top whose name
// starts a word with "ring" never reads as Jewelry.
const allowedIn = (group: CategoryGroup, typeGroup: CategoryGroup): boolean =>
  group === 'other' || group === typeGroup;

// AI tags are snake_case ("t_shirt"); match them like words.
const typeByKeyword = (text: unknown, group: CategoryGroup): string | null => {
  if (typeof text !== 'string' || !text.trim()) return null;
  const words = text.replace(/_/g, ' ');
  return (
    TYPE_MATCHERS.find(m => allowedIn(group, m.group) && m.pattern.test(words))
      ?.id ?? null
  );
};

const TYPE_BY_CODE = new Map(
  ITEM_TYPES.flatMap(type => type.codes.map(code => [code, type] as const)),
);

const GENERIC_SUBCATEGORIES = new Set([
  'top',
  'tops',
  'bottom',
  'bottoms',
  'shoe',
  'shoes',
  'footwear',
  'accessory',
  'accessories',
  'outerwear',
  'one piece',
  'one_piece',
  'one-piece',
  'clothing',
  'other',
]);

/** The single Bottoms row every one-piece is counted under. */
export const ONE_PIECE_TYPE_ID = 'one_piece';

/** Type id for items whose type can't be told (rendered "Other"). */
export const OTHER_TYPE_ID = 'other';

/**
 * The item's type within its group: catalog `category_code` (LOF → loafers),
 * else a keyword in the AI `subcategory`, its `name` ("Black Leather
 * Loafers"), the AI `description` ("Light blue denim shirt with white
 * buttons…"), then its category ("jeans"). Only types of the item's own group
 * are considered. An unrecognised AI subcategory is kept as a raw label
 * ("Bustier"); with nothing to go on the item is "other" — never a repeat of
 * the group name.
 */
export const itemType = (
  item: WardrobeItem,
  group: CategoryGroup = classifyItem(item),
): { typeId: string | null; label: string } => {
  const code = itemCategoryCode(item);
  const byCode = code ? TYPE_BY_CODE.get(code) : undefined;
  const typeId =
    (byCode && allowedIn(group, byCode.group as CategoryGroup)
      ? byCode.id
      : null) ??
    typeByKeyword(item.subcategory, group) ??
    typeByKeyword(item.name, group) ??
    typeByKeyword(item.description, group) ??
    typeByKeyword(item.category, group);
  if (typeId) return { typeId, label: typeId };

  const subcategory =
    typeof item.subcategory === 'string' ? item.subcategory.trim() : '';
  // A subcategory that just restates the group ("top", "shoes") says nothing.
  if (subcategory && !GENERIC_SUBCATEGORIES.has(subcategory.toLowerCase())) {
    return { typeId: null, label: titleCase(subcategory) };
  }
  return { typeId: OTHER_TYPE_ID, label: OTHER_TYPE_ID };
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
    const itemGroup = classifyItem(item);
    // One-pieces (dresses, jumpsuits…) are ONE row — "One Piece" — inside
    // Bottoms rather than a group of their own (product decision).
    const isOnePiece = itemGroup === 'one_piece';
    const group: CategoryGroup = isOnePiece ? 'bottom' : itemGroup;
    groupCounts.set(group, (groupCounts.get(group) ?? 0) + 1);
    const type = isOnePiece
      ? { typeId: ONE_PIECE_TYPE_ID, label: ONE_PIECE_TYPE_ID }
      : itemType(item, group);
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
      types: Array.from(byGroup.get(group)?.values() ?? []).sort((a, b) => {
        // "Other" (type unknown) always closes the list.
        if (a.typeId === OTHER_TYPE_ID) return 1;
        if (b.typeId === OTHER_TYPE_ID) return -1;
        return b.count - a.count || a.label.localeCompare(b.label);
      }),
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
  /** Items counted under this colour — each item counts exactly once. */
  count: number;
  /** 0–100, share of the coloured items; the shares always add up to 100. */
  percent: number;
}

const FAMILY_BY_CODE = new Map(
  COLOR_FAMILIES.flatMap(f => f.codes.map(code => [code, f.id] as const)),
);

// Palette code for "multi-colour" — never a single family.
const MULTI_COLOR_CODE = 'MUL';

// Colour names that describe a pattern rather than one colour
// ("black and white stripe", "floral print", "leopard").
const PATTERN_WORDS =
  /\b(?:stripe|striped|floral|print|printed|plaid|check|checked|checkered|gingham|tartan|polka|dot|leopard|zebra|animal|camo|camouflage|paisley|tie[- ]?dye|multi|multicolou?r|pattern|patterned|graphic|geometric|houndstooth|herringbone)/i;

const isSolidPattern = (value: unknown): boolean | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const normalized = value.trim().toLowerCase();
  return normalized === 'solid' || normalized === 'plain';
};

/** The colour the item is analysed by: its dominant colour, else its first tagged colour. */
const primaryColorName = (item: WardrobeItem): string | null => {
  const dominant =
    typeof item.dominant_color === 'string' ? item.dominant_color.trim() : '';
  if (dominant) return dominant;
  const first = Array.isArray(item.colors) ? item.colors[0] : undefined;
  return typeof first === 'string' && first.trim() ? first.trim() : null;
};

/**
 * True when the item is patterned (striped, floral, plaid, multi-colour…)
 * rather than one solid colour. Read from the AI `pattern`, the catalog
 * `physical_attributes.pattern_type`, the MUL palette code, or a pattern word
 * in the colour name itself.
 */
export const isPatterned = (item: WardrobeItem): boolean => {
  const attrs = item.physical_attributes as
    | Record<string, unknown>
    | null
    | undefined;
  if (isSolidPattern(item.pattern) === false) return true;
  if (isSolidPattern(attrs?.pattern_type) === false) return true;
  if (itemColorCode(item) === MULTI_COLOR_CODE) return true;
  const name = primaryColorName(item);
  return name !== null && PATTERN_WORDS.test(name);
};

/**
 * The ONE colour family an item counts towards, or null when it has no colour
 * at all. A solid item counts as its colour — the dominant one when the AI
 * tagged several (a white shirt with black buttons is white); a patterned
 * item (stripes, florals, multi-colour…) counts as "other". AI tags win over
 * the catalog palette `color_code`; an unknown code is "other".
 */
export const itemColorFamily = (item: WardrobeItem): string | null => {
  const name = primaryColorName(item);
  const code = itemColorCode(item);
  if (!name && !code) return null;
  if (isPatterned(item)) return OTHER_COLOR_ID;
  if (name) return colorFamilyFor(name);
  return FAMILY_BY_CODE.get(code as string) ?? OTHER_COLOR_ID;
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
 * Share of each colour family across the wardrobe, largest first ("other" —
 * patterned and unrecognised colours — always last). Every coloured item
 * counts exactly once, so the shares add up to 100%. Items without any colour
 * are left out of the denominator, so they don't read as a mystery colour.
 */
export const computeColorDistribution = (
  items: WardrobeItem[],
): ColorShare[] => {
  const counts = new Map<string, number>();
  let coloured = 0;
  items.forEach(item => {
    const family = itemColorFamily(item);
    if (!family) return;
    coloured += 1;
    counts.set(family, (counts.get(family) ?? 0) + 1);
  });
  if (coloured === 0) return [];

  return Array.from(counts.entries())
    .map(([id, count]) => ({
      id,
      hex: HEX_BY_FAMILY.get(id) ?? OTHER_COLOR_HEX,
      count,
      percent: (count / coloured) * 100,
    }))
    .sort((a, b) => {
      if (a.id === OTHER_COLOR_ID) return 1;
      if (b.id === OTHER_COLOR_ID) return -1;
      return b.count - a.count;
    });
};

// ---------------------------------------------------------------------------
// Best-colour match (skin-tone card)
// ---------------------------------------------------------------------------

/**
 * The single colour an item reads as, as a hex — or null when it has none or
 * is patterned (stripes / florals / multi-colour aren't one colour to
 * compare). Most precise first: the AI / user-edited `color_hex` (ItemDetail
 * writes it alongside the colour label), then the catalog palette code, then
 * the swatch of the colour family its name falls in.
 */
export const itemColorHex = (item: WardrobeItem): string | null => {
  if (isPatterned(item)) return null;
  // Typed as a string, but AI tagging actually returns an array aligned with
  // `colors` (docs_agent: "color_hex": ["#7BA5D6", "#FFFFFF"]).
  const colorHex = item.color_hex as unknown;
  const rawHex = Array.isArray(colorHex) ? colorHex[0] : colorHex;
  if (isHexColor(rawHex)) return rawHex.trim();
  const code = itemColorCode(item);
  if (code && COLOR_CODE_HEX[code]) return COLOR_CODE_HEX[code];
  const family = itemColorFamily(item);
  return family && family !== OTHER_COLOR_ID
    ? HEX_BY_FAMILY.get(family) ?? null
    : null;
};

/**
 * How many items are in a colour at least 70% alike (perceptually) to one of
 * `palette` — "Items in colors similar to your best colors: 15 / 45".
 */
export const countItemsInPalette = (
  items: WardrobeItem[],
  palette: string[],
): number =>
  items.reduce((n, item) => {
    const hex = itemColorHex(item);
    return hex && isSimilarToAny(hex, palette) ? n + 1 : n;
  }, 0);

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
