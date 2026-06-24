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

// A single suggestion should carry at most one garment per category family —
// EXCEPT accessories. Hats, bags, sunglasses and earrings all share the one
// `Accessory` category today, so a hard one-per-category rule would hide a
// legitimate hat + bag pairing. We therefore allow up to two accessories while
// still collapsing duplicate garments (the user's own item plus a system
// `common_essential` fallback — two tops, two pairs of jeans). Within a
// category we keep the earliest slot and prefer the user's garment over a
// system fallback; a `protectedId` (the pinned item) always wins a slot.
const ACCESSORY_CATEGORY = 'accessory';
const MAX_ACCESSORIES = 2;

const categoryLimit = (categoryKey: string): number =>
  categoryKey === ACCESSORY_CATEGORY ? MAX_ACCESSORIES : 1;

export const dedupeByCategory = (
  items: Array<Item | null | undefined>,
  protectedId?: string,
): Item[] => {
  const slotsByCategory = new Map<string, number[]>();
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

    const slots = slotsByCategory.get(key) ?? [];
    if (slots.length < categoryLimit(key)) {
      slots.push(result.length);
      slotsByCategory.set(key, slots);
      result.push(item);
      continue;
    }

    // The category is full. Replace the weakest existing slot only when the
    // incoming item is stronger: the pin always claims a slot, and a user
    // garment displaces a system fallback. Prefer evicting a system item, and
    // never evict the pin.
    const isPin = !!protectedId && item.id === protectedId;
    if (isPin) {
      const victim =
        slots.find(i => result[i].id !== protectedId && result[i].isSystem) ??
        slots.find(i => result[i].id !== protectedId);
      if (victim !== undefined) {
        result[victim] = item;
      }
      continue;
    }
    if (!item.isSystem) {
      const victim = slots.find(
        i => result[i].id !== protectedId && result[i].isSystem,
      );
      if (victim !== undefined) {
        result[victim] = item;
      }
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
  // No length cap here: de-dup already bounds the result to one item per
  // garment family plus up to two accessories. The old `.slice(0, 4)` silently
  // dropped a 5th item — which, since accessories tend to come last in the
  // outfit array, was usually the hat/bag. The grid (`pickLayout`) renders
  // 5+ items via the hero-stack layout, so there's nothing to truncate for.
  const mixed = dedupeByCategory([pinnedItem, ...outfit.items], pinnedItem.id);
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
