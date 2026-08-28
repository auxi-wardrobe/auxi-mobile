import { apiClient } from './apiClient';

// AU-457 Discovery — public client. Wraps the shared `apiClient` (never a new
// axios instance). Backend contract (tech-lead-approved, phase 03):
//   GET /discovery/outfits            → paginated, filterable feed
//   GET /discovery/outfits/{id}       → one outfit's full detail
//   GET /discovery/trend-tags         → distinct tags across servable outfits
// See `wardrobe-backend/API_DOCUMENTATION.md` §Discovery (AU-457) for the full
// contract, including the 1..4 item cap (D2) and the deliberately identical
// 404 envelope for "missing" vs "unpublished" outfits.
//
// Notes that bite if ignored:
//   • `getOutfit` returns `null` on a 404 (missing OR unpublished — the
//     backend does not distinguish, and neither should this client) and
//     rethrows every other error. Both the deep link (phase 09) and the
//     detail screen (phase 08) need this "gone → fall back" semantic.
//   • `trend_tag` on the wire (snake_case); the client param is `trendTag`.
//   • `composite_image_url` / `season` / `image_png` may be `null`.

export type DiscoverySeason = 'spring' | 'summer' | 'fall' | 'winter';

export interface DiscoveryOutfitCard {
  id: string;
  title: string;
  composite_image_url: string | null;
  season: DiscoverySeason | null;
  trend_tags: string[];
  item_count: number;
}

export interface DiscoveryOutfitItem {
  id: string;
  position: number;
  name: string;
  image_url: string;
  image_png: string | null;
  category: string;
  category_code: string;
  layer_code: string;
  is_common_item: boolean;
}

export interface DiscoveryOutfitDetail
  extends Omit<DiscoveryOutfitCard, 'item_count'> {
  description: string;
  items: DiscoveryOutfitItem[];
}

export interface DiscoveryOutfitsResponse {
  outfits: DiscoveryOutfitCard[];
  count: number;
  total: number;
  limit: number;
  offset: number;
}

export interface DiscoveryListParams {
  season?: DiscoverySeason;
  trendTag?: string;
  limit?: number;
  offset?: number;
}

const getErrorStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } })?.response?.status;

export const discoveryService = {
  /** Paginated, filterable feed of servable outfits. */
  listOutfits: async (
    params: DiscoveryListParams = {},
  ): Promise<DiscoveryOutfitsResponse> => {
    try {
      const response = await apiClient.get('/discovery/outfits', {
        params: {
          season: params.season,
          trend_tag: params.trendTag,
          limit: params.limit,
          offset: params.offset,
        },
      });
      return response.data as DiscoveryOutfitsResponse;
    } catch (error) {
      console.error('listOutfits error', error);
      throw error;
    }
  },

  /**
   * One outfit's full detail. Resolves `null` on a 404 — the backend uses an
   * identical envelope for "doesn't exist" and "not servable" so a social
   * link can never distinguish a draft's existence from a typo. Every other
   * error (401, 429, network) rethrows.
   */
  getOutfit: async (id: string): Promise<DiscoveryOutfitDetail | null> => {
    try {
      const response = await apiClient.get(`/discovery/outfits/${id}`);
      return response.data as DiscoveryOutfitDetail;
    } catch (error) {
      if (getErrorStatus(error) === 404) {
        return null;
      }
      console.error('getOutfit error', error);
      throw error;
    }
  },

  /** Distinct trend tags across all currently servable outfits. */
  listTrendTags: async (): Promise<string[]> => {
    try {
      const response = await apiClient.get('/discovery/trend-tags');
      return (response.data?.tags as string[] | undefined) ?? [];
    } catch (error) {
      console.error('listTrendTags error', error);
      throw error;
    }
  },
};
