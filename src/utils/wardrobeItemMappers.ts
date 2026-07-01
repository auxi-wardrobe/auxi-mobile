import { WardrobeItem } from '../services/wardrobeService';

/**
 * Domain codec / tag helpers for the wardrobe Item Detail screen.
 *
 * Extracted verbatim from ItemDetailScreen.tsx (AU-312 / GH-364 de-bloat).
 * These translate between the canonical option labels rendered in the UI
 * ('Top', 'Black', 'Business Casual'…) and the API / tag storage shapes
 * ('top', 'business_casual', 'fit:regular'…). Pure functions — no React,
 * no side effects — so they can be unit-tested in isolation.
 */

export type EditableField = 'category' | 'color' | 'fit' | 'style';

export type TFn = (key: string, options?: Record<string, unknown>) => string;

export const CATEGORY_OPTIONS = [
  'Top',
  'Bottom',
  'Shoes',
  'One-piece',
  'Outerwear',
  'Accessory',
];
export const FIT_OPTIONS = ['Slim', 'Regular', 'Oversize'];
export const STYLE_OPTIONS = ['Casual', 'Business Casual', 'Formal'];
export const COLOR_OPTIONS = [
  { label: 'Black', hex: '#272A32' },
  { label: 'Blue', hex: '#8EA1BE' },
  { label: 'Green', hex: '#7DAA8C' },
  { label: 'Grey', hex: '#8F939B' },
  { label: 'Red', hex: '#CC4C3E' },
  { label: 'White', hex: '#F5F7FA' },
  { label: 'Yellow', hex: '#D9C26A' },
  { label: 'Pink', hex: '#DAA2B1' },
  { label: 'Purple', hex: '#A493BE' },
  { label: 'Orange', hex: '#C68A5A' },
];
export const STYLE_TAG_LESS_USED = 'less-used';
export const FIT_TAG_PREFIX = 'fit:';

/**
 * AU-312: Figma read mode shows "Date: 11/06/2026" under the title.
 * Source field is `created_at`, rendered dd/mm/yyyy (qa-ui safe default #2).
 * Returns null on missing/invalid input so the row can be hidden (fallback
 * items pushed from Home carry no created_at). Exported for unit tests.
 */
export const formatItemDate = (iso?: string): string | null => {
  if (!iso) {
    return null;
  }

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const dd = String(parsed.getDate()).padStart(2, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${parsed.getFullYear()}`;
};

export const toTitleCase = (value: string): string =>
  value.replace(/_/g, ' ').replace(/\b\w/g, match => match.toUpperCase());

export const normalizeCategoryLabel = (category?: string): string => {
  const normalized = category?.trim().toLowerCase() || '';

  switch (normalized) {
    case 'top':
      return 'Top';
    case 'bottom':
      return 'Bottom';
    case 'shoes':
      return 'Shoes';
    case 'one_piece':
    case 'one-piece':
    case 'dress':
      return 'One-piece';
    case 'outerwear':
      return 'Outerwear';
    case 'accessory':
    case 'ac':
      return 'Accessory';
    default:
      return normalized ? toTitleCase(normalized) : 'Top';
  }
};

export const toApiCategory = (label: string): string => {
  const normalized = label.trim().toLowerCase();

  switch (normalized) {
    case 'top':
      return 'top';
    case 'bottom':
      return 'bottom';
    case 'shoes':
      return 'shoes';
    case 'one-piece':
      return 'one_piece';
    case 'outerwear':
      return 'outerwear';
    case 'accessory':
      return 'accessory';
    default:
      return normalized.replace(/\s+/g, '_');
  }
};

export const normalizeFormalityLabel = (formalityLevel?: string): string => {
  if (!formalityLevel) {
    return 'Casual';
  }

  if (formalityLevel.toLowerCase() === 'business_casual') {
    return 'Business Casual';
  }

  return toTitleCase(formalityLevel.toLowerCase());
};

export const toApiFormality = (label: string): string =>
  label.trim().toLowerCase().replace(/\s+/g, '_');

export const findColorHex = (label: string): string =>
  COLOR_OPTIONS.find(option => option.label === label)?.hex || '#8EA1BE';

export const normalizeColorLabel = (item: WardrobeItem): string => {
  if (item.dominant_color && typeof item.dominant_color === 'string') {
    return toTitleCase(item.dominant_color.toLowerCase());
  }

  if (Array.isArray(item.colors) && item.colors.length > 0) {
    return toTitleCase(String(item.colors[0]).toLowerCase());
  }

  if (typeof item.color_hex === 'string' && item.color_hex) {
    const matchedColor = COLOR_OPTIONS.find(
      option => option.hex.toLowerCase() === item.color_hex?.toLowerCase(),
    );
    return matchedColor?.label || 'Custom';
  }

  return 'Blue';
};

export const normalizeColorHex = (
  item: WardrobeItem,
  colorLabel: string,
): string => {
  if (
    colorLabel === 'Custom' &&
    typeof item.color_hex === 'string' &&
    item.color_hex
  ) {
    return item.color_hex;
  }

  return findColorHex(colorLabel);
};

export const replaceTag = (
  tags: string[],
  tagToReplace: string,
  enabled: boolean,
): string[] => {
  const nextTags = tags.filter(tag => tag !== tagToReplace);

  if (enabled) {
    nextTags.push(tagToReplace);
  }

  return nextTags;
};

export const replaceFitTag = (tags: string[], fitLabel: string): string[] => {
  const nextTags = tags.filter(tag => !tag.startsWith(FIT_TAG_PREFIX));
  nextTags.push(`${FIT_TAG_PREFIX}${fitLabel.trim().toLowerCase()}`);
  return nextTags;
};

export const areTagsEqual = (left: string[], right: string[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((tag, index) => tag === right[index]);
};

export const getFriendlyError = (
  error: any,
  fallback: string,
  t: TFn,
): string => {
  switch (error?.response?.status) {
    case 403:
      return t('wardrobe.itemDetail.error_403');
    case 404:
      return t('wardrobe.itemDetail.error_404');
    case 429:
      return t('wardrobe.itemDetail.error_429');
    default:
      return fallback;
  }
};

// DISPLAY-ONLY: localize a canonical option value (e.g. 'Top', 'Black') for
// rendering. The raw value still drives selection, lookup (toApiCategory /
// findColorHex / toApiFormality), comparison, and persistence — never mutate
// it. `EditableField` maps 1:1 to the `wardrobe.options.<group>` namespace.
// defaultValue falls back to the canonical English if a key is missing.
export const getOptionDisplayLabel = (
  t: TFn,
  field: EditableField,
  value: string,
): string => t(`wardrobe.options.${field}.${value}`, { defaultValue: value });

/**
 * Single source of truth per editable field — collapses the three parallel
 * `switch (field)` blocks (option list + picker header label) that used to
 * live in the screen. `options` are canonical values (localized at render via
 * getOptionDisplayLabel); `labelKey` is the i18n key for the picker header
 * (resolve with `t(FIELD_CONFIG[field].labelKey)`).
 */
export const FIELD_CONFIG: Record<
  EditableField,
  { options: string[]; labelKey: string }
> = {
  category: {
    options: CATEGORY_OPTIONS,
    labelKey: 'wardrobe.itemDetail.row_type',
  },
  color: {
    options: COLOR_OPTIONS.map(option => option.label),
    labelKey: 'wardrobe.itemDetail.row_color',
  },
  fit: {
    options: FIT_OPTIONS,
    labelKey: 'wardrobe.itemDetail.row_fit',
  },
  style: {
    options: STYLE_OPTIONS,
    labelKey: 'wardrobe.itemDetail.row_style',
  },
};
