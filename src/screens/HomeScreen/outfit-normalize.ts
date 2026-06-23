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

// A single suggestion should carry at most one garment per category family.
// When it doesn't — typically the user's own item plus a system
// `common_essential` fallback of the same category (two tops, two pairs of
// jeans) — the sheet would render the duplicate. Collapse to one item per
// category, keeping the first occurrence's slot and preferring the user's own
// garment over the system fallback. A `protectedId` (the pinned item) always
// wins its category regardless of source.
export const dedupeByCategory = (
  items: Item[],
  protectedId?: string,
): Item[] => {
  const indexByCategory = new Map<string, number>();
  const result: Item[] = [];

  for (const item of items) {
    if (!item) {
      continue;
    }

    const key = item.category?.trim().toLowerCase();
    // Items without a category can't be compared — keep them all rather than
    // collapsing unrelated garments into one bucket.
    if (!key) {
      result.push(item);
      continue;
    }

    const existingIndex = indexByCategory.get(key);
    if (existingIndex === undefined) {
      indexByCategory.set(key, result.length);
      result.push(item);
      continue;
    }

    const existing = result[existingIndex];
    // Never displace a pinned item from its slot.
    if (protectedId && existing.id === protectedId) {
      continue;
    }
    // The incoming item takes the slot if it's the pin, or if it's the user's
    // garment beating a system fallback. Otherwise the earlier item stays.
    if (
      (protectedId && item.id === protectedId) ||
      (existing.isSystem && !item.isSystem)
    ) {
      result[existingIndex] = item;
    }
  }

  return result;
};

export const buildGridOutfitSheet = (
  outfit: OutfitSheet,
): OutfitSheetWithGrid => {
  const items = dedupeByCategory(outfit.items);
  return {
    ...outfit,
    items,
    gridItems: buildGrid(items),
  };
};

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

  if (existingIndex >= 0) {
    // Pinned item is already in this outfit — float it to the front, then
    // collapse any same-category duplicate (the pin always keeps its slot, so
    // a stray system top alongside the pinned top is dropped).
    const rest = outfit.items.filter(item => item?.id !== pinnedItem.id);
    const reordered = dedupeByCategory(
      [outfit.items[existingIndex], ...rest],
      pinnedItem.id,
    );
    return {
      ...outfit,
      items: reordered,
      gridItems: buildGrid(reordered),
    };
  }

  // The pinned item isn't in this outfit — the backend hasn't built around it
  // (AU-222/AU-233), so the outfit still carries its own item of the pinned
  // item's category (e.g. a top). Prepend the pin and let the de-dup drop the
  // outfit's same-category item; otherwise the sheet shows two of the same
  // category (pin a shirt → two shirts).
  //
  // Cap at 4 = the pin + 3 outfit garments (e.g. top, bottom, shoes), matching
  // the previous behaviour before the pin was prepended. De-dup runs first so
  // the cap counts distinct categories, not the dropped same-category item.
  const mixed = dedupeByCategory(
    [pinnedItem, ...outfit.items],
    pinnedItem.id,
  ).slice(0, 4);
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
