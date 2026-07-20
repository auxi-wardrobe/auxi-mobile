import { Item } from '../../types/item';
import type { WardrobeItem } from '../../services/wardrobeService';
import type { RecommendationHistoryResponse } from '../../services/recommendationService';
import { OutfitSheet } from './types';

// "View latest outfits" fallback (styling-limit page).
//
// The recommendation-history endpoint is a read of the user's PAST outfits — it
// never runs the engine, so it's safe to call while they're over their daily
// styling limit. But each logged request carries only item IDs (not full item
// records), so we hydrate those IDs against the user's wardrobe to reconstruct
// displayable outfits. Items the wardrobe can't resolve (deleted, or a system
// item not in this list) are dropped; an outfit that ends up with fewer than
// two showable garments is skipped rather than rendered half-empty.

// Minimum garments an outfit must hydrate to before it's worth showing.
const MIN_ITEMS_PER_OUTFIT = 2;

const hasImage = (w: WardrobeItem): boolean =>
  Boolean(w.image_url || w.image_png || w.image_studio);

// Mirror of the wardrobe→Item mapping HomeScreen already uses for pinned /
// swapped items, kept local so this helper has no HomeScreen dependency.
const wardrobeItemToItem = (w: WardrobeItem): Item => ({
  id: w.id,
  image_url: w.image_url ?? '',
  image_png: w.image_png ?? null,
  image_studio: w.image_studio ?? null,
  name: w.name ?? null,
  category: w.category ?? 'Top',
  color: w.color_hex ?? '',
  isSystem: w.is_common_item ?? false,
  isExploration: false,
});

/**
 * Pull the `count` most-recently-served DISTINCT outfits out of the history
 * response and hydrate them into deck-ready `OutfitSheet`s using the wardrobe.
 *
 * Ordering: every logged request (across all sessions) is sorted by
 * `created_at` descending so the freshest looks lead; duplicates of the same
 * `outfit_hash` collapse to their most recent occurrence.
 */
export const extractLatestOutfitSheets = (
  history: RecommendationHistoryResponse | null | undefined,
  wardrobeById: Map<string, WardrobeItem>,
  count: number,
): OutfitSheet[] => {
  if (!history?.sessions?.length || count <= 0) {
    return [];
  }

  const requests = history.sessions
    .flatMap(session => session.requests ?? [])
    .filter(req => req && Array.isArray(req.outfit_items))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const seenHashes = new Set<string>();
  const sheets: OutfitSheet[] = [];

  for (const req of requests) {
    if (sheets.length >= count) {
      break;
    }
    const hash = req.outfit_hash;
    if (!hash || seenHashes.has(hash)) {
      continue;
    }
    seenHashes.add(hash);

    const items: Item[] = [];
    for (const itemId of req.outfit_items) {
      const wardrobeItem = wardrobeById.get(itemId);
      if (wardrobeItem && hasImage(wardrobeItem)) {
        items.push(wardrobeItemToItem(wardrobeItem));
      }
    }

    if (items.length < MIN_ITEMS_PER_OUTFIT) {
      continue;
    }

    sheets.push({
      items,
      outfitHash: hash,
      caption: req.styling_note ?? null,
    });
  }

  return sheets;
};
