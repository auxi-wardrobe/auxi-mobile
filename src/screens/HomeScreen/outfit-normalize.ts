import { Item } from '../../types/item';
import { Outfit } from '../../services/recommendationService';
import { V05OutfitItem } from '../../services/v05Api';
import { OutfitSheet, OutfitSheetWithGrid } from './types';

const FAMILY_TO_CATEGORY: Record<string, string> = {
  TOP: 'Top',
  BOTTOM: 'Bottom',
  OUTER: 'Outerwear',
  FOOTWEAR: 'Shoes',
  FULL_BODY: 'Dress',
  ACCESSORY: 'Accessory',
};

export const mapV05Item = (it: V05OutfitItem): Item => ({
  id: it.id,
  image_url: it.image_url ?? '',
  image_png: it.image_png ?? null,
  name: it.name ?? null,
  category: it.category_family
    ? FAMILY_TO_CATEGORY[it.category_family] ?? it.category_family
    : 'Top',
  color: it.color_code ?? '',
  style: it.style_tags?.[0],
  isSystem: it.source === 'common_essential',
  isExploration: it.is_exploration_item ?? false,
});

export const buildGrid = (items: Item[]): Array<Item | null> =>
  Array.from({ length: items.length }, (_, index) => items[index] || null);

export const buildGridOutfitSheet = (
  outfit: OutfitSheet,
): OutfitSheetWithGrid => ({
  ...outfit,
  gridItems: buildGrid(outfit.items),
});

export const buildGridOutfitSheetWithPin = (
  outfit: OutfitSheet,
  pinnedItem: Item | null,
): OutfitSheetWithGrid => {
  if (!pinnedItem) {
    return buildGridOutfitSheet(outfit);
  }

  const existingIndex = outfit.items.findIndex(
    item => item?.id === pinnedItem.id,
  );

  if (existingIndex === 0) {
    return buildGridOutfitSheet(outfit);
  }

  if (existingIndex > 0) {
    const rest = outfit.items.filter(item => item?.id !== pinnedItem.id);
    const reordered: Item[] = [outfit.items[existingIndex], ...rest];
    return {
      ...outfit,
      items: reordered,
      gridItems: buildGrid(reordered),
    };
  }

  const mixed: Item[] = [pinnedItem, ...outfit.items.slice(0, 3)];
  return {
    ...outfit,
    items: mixed,
    gridItems: buildGrid(mixed),
  };
};

export const normalizeOutfits = (
  data: unknown,
  indexOffset: number = 0,
): OutfitSheet[] => {
  if (!data) {
    return [];
  }

  const raw = Array.isArray(data)
    ? (data as unknown[])
    : Array.isArray((data as { outfits?: unknown[] }).outfits)
    ? (data as { outfits: unknown[] }).outfits
    : [];

  return raw
    .map((entry, index): OutfitSheet | null => {
      if (!entry) {
        return null;
      }

      const fallbackHash = `outfit-${indexOffset + index}`;

      if (
        typeof entry === 'object' &&
        entry !== null &&
        'items' in entry &&
        Array.isArray((entry as Outfit).items)
      ) {
        const outfit = entry as Outfit;
        return {
          items: outfit.items || [],
          outfitHash: outfit.outfit_hash || fallbackHash,
          caption: (outfit as { caption?: string | null }).caption ?? null,
        };
      }

      if (Array.isArray(entry)) {
        const items = entry as Item[];
        return {
          items,
          outfitHash: fallbackHash,
        };
      }

      return null;
    })
    .filter((sheet): sheet is OutfitSheet => sheet !== null);
};
