import { Dimensions } from 'react-native';
import {
  WardrobeItem,
  getItemUsageFrequency,
} from '../../services/wardrobeService';

const { width: screenWidth } = Dimensions.get('window');

// Wardrobe filter chips — design order (node 3234:17793).
export const FILTER_TABS = [
  'All',
  'Top',
  'Bottoms',
  'One-Piece',
  'Shoes',
  'Ac',
] as const;
export type FilterTab = (typeof FILTER_TABS)[number];

// Grid — Figma node 2850:16492: 3 columns, 24px side padding, 4px gaps, 3:4 tiles.
export const HORIZONTAL_PADDING = 12;
export const GRID_GAP = 4;
export const GRID_COLUMNS = 3;
// `Math.floor` is load-bearing, not cosmetic. The container is an exact-fit
// flexWrap row (3 * TILE_WIDTH + 2 * GRID_GAP === screenWidth - padding), so it
// has ZERO horizontal slack. The /3 division yields a fractional width (e.g.
// 127.33 on a 414pt screen). On @2x devices (iPhone 11 / XR / SE) the pixel
// grid is 0.5pt, so each tile rounds UP to 127.5 and the three rounded tiles
// overflow the row by ~0.5pt — the third tile wraps and the grid collapses to
// 2 columns. Flooring makes every tile slightly narrower than the exact third
// so the row always keeps ≥1pt of slack and holds 3 columns on all devices.
export const TILE_WIDTH = Math.floor(
  (screenWidth - HORIZONTAL_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) /
    GRID_COLUMNS,
);
export const TILE_HEIGHT = TILE_WIDTH * (4 / 3);

export const resolveFilterQuery = (
  selectedTab: FilterTab,
): string | undefined => {
  switch (selectedTab) {
    case 'Top':
      return 'top';
    case 'Bottoms':
      return 'bottom';
    case 'Shoes':
      return 'shoes';
    case 'One-Piece':
      return 'one_piece';
    case 'Ac':
      return 'accessory';
    case 'All':
    default:
      return undefined;
  }
};

export const isCommonItem = (item: WardrobeItem): boolean =>
  item.is_common_item === true ||
  item.user_id === null ||
  item.user_id === undefined;

// AU-361: items are uploaded then processed (bg-removal + auto-tagging) in the
// background. `is_preparing` flips true→false when processing finishes and the
// item becomes ready to use. The grid renders a "preparing" overlay while true.
export const isPreparing = (item: WardrobeItem): boolean =>
  item.is_preparing === true;

// True if the list contains any item still being processed. Drives the query's
// conditional refetch poll (replaces the old focus-time setInterval).
export const anyPreparing = (items?: WardrobeItem[] | null): boolean =>
  Array.isArray(items) && items.some(isPreparing);

// A grid tile shows at most one status pill (Figma: bottom-centre). The four
// states are mutually exclusive and resolved with the precedence
// new > less use > common (product decision):
//   • new      — one of the user's OWN items (not a catalog/common item) that
//     they uploaded but have not opened the detail for yet. "Viewed" is tracked
//     locally per-user (see WardrobeViewedContext); opening the detail clears
//     the tag. Checked first so a fresh upload reads as "new".
//   • less use — user explicitly demoted the item (NORMAL ↔ LESS_USED). Wins
//     over "common" so a demoted catalog item still reads as "less use".
//   • common   — item originates from our shared database (catalog).
//   • (none)   — a user item that has been seen.
export type TileStatus = 'new' | 'less_use' | 'common' | null;

export const resolveTileStatus = (
  item: WardrobeItem,
  viewed: boolean,
): TileStatus => {
  // "New" only applies to the user's own uploads, never to catalog/common
  // items — those carry the "common" tag regardless of whether they've been
  // opened.
  if (!isCommonItem(item) && !viewed) {
    return 'new';
  }
  if (getItemUsageFrequency(item) === 'LESS_USED') {
    return 'less_use';
  }
  if (isCommonItem(item)) {
    return 'common';
  }
  return null;
};

// Synthetic id for the optimistic "preparing" placeholder tile shown while a
// web import request is still in flight (before the backend item exists). The
// tile is display-only: presses on it are ignored and it's replaced by the
// real is_preparing item once the create call resolves + the list refetches.
export const PENDING_IMPORT_ID = '__pending_import__';

// While any item is still preparing we poll the wardrobe so the ready
// transition can actually be observed (the screen otherwise only refetches on
// focus). Kept light: a single refetch every few seconds, stopped once nothing
// is preparing.
export const PREPARING_POLL_MS = 4000;

// How long an item may stay in the preparing state before the client assumes
// processing failed, removes the item and toasts the user. Measured from when
// the client FIRST observes the item preparing (no server clock involved).
export const PREPARING_TIMEOUT_MS = 180_000;

// Cadence of the local stale-preparing check. Cheap (map scan only) — the
// network work happens at most once per expired item.
export const STALE_PREPARING_CHECK_MS = 1000;

// Bookkeeping for the stale-preparing timeout: record when each preparing item
// was first observed, and forget entries once the item is seen NOT preparing
// (it became ready, or the timeout removal succeeded). Items merely absent
// from `items` keep counting down — the wardrobe list is per-filter-tab, so an
// item can drop out of view while the backend is still processing it; the
// pre-delete server re-check makes a lingering entry harmless.
export const syncPreparingFirstSeen = (
  firstSeenAt: Map<string, number>,
  items: WardrobeItem[],
  now: number,
): void => {
  for (const item of items) {
    if (!item.id) {
      continue;
    }
    if (isPreparing(item)) {
      if (!firstSeenAt.has(item.id)) {
        firstSeenAt.set(item.id, now);
      }
    } else {
      firstSeenAt.delete(item.id);
    }
  }
};

// IDs whose preparing state has outlived the timeout and should be removed.
export const findExpiredPreparingIds = (
  firstSeenAt: Map<string, number>,
  now: number,
  timeoutMs: number = PREPARING_TIMEOUT_MS,
): string[] => {
  const expired: string[] = [];
  firstSeenAt.forEach((seenAt, id) => {
    if (now - seenAt >= timeoutMs) {
      expired.push(id);
    }
  });
  return expired;
};

// AU-361: how long the self-controlled "item ready" snackbar stays on screen
// before auto-hiding.
export const READY_SNACKBAR_MS = 4000;
