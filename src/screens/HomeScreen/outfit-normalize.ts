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

// Canonical garment families. Backend `/v05` items already arrive as 'Top' /
// 'Bottom' / 'Dress' (see FAMILY_TO_CATEGORY), but a *pinned* item resolved
// from the wardrobe carries its free-form stored category — 'Jeans', 'Pants',
// 'Skirt', 'Shirt', 'Jumpsuit', … — which never string-matches the canonical
// label. Classifying both into the same family is what lets the de-dup collapse
// a pinned 'Jeans' against the outfit's 'Bottom' (otherwise: two bottoms).
//
// Keyword sets mirror `matchesCategoryFilter` in wardrobeService.ts — keep the
// two in sync. `one_piece` is tested first so a 'shirt dress' lands in
// ONE_PIECE, not TOP.
export const ONE_PIECE_FAMILY = 'one_piece';

export const classifyCategoryFamily = (category?: string): string => {
  const c = category?.trim().toLowerCase() ?? '';
  if (!c) {
    return '';
  }
  if (
    c.includes('dress') ||
    c.includes('jumpsuit') ||
    c.includes('one-piece') ||
    c.includes('one piece') ||
    c.includes('overall') ||
    c.includes('romper')
  ) {
    return ONE_PIECE_FAMILY;
  }
  if (
    c.includes('outer') ||
    c.includes('coat') ||
    c.includes('jacket') ||
    c.includes('blazer')
  ) {
    return 'outer';
  }
  if (
    c.includes('shoe') ||
    c.includes('sneaker') ||
    c.includes('boot') ||
    c.includes('heel') ||
    c.includes('footwear') ||
    c.includes('sandal') ||
    c.includes('loafer')
  ) {
    return 'shoes';
  }
  if (
    c.includes('bottom') ||
    c.includes('pant') ||
    c.includes('jean') ||
    c.includes('skirt') ||
    c.includes('short') ||
    c.includes('trouser') ||
    c.includes('legging')
  ) {
    return 'bottom';
  }
  if (
    c.includes('top') ||
    c.includes('shirt') ||
    c.includes('tee') ||
    c.includes('blouse') ||
    c.includes('sweater') ||
    c.includes('hoodie') ||
    c.includes('knit')
  ) {
    return 'top';
  }
  if (
    c.includes('accessor') ||
    c.includes('bag') ||
    c.includes('belt') ||
    c.includes('hat') ||
    c.includes('jewel') ||
    c.includes('scarf') ||
    c.includes('sunglass') ||
    c.includes('watch')
  ) {
    return 'accessory';
  }
  // Unknown but non-empty — fall back to the raw string so two distinct unknown
  // categories aren't merged into one bucket.
  return c;
};

// A single suggestion should carry at most one garment per category family.
// When it doesn't — typically the user's own item plus a system
// `common_essential` fallback of the same category (two tops, two pairs of
// jeans) — the sheet would render the duplicate. Collapse to one item per
// family, keeping the first occurrence's slot and preferring the user's own
// garment over the system fallback. A `protectedId` (the pinned item) always
// wins its family regardless of source.
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

    const key = classifyCategoryFamily(item.category);
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

// A one-piece (dress / jumpsuit — backend FULL_BODY) covers the torso *and*
// legs, so it can't share an outfit with a separate Top or Bottom. The backend
// normally enforces this, but it can relax the rule to honour a pin (the
// `low_confidence` path) and a locally-injected pinned item bypasses it
// entirely — both surface the invalid "pants + dress" / "dress + shirt" combo.
// Drop whichever side loses so the sheet only ever shows one coherent
// silhouette.
//
// The pinned item decides which silhouette wins (you pinned it — you keep it).
// With no decisive pin, keep the more complete look: a full Top+Bottom pair
// beats a stray one-piece, otherwise the one-piece beats a lone separate.
export const resolveOnePieceConflicts = (
  items: Item[],
  protectedId?: string,
): Item[] => {
  const hasOnePiece = items.some(
    item => classifyCategoryFamily(item.category) === ONE_PIECE_FAMILY,
  );
  const hasTop = items.some(
    item => classifyCategoryFamily(item.category) === 'top',
  );
  const hasBottom = items.some(
    item => classifyCategoryFamily(item.category) === 'bottom',
  );
  if (!hasOnePiece || (!hasTop && !hasBottom)) {
    return items;
  }

  const pinnedFamily = protectedId
    ? classifyCategoryFamily(
        items.find(item => item.id === protectedId)?.category,
      )
    : undefined;

  let keepOnePiece: boolean;
  if (pinnedFamily === ONE_PIECE_FAMILY) {
    keepOnePiece = true;
  } else if (pinnedFamily === 'top' || pinnedFamily === 'bottom') {
    keepOnePiece = false;
  } else {
    keepOnePiece = !(hasTop && hasBottom);
  }

  return items.filter(item => {
    const family = classifyCategoryFamily(item.category);
    return keepOnePiece
      ? family !== 'top' && family !== 'bottom'
      : family !== ONE_PIECE_FAMILY;
  });
};

// Full display normalization for one suggestion: collapse same-family
// duplicates, then drop any one-piece-vs-separate conflict.
export const normalizeOutfitItems = (
  items: Item[],
  protectedId?: string,
): Item[] =>
  resolveOnePieceConflicts(dedupeByCategory(items, protectedId), protectedId);

export const buildGridOutfitSheet = (
  outfit: OutfitSheet,
): OutfitSheetWithGrid => {
  const items = normalizeOutfitItems(outfit.items);
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
    const reordered = normalizeOutfitItems(
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
  const mixed = normalizeOutfitItems(
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
