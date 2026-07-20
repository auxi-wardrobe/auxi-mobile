import { apiClient } from './apiClient';
import { Item } from '../types/item';

export interface Outfit {
  items: Item[]; // Assumes Item type matches or is compatible with backend response structure
  styling_note: string;
  outfit_hash: string;
  fallback_flags: string[];
}

export type RecommendationVariationAxis =
  | 'SILHOUETTE'
  | 'LAYERING'
  | 'COLOR'
  | 'NEW_ANCHOR';

export interface RecommendationResponse {
  outfit?: Outfit;
  session_id?: string;
  fallback_flags?: string[];
  variation_axis?: RecommendationVariationAxis;
  fallback?: boolean;
  message?: string;
}

export interface ValenGetRecommendationResponse {
  outfits: Outfit[];
}

// ── Recommendation history (`GET /recommendation/history`) ──────────────────
// Read-only log of the user's past recommendation sessions. Unlike `/start`
// and `/next`, it does NOT run the engine or consume the daily AI budget — so
// it's safe to call while the user is over their styling limit (the "View
// latest outfits" fallback on the limit page). Each request carries only item
// IDs; the caller hydrates them from the wardrobe for display.
export interface RecommendationHistoryRequest {
  request_type: 'start' | 'next';
  outfit_hash: string;
  outfit_items: string[];
  styling_note?: string | null;
  variation_axis?: string | null;
  processing_time_ms?: number;
  created_at: string;
}

export interface RecommendationHistorySession {
  session_id: string;
  started_at: string;
  requests: RecommendationHistoryRequest[];
}

export interface RecommendationHistoryResponse {
  sessions: RecommendationHistorySession[];
  total_sessions: number;
}

// PHASE C (AU-221): three modes per Figma sticky `1752:28109`.
// - `safe`     → blend in / lazy
// - `power`    → impressive / energy
// - `creative` → refresh / experiment
// Default is `safe` (also the wire-default when omitted).
export type RecommendationMode = 'safe' | 'power' | 'creative';

export const DEFAULT_RECOMMENDATION_MODE: RecommendationMode = 'safe';

export interface StartRecommendationParams {
  weather?: {
    lat?: number;
    long?: number;
    temp_c?: number;
  };
  user?: {
    gender: string;
    occasion: string;
  };
  // PHASE B (AU-222): mobile sends `pinned_item_id` to keep one favourite
  // garment present across reshuffles. Backend may ignore until the
  // mixing-around-pinned logic lands; mobile applies a local fallback in
  // `HomeScreen.tsx` until then.
  pinned_item_id?: string | null;
  // PHASE C (AU-221): mobile sends `mode` so the backend can bias
  // recommendations toward Safe / Power / Creative. Backend may ignore
  // until honoured; backend follow-up tracked alongside AU-221.
  mode?: RecommendationMode;
}

export interface NextRecommendationParams {
  session_id: string;
  current_outfit_hash: string;
  rejected_items?: string[];
  preferred_colors?: string[];
  style_feedback?: string;
  force_variation_axis?: RecommendationVariationAxis;
  // PHASE B/C (AU-222 / AU-221): mobile threads `pinned_item_id` and
  // `mode` through `/next` as well, so reshuffles inherit the latest pin
  // and mode bias. Backend tolerates unknown fields and the v2 engine
  // will start honouring them when AU-233 / AU-221 backend land.
  pinned_item_id?: string | null;
  mode?: RecommendationMode;
}

// PHASE A (AU-XXXX): cached session_id from `/recommendation/start`. The
// first `valenGetRecommendation` call hits `/start`; every subsequent call
// hits `/next` with this session_id + the previous outfit's hash.
//
// Closure-captured at module scope (see service-isolation discussion in
// the brief — Zustand is intentionally NOT introduced here). Reset on:
//   - explicit `valenGetRecommendation` /next 4xx (auto-fallback to /start)
// TODO: clear sessionId on logout — there is no clean hook today; once the
// AuthContext exposes a logout subscription we should listen for it here
// and call `recommendationService.resetSession()`.
let sessionId: string | null = null;
let lastOutfitHash: string | null = null;

const wrapAsValenResponse = (
  response: RecommendationResponse,
): ValenGetRecommendationResponse => {
  // `/start` and `/next` return a single outfit (or `{ fallback: true,
  // message }` when the session has no more variations). HomeScreen knows
  // how to append a single-element batch — just wrap into the legacy
  // `{ outfits: Outfit[] }` shape so the call site stays unchanged.
  if (response.outfit) {
    return { outfits: [response.outfit] };
  }
  return { outfits: [] };
};

const buildStartBody = (params: StartRecommendationParams): Record<string, unknown> => {
  const body: Record<string, unknown> = {
    weather: params.weather || { temp_c: 22 },
    user: { gender: 'MASCULINE', occasion: 'work', ...(params.user || {}) },
  };
  // PHASE B (AU-222) / PHASE C (AU-221): backend tolerates unknown fields;
  // forward-compat for when AU-233 / AU-221 backend land.
  if (params.pinned_item_id) {
    body.pinned_item_id = params.pinned_item_id;
  }
  if (params.mode && params.mode !== DEFAULT_RECOMMENDATION_MODE) {
    body.mode = params.mode;
  }
  return body;
};

const buildNextBody = (
  currentSessionId: string,
  currentOutfitHash: string,
  params: NextRecommendationParams | StartRecommendationParams,
): Record<string, unknown> => {
  const body: Record<string, unknown> = {
    session_id: currentSessionId,
    current_outfit_hash: currentOutfitHash,
  };
  // Style feedback only exists on NextRecommendationParams.
  if ('style_feedback' in params && params.style_feedback) {
    body.style_feedback = params.style_feedback;
  }
  if ('force_variation_axis' in params && params.force_variation_axis) {
    body.force_variation_axis = params.force_variation_axis;
  }
  if ('rejected_items' in params && params.rejected_items?.length) {
    body.rejected_items = params.rejected_items;
  }
  if ('preferred_colors' in params && params.preferred_colors?.length) {
    body.preferred_colors = params.preferred_colors;
  }
  if (params.pinned_item_id) {
    body.pinned_item_id = params.pinned_item_id;
  }
  if (params.mode && params.mode !== DEFAULT_RECOMMENDATION_MODE) {
    body.mode = params.mode;
  }
  return body;
};

export const recommendationService = {
  startRecommendation: async (params: StartRecommendationParams = {}): Promise<RecommendationResponse> => {
    try {
      const response = await apiClient.post('/recommendation/start', buildStartBody(params));
      return response.data;
    } catch (error) {
      console.error('startRecommendation error', error);
      throw error;
    }
  },

  nextRecommendation: async (params: NextRecommendationParams): Promise<RecommendationResponse> => {
    try {
      const response = await apiClient.post('/recommendation/next', params);
      return response.data;
    } catch (error) {
      console.error('nextRecommendation error', error);
      throw error;
    }
  },

  /**
   * Fetch the user's recommendation history (most-recent session first). This
   * is a lightweight read — it never runs the engine, so it can be called even
   * when the user has exhausted their daily styling limit. `limit` caps the
   * number of logged requests returned (backend default 50, max 100).
   */
  getRecommendationHistory: async (
    limit = 20,
  ): Promise<RecommendationHistoryResponse> => {
    try {
      const response = await apiClient.get('/recommendation/history', {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      console.error('getRecommendationHistory error', error);
      throw error;
    }
  },

  // Reset the cached session — call from logout once we wire that up.
  resetSession: () => {
    sessionId = null;
    lastOutfitHash = null;
  },

  // Façade used by HomeScreen. First invocation calls `/start`; every
  // subsequent invocation calls `/next` with the cached session_id +
  // the most recent outfit hash. Returns the legacy mobile contract
  // `{ outfits: Outfit[] }` (single-outfit batch) so HomeScreen Phase A/B/C
  // append-on-success logic keeps working.
  //
  // Fallback: if `/next` 4xx (e.g. session expired, invalid hash, backend
  // restart wiped the in-memory session_manager), we reset the cached
  // session and transparently fall back to a fresh `/start` so the user
  // doesn't get stuck. Errors from `/start` itself bubble up to HomeScreen's
  // `onError` handler.
  valenGetRecommendation: async (
    params: StartRecommendationParams & Partial<NextRecommendationParams> = {},
  ): Promise<ValenGetRecommendationResponse> => {
    // First call (cold start) OR explicit reset → /start.
    if (!sessionId) {
      const startResponse = await recommendationService.startRecommendation(params);
      if (startResponse.session_id) {
        sessionId = startResponse.session_id;
      }
      if (startResponse.outfit?.outfit_hash) {
        lastOutfitHash = startResponse.outfit.outfit_hash;
      }
      return wrapAsValenResponse(startResponse);
    }

    // Subsequent calls → /next. Prefer the explicit `current_outfit_hash`
    // from params (HomeScreen passes the active sheet's hash through the
    // prefetch trigger) and fall back to the cached `lastOutfitHash` from
    // the previous response if the call site didn't thread it through.
    const currentOutfitHash =
      params.current_outfit_hash || lastOutfitHash || '';

    try {
      const nextBody = buildNextBody(sessionId, currentOutfitHash, params);
      const response = await apiClient.post('/recommendation/next', nextBody);
      const data = response.data as RecommendationResponse;
      if (data.outfit?.outfit_hash) {
        lastOutfitHash = data.outfit.outfit_hash;
      }
      return wrapAsValenResponse(data);
    } catch (error: unknown) {
      // /next 4xx → reset session and fall back to /start. Common causes:
      // session expired (in-memory session_manager dropped it), backend
      // restarted, or current_outfit_hash mismatch.
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status && status >= 400 && status < 500) {
        console.warn(
          'valenGetRecommendation: /next 4xx — resetting session and retrying via /start',
          { status },
        );
        sessionId = null;
        lastOutfitHash = null;
        const startResponse = await recommendationService.startRecommendation(params);
        if (startResponse.session_id) {
          sessionId = startResponse.session_id;
        }
        if (startResponse.outfit?.outfit_hash) {
          lastOutfitHash = startResponse.outfit.outfit_hash;
        }
        return wrapAsValenResponse(startResponse);
      }
      console.error('valenGetRecommendation error', error);
      throw error;
    }
  },
};
