import { Item } from '../../types/item';
import { Favourite, FavouriteItem } from '../../services/favouriteService';
import { ScheduledOutfit } from '../../context/ScheduleContext';
import { OutfitSheet } from './types';

// Home-deck sheets synthesised from the user's SCHEDULED outfits for a given
// calendar day. When the app is opened on a day the user has planned an outfit
// for, that outfit leads the Home suggestion deck (before the AI
// recommendations) and its caption renders a "scheduled" calendar badge so the
// user understands why it is there.
//
// Only FAVOURITE schedule entries map here: the Home deck renders a garment
// grid (Item[]), which a saved favourite's `outfit_items` provide directly.
// Canvas creations are collages with no flat item list, so they are not
// injected into the recommendation deck.

/** Namespacing prefix for a scheduled sheet's `outfitHash` so it never collides
 *  with a recommendation hash and can be identified / stripped when the plan
 *  changes. */
export const SCHEDULED_HASH_PREFIX = 'scheduled-';

export const isScheduledHash = (hash: string): boolean =>
  hash.startsWith(SCHEDULED_HASH_PREFIX);

/** Map a saved-favourite garment (backend `WardrobeItem.to_dict()` shape) to
 *  the app `Item` the Home tile renderer expects. Mirrors the swap-item mapper
 *  in HomeScreen: `is_common_item` → `isSystem`, best-effort `color_hex`. */
const favouriteItemToItem = (fi: FavouriteItem): Item => {
  const colorHex = fi.color_hex;
  return {
    id: fi.id,
    image_url: fi.image_url ?? '',
    image_png: fi.image_png ?? null,
    name: fi.name ?? null,
    category: fi.category ?? 'Top',
    color: typeof colorHex === 'string' ? colorHex : '',
    isSystem: fi.is_common_item ?? false,
    isExploration: false,
  };
};

const favouriteToSheet = (favourite: Favourite): OutfitSheet => ({
  items: (favourite.outfit_items ?? []).map(favouriteItemToItem),
  outfitHash: `${SCHEDULED_HASH_PREFIX}${favourite.id}`,
  caption: favourite.title ?? favourite.outfit_context?.reasoning_human ?? null,
  scheduled: true,
});

/** Build the scheduled-outfit sheets for a single day's plan. Favourites only
 *  (creations are skipped — see module note). Empty / missing input → []. */
export const buildScheduledOutfitSheets = (
  outfits: ScheduledOutfit[] | undefined,
): OutfitSheet[] =>
  (outfits ?? [])
    .filter(
      (o): o is Extract<ScheduledOutfit, { kind: 'favourite' }> =>
        o.kind === 'favourite',
    )
    .map(o => favouriteToSheet(o.favourite));

/** Keep the scheduled sheets as an always-present, deduped PREFIX of the deck.
 *  Strips every scheduled sheet already in `list` (so unscheduled outfits drop
 *  and re-scheduled ones don't duplicate), then re-prepends the day's current
 *  scheduled sheets — result is `[scheduled…, recommendations…]`. */
export const withScheduledPrefix = (
  list: OutfitSheet[],
  scheduled: OutfitSheet[],
): OutfitSheet[] => {
  const recommendations = list.filter(o => !isScheduledHash(o.outfitHash));
  return [...scheduled, ...recommendations];
};
