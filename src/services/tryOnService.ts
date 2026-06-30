import { apiClient } from './apiClient';

// Submit is a quick enqueue; give it modest headroom over apiClient's default.
const SUBMIT_TIMEOUT_MS = 30000;

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

export type TryOnJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * AU-358 (breaking): `POST /api/tryon/highres` is now ASYNC. It enqueues a
 * render job on the worker and returns 202 with a job id — NOT the image.
 * Poll `getTryOnResult(job_id)` until the job is terminal.
 */
export interface SubmitTryOnResponse {
  job_id: string;
  status: TryOnJobStatus;
}

/**
 * Result of polling `GET /api/tryon/result/{job_id}`. `composite_url` is our
 * durable S3 URL, present only once `status === 'completed'`. (The async
 * result no longer carries `provider`/`composite_png` — the server picks the
 * provider transparently and always re-hosts to S3.)
 */
export interface TryOnJobResult {
  job_id: string;
  status: TryOnJobStatus;
  composite_url?: string | null;
  error?: string | null;
}

export const tryOnService = {
  /**
   * Submit a high-res render job. Resolves to `{ job_id, status }` (HTTP 202);
   * the caller polls `getTryOnResult` for the composite.
   */
  generateTryOn: async (
    payload: GenerateTryOnPayload,
  ): Promise<SubmitTryOnResponse> => {
    try {
      const response = await apiClient.post('/tryon/highres', payload, {
        timeout: SUBMIT_TIMEOUT_MS,
      });
      return response.data;
    } catch (error) {
      console.error('generateTryOn error', error);
      throw error;
    }
  },

  /** Poll a render job's status + composite URL. */
  getTryOnResult: async (jobId: string): Promise<TryOnJobResult> => {
    try {
      const response = await apiClient.get(`/tryon/result/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('getTryOnResult error', error);
      throw error;
    }
  },
};
