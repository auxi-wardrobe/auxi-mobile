export interface Item {
  id: string;
  image_url: string;
  image_png?: string | null; // background-removed PNG cutout; falls back to image_url
  image_studio?: string | null; // accepted AI studio shot (beautify/enhance); wins display precedence when present
  name?: string | null; // display name (V05OutfitItem.name); null when backend has none

  category: string; // e.g., 'Top', 'Bottom', 'Shoes'
  color: string;
  style?: string; // e.g., 'Casual', 'Formal'
  season?: string; // e.g., 'Summer', 'Winter'
  isSystem: boolean; // true for "Standard Items", false for "User Items"
  userId?: string; // owner ID if isSystem is false
  isExploration?: boolean; // AU-351: newly-uploaded item in the active exploration window; renders the "Your Piece" badge. Defaults false.
  // AU-392: tile-status contract fields, kept in backend snake_case (not
  // camelCase like `isSystem`/`userId`/`isExploration` above) because they're
  // shared structurally with `WardrobeItem` / `FavouriteItem` via
  // `TileStatusInput` (src/utils/tile-status.ts) — reusing the wire casing
  // means `Item` satisfies that interface with zero adapter. Do NOT read
  // `isSystem` as a substitute for `is_common_item`: `isSystem` means
  // `source === 'common_essential'` and `dedupeByCategory` depends on that
  // exact meaning to prefer a user's garment over a system fallback.
  user_id?: string | null;
  is_common_item?: boolean;
  is_new?: boolean;
  usage_frequency?: 'NORMAL' | 'LESS_USED';
  /** True only for Macgie's seeded starter items — drives the "Macgie"
   *  badge + read-only/delete gating. A catalog item the user PICKED
   *  themselves is `false`: it is their own item. Never infer this from
   *  the `USR_` hrid prefix, which both kinds share. */
  is_default_item?: boolean;
  human_readable_id?: string | null;
}

export const CATEGORIES = [
  'Top',
  'Bottom',
  'Shoes',
  'Outerwear',
  'Accessory',
  'Dress',
];
export const COLORS = [
  'Red',
  'Blue',
  'Green',
  'Black',
  'White',
  'Yellow',
  'Pink',
  'Purple',
  'Grey',
  'Orange',
  'Brown',
  'Olive Green',
  'Beige',
  'Gray',
  'Dark Blue',
];
export const STYLES = ['Casual', 'Formal', 'Sport', 'Vintage', 'Modern'];
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter', 'All Season'];
