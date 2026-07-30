import * as Sentry from '@sentry/react-native';
import { apiClient } from './apiClient';
import { Item } from '../types/item';

// AU-318: deterministic per-request timeout so the mood feedback flow can
// distinguish a timed-out save ("Connection timed out…") from a generic
// failure. Without it axios never raises ECONNABORTED and a dead connection
// would leave the sheet spinning forever. The legacy direct-save path shares
// this — a >15s save now surfaces its existing 'error' retry state instead
// of hanging, which is strictly better.
const SAVE_FAVOURITE_TIMEOUT_MS = 15000;

const reportFavouriteError = (error: unknown): void => {
  Sentry.captureException(error, { tags: { feature: 'favourite' } });
};

export interface SaveFavouritePayload {
  outfit_hash: string;
  item_ids: string[];
  source: 'home';
  /**
   * AU-318: bounded mood vocabulary ids (≤8) — chip ids from
   * `components/features/mood-chips.ts`, validated server-side against
   * `mood_vocab.py`. Omitted = legacy wear-only save.
   */
  mood_tags?: string[];
  /**
   * The per-outfit message shown on Home (V05 `reasoning_human`). Persisted
   * so the favourite card can render it as the centred title hero
   * (Figma `3539:22165`). Optional + backward-safe: the backend ignores it
   * until the `favorites.title` column ships (contract
   * `wardrobe-backend/docs/favorites-title-mood-contract.md`). Omit when the
   * outfit has no message rather than sending an empty string.
   */
  title?: string;
}

export interface SaveFavouriteResponse {
  id: string;
  outfit_hash: string;
  created_at: string;
  /**
   * AU-318 (Phase 1 contract): `false` on create (HTTP 201), `true` when the
   * POST mood-updated an already-existing favourite (HTTP 200, dedup case).
   * Both are 2xx successes — callers branch on this flag, never on status.
   */
  updated: boolean;
}

/**
 * One garment inside a saved favourite. Backend `WardrobeItem.to_dict()`
 * shape — reuses the app `Item` fields where they overlap (`image_url`,
 * `image_png`, `category`) and adds the backend-only `is_common_item`
 * boolean. We keep this as its own type (rather than the RN `Item`) because
 * the favourites payload speaks the backend's `is_common_item` flag, not the
 * client's `isSystem` alias — the screen maps one to the other when it reuses
 * the Home tile renderer.
 *
 * AU-392: `user_id`, `is_new`, `usage_frequency`, `style_tags` and (fix pass)
 * `human_readable_id` are promoted out of the index signature onto the type
 * proper. They already arrive on the wire — `Favorite.to_dict()` inlines
 * `WardrobeItem.to_dict()`
 * (`wardrobe-backend/models/favorite.py:70` → `models/wardrobe.py:168-210`),
 * no backend change needed — so this is a type-only widening that lets
 * `FavouriteOutfitCard`'s `Tile` feed an item straight into the shared
 * `resolveTileStatus` (`src/utils/tile-status.ts`) without a cast.
 * `human_readable_id` additionally lets `isCommonItem` recognize `USR_`-
 * prefixed per-user catalog clones on favourite cards.
 */
export interface FavouriteItem
  extends Pick<Item, 'id' | 'image_url' | 'image_png' | 'name' | 'category'> {
  is_common_item?: boolean;
  user_id?: string | number | null;
  is_new?: boolean;
  usage_frequency?: string | null;
  style_tags?: string[];
  human_readable_id?: string | null;
  // Pass-through for any other backend item fields the tile doesn't read.
  [key: string]: unknown;
}

/** Context blob the backend stores alongside the outfit (occasion, hash, …). */
export interface FavouriteContext {
  outfit_hash?: string;
  occasion?: string;
  reasoning_human?: string;
  [key: string]: unknown;
}

/** A single saved outfit returned by `GET /favorites`. */
export interface Favourite {
  id: string;
  user_id: string;
  outfit_items: FavouriteItem[];
  outfit_context: FavouriteContext | null;
  outfit_thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  /**
   * Optional bold outfit title shown above the mood pill (Figma `3539:22165`,
   * e.g. "Bring some warmth."). Backend-added (parallel work); absent on older
   * responses — the card omits the title line when null/missing.
   */
  title?: string | null;
  /**
   * Saved mood ids (mood-chip vocab from `components/features/mood-chips.ts`,
   * e.g. `["confident"]`). The card renders the FIRST entry as a filled
   * vibe-tag pill (Figma `3539:22327`). Absent on older responses — omit the
   * pill then.
   */
  mood_tags?: string[];
}

/** Paginated envelope returned by `GET /favorites`. */
export interface FavoriteListResponse {
  count: number;
  total: number;
  favorites: Favourite[];
}

export type FavouriteSort = 'recent' | 'oldest';

export const favouriteService = {
  saveFavourite: async (
    payload: SaveFavouritePayload,
  ): Promise<SaveFavouriteResponse> => {
    try {
      const response = await apiClient.post('/favourites', payload, {
        timeout: SAVE_FAVOURITE_TIMEOUT_MS,
      });
      return response.data;
    } catch (error) {
      console.error('saveFavourite error', error);
      reportFavouriteError(error);
      throw error;
    }
  },

  /**
   * List saved outfits. `GET /favorites?limit&offset&sort`. The backend
   * exposes both `/favorites` (canonical) and `/favourites` (alias); we use
   * the canonical American spelling to match `API_DOCUMENTATION.md`.
   */
  listFavourites: async (
    limit = 20,
    offset = 0,
    sort: FavouriteSort = 'recent',
  ): Promise<FavoriteListResponse> => {
    try {
      const response = await apiClient.get('/favorites', {
        params: { limit, offset, sort },
      });
      return response.data;
    } catch (error) {
      console.error('listFavourites error', error);
      reportFavouriteError(error);
      throw error;
    }
  },

  /** Remove a saved outfit. `DELETE /favorites/{id}` → `{ message }`. */
  removeFavourite: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.delete(`/favorites/${id}`);
      return response.data;
    } catch (error) {
      console.error('removeFavourite error', error);
      reportFavouriteError(error);
      throw error;
    }
  },
};
