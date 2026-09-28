import { apiClient } from './apiClient';

// AU-457 Discovery — public client. Wraps the shared `apiClient` (never a new
// axios instance). Backend contract (tech-lead-approved, phase 03):
//   GET /discovery/outfits            → paginated, filterable feed
//   GET /discovery/outfits/{id}       → one outfit's full detail
//   GET /discovery/trend-tags         → distinct tags across servable outfits
//   GET /discovery/colors             → colors present across servable outfits
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
//   • The feed and trend-tags are GENDER-FILTERED server-side from the
//     authenticated user's onboarding direction. Nothing is sent for it; the
//     applied value comes BACK as `applied_gender`. Detail is deliberately
//     NOT filtered, so a shared deep link always resolves.
//   • `color` on the wire is ONE comma-separated string (`NVY,WHT`), not an
//     array — axios would encode an array as `color[]=`, which FastAPI does
//     not read. The server ORs the codes (outfit has ANY selected color).
//   • `composite_image_url` / `season` / `image_png` may be `null`.
//   • An outfit can carry SEVERAL seasons: read `seasons` (calendar order,
//     `[]` = all-season) via `outfitSeasons()` (screens/discovery/discovery-filter.ts), never `season` — that is a
//     deprecated mirror of the first entry only.

export type DiscoverySeason = 'spring' | 'summer' | 'fall' | 'winter';

/**
 * Wardrobe-gender target on an outfit. `null` = visible to every wardrobe
 * (rows curated before gender targeting shipped).
 */
export type DiscoveryGender = 'M' | 'W' | 'U';

/**
 * One swatch in an outfit's color row / the color filter. `code` is the
 * backend palette code (`NVY`, `WHT`, …) and is what the filter sends;
 * `hex` is a server-supplied display color for the dot; `label` is the
 * English fallback when no `discovery.colors.<code>` translation exists.
 */
export interface DiscoveryColor {
  code: string;
  label: string;
  hex: string;
}

/** A filter-sheet color: the swatch plus how many servable outfits carry it. */
export interface DiscoveryColorOption extends DiscoveryColor {
  count: number;
}

export interface DiscoveryOutfitCard {
  id: string;
  title: string;
  composite_image_url: string | null;
  /** @deprecated first entry of `seasons` only — use `outfitSeasons()`. */
  season: DiscoverySeason | null;
  /** Every season the outfit is tagged with; `[]` = all-season. Optional
   *  only because backends before the multi-season change omit it. */
  seasons?: DiscoverySeason[];
  gender: DiscoveryGender | null;
  trend_tags: string[];
  /** Distinct item colors in item order. Optional only because backends
   *  before the color filter omit it — treat missing as `[]`. */
  colors?: DiscoveryColor[];
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
  color_code?: string | null;
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
  /**
   * The wardrobe gender the BACKEND applied to this feed, derived from the
   * user's wardrobe direction (Menswear/Womenswear, set at onboarding or in
   * Settings; legacy `users.gender` as a fallback) — `null` when no gender
   * resolves and the feed came back unfiltered.
   *
   * Reported, never requested: there is no client parameter for this and no
   * way to override it, so do NOT add one to `DiscoveryListParams`. Menswear
   * users receive `M` + `U` outfits, Womenswear `W` + `U` (`U` = both
   * wardrobes); untagged (`gender: null`) outfits reach everyone. `total` is
   * already the gender-filtered count, so pagination needs no adjustment.
   */
  applied_gender: DiscoveryGender | null;
}

export interface DiscoveryListParams {
  season?: DiscoverySeason;
  trendTag?: string;
  /** Palette codes; the outfit matches if it has ANY of them. */
  colors?: string[];
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
          color: params.colors?.length ? params.colors.join(',') : undefined,
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

  /** Colors present across the viewer's servable outfits (palette order). */
  listColors: async (): Promise<DiscoveryColorOption[]> => {
    try {
      const response = await apiClient.get('/discovery/colors');
      return (
        (response.data?.colors as DiscoveryColorOption[] | undefined) ?? []
      );
    } catch (error) {
      console.error('listColors error', error);
      throw error;
    }
  },
};
