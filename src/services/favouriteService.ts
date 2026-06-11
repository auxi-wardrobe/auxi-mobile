import { apiClient } from './apiClient';

// AU-318: deterministic per-request timeout so the mood feedback flow can
// distinguish a timed-out save ("Connection timed out…") from a generic
// failure. Without it axios never raises ECONNABORTED and a dead connection
// would leave the sheet spinning forever. The legacy direct-save path shares
// this — a >15s save now surfaces its existing 'error' retry state instead
// of hanging, which is strictly better.
const SAVE_FAVOURITE_TIMEOUT_MS = 15000;

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
      throw error;
    }
  },
};
