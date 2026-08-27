// AU-392: shared 4-state tile status resolver — used by the wardrobe grid,
// the favourite outfit card and (later) the Home outfit grid / collage
// surfaces. Kept as a leaf module (no imports from services/screens) so it
// can't participate in an import cycle.

export type UsageFrequency = 'NORMAL' | 'LESS_USED';
export type TileStatus = 'new' | 'less_use' | 'common' | null;

/** Minimal shape needed to resolve a tile status. `WardrobeItem`,
 *  `FavouriteItem` and a mapped `Item` all satisfy it structurally — no cast
 *  required at the call site. `user_id` is widened to `string | number`
 *  because `WardrobeItem.user_id` (the richest source type) allows both. */
export interface TileStatusInput {
  is_common_item?: boolean;
  user_id?: string | number | null;
  is_new?: boolean;
  usage_frequency?: UsageFrequency | string | null;
  style_tags?: string[];
  /** True only for Macgie's seeded starter items — see `isCommonItem`. */
  is_default_item?: boolean;
}

// Duplicated (not imported) from `wardrobeService.ts`'s private
// `STYLE_TAG_LESS_USED` / `normalizeStyleTags` — importing the service here
// would require `TileStatusInput` to satisfy `WardrobeItem`'s required `id`
// field, defeating the point of the structural, cast-free input type. Both
// copies read the same three-line rule; if the legacy tag literal ever
// changes it must change in both places (see `wardrobeService.ts:9`).
const STYLE_TAG_LESS_USED = 'less-used';

const normalizeStyleTags = (tags: unknown): string[] =>
  Array.isArray(tags)
    ? tags.filter((tag): tag is string => typeof tag === 'string')
    : [];

const isLessUsedTile = (item: TileStatusInput): boolean =>
  item.usage_frequency === 'LESS_USED' ||
  normalizeStyleTags(item.style_tags).includes(STYLE_TAG_LESS_USED);

// Wears the "Macgie" badge: a SYSTEM catalog row, or one of Macgie's seeded
// starter items sitting in the user's wardrobe.
//
// The `USR_` hrid prefix used to stand in for the second case. It can't any
// more: a catalog item the user PICKED (Database screen, trending drop) gets
// the same `USR_` hrid as a seeded default, and picking something yourself
// makes it yours — it must read as a normal wardrobe item, no badge. Only the
// backend's `is_default_item` separates the two (see
// wardrobe-backend/models/wardrobe.py). Cross-referenced, deliberately not
// imported, by `ItemDetailScreen.tsx`'s `isCatalogItem`; same
// duplication-by-design rationale as `STYLE_TAG_LESS_USED` above — if this
// rule changes, change it in both places.
export const isCommonItem = (item: TileStatusInput): boolean =>
  item.is_common_item === true ||
  item.is_default_item === true ||
  item.user_id === null ||
  item.user_id === undefined;

// A grid tile shows at most one status pill (Figma: bottom-centre). The four
// states are mutually exclusive and resolved with the precedence
// new > less use > common (product decision):
//   • new      — one of the user's OWN items (not a catalog/common item) whose
//     backend review state is still `is_new=true`. Opening item detail persists
//     review state server-side so the tag is stable across devices.
//   • less use — user explicitly demoted the item (NORMAL ↔ LESS_USED). Wins
//     over "common" so a demoted catalog item still reads as "less use".
//   • common   — a SYSTEM catalog row, or one of Macgie's seeded starter
//     items. NOT a catalog item the user picked themselves — that one is
//     theirs and badges like any other wardrobe item.
//   • (none)   — a user item that has been seen.
export const resolveTileStatus = (item: TileStatusInput): TileStatus => {
  // "New" only applies to the user's own uploads, never to catalog/common
  // items — those carry the "common" tag regardless of whether they've been
  // opened.
  if (!isCommonItem(item) && item.is_new === true) {
    return 'new';
  }
  if (isLessUsedTile(item)) {
    return 'less_use';
  }
  if (isCommonItem(item)) {
    return 'common';
  }
  return null;
};
