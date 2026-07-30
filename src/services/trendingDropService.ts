import { apiClient } from './apiClient';

// AU-438 Trending Item Drop — public client. Wraps the shared `apiClient`
// (never a new axios instance). Backend contract (Phase 1, tech-lead-approved):
//   GET  /trending-drop/active           → a drop object, or a RAW `null` body
//                                           (200) when none is active/unanswered.
//   POST /trending-drop/{id}/respond     → { response: 'ADDED' | 'DISMISSED',
//                                            cloned_item?: <wardrobe item> }
// Notes that bite if ignored:
//   • request `action` is LOWERCASE ('add' | 'dismiss'); the `response` field
//     comes back UPPERCASE ('ADDED' | 'DISMISSED') — asymmetric, don't assume.
//   • `active` can be a literal `null` body (not `{}`), or a 204 — normalise
//     all "nothing here" shapes to `null`.
//   • `cloned_item` is OPTIONAL — only present on an `add`.

export interface TrendingDropItem {
  id: string;
  image_url: string;
  image_png: string | null;
  category_code: string;
  layer_code: string;
  category_family: string;
}

export interface TrendingDrop {
  id: string;
  title: string;
  description: string;
  /** Optional hero image; the card falls back to the item image when null. */
  promo_image_url: string | null;
  item: TrendingDropItem;
}

export type TrendingDropAction = 'add' | 'dismiss';

export interface TrendingDropRespondResult {
  /** UPPERCASE on the wire — asymmetric with the lowercase request action. */
  response: 'ADDED' | 'DISMISSED';
  /** Present only when the action was `add`. */
  cloned_item?: unknown;
}

export const trendingDropService = {
  /**
   * The current active drop this user has not responded to, or `null`.
   * A 200 with a raw `null` body, a 204, or an empty body all mean "none".
   */
  getActiveDrop: async (): Promise<TrendingDrop | null> => {
    try {
      const response = await apiClient.get('/trending-drop/active');
      const data = response.data;
      // 204 → undefined; 200 with raw `null`/empty body → null/''. All "none".
      if (data == null || data === '' || !data.id) {
        return null;
      }
      return data as TrendingDrop;
    } catch (error) {
      console.error('getActiveDrop error', error);
      throw error;
    }
  },

  /**
   * Record the user's response to a drop. `action` is lowercase on the wire;
   * the returned `response` is uppercase. `cloned_item` is only present on add.
   */
  respondToDrop: async (
    id: string,
    action: TrendingDropAction,
  ): Promise<TrendingDropRespondResult> => {
    try {
      const response = await apiClient.post(`/trending-drop/${id}/respond`, {
        action,
      });
      return response.data as TrendingDropRespondResult;
    } catch (error) {
      console.error('respondToDrop error', error);
      throw error;
    }
  },
};
