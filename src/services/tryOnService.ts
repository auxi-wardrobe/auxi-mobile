import { apiClient } from './apiClient';

// High-res Gemini renders take ~10-20s; give the request generous headroom
// over the default axios timeout so a healthy render is never aborted
// mid-flight. (apiClient's base config has no timeout, so we set it here.)
const TRY_ON_TIMEOUT_MS = 120000;

/**
 * High-res try-on request — matches the backend `POST /api/tryon/highres`
 * JSON contract (`HighresTryOnRequest`):
 *   { body_id, wardrobe_item_ids, gemini_opt_in, prompt_params? }
 * `gemini_opt_in` MUST be true — the route rejects anything else with 400.
 */
export interface GenerateTryOnPayload {
  body_id: string;
  wardrobe_item_ids: string[];
  /** Consent flag; the backend requires `true` for high-res. */
  gemini_opt_in: boolean;
  prompt_params?: Record<string, unknown>;
}

/**
 * High-res try-on response. The backend uploads the composite to S3 and
 * returns `composite_url` (+ `composite_key`); when S3 is unavailable it
 * returns a base64 `composite_png` instead — exposed here so callers can
 * fall back. `provider` / `processing_time_ms` are diagnostic.
 */
export interface GenerateTryOnResponse {
  composite_url?: string;
  composite_key?: string;
  composite_png?: string;
  processing_time_ms?: number;
  provider?: string;
  message?: string;
  warnings?: string[];
}

export const tryOnService = {
  generateTryOn: async (
    payload: GenerateTryOnPayload,
  ): Promise<GenerateTryOnResponse> => {
    try {
      const response = await apiClient.post('/tryon/highres', payload, {
        timeout: TRY_ON_TIMEOUT_MS,
      });
      return response.data;
    } catch (error) {
      console.error('generateTryOn error', error);
      throw error;
    }
  },
};
