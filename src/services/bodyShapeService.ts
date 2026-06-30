/**
 * Body-shape generation service (AU-358).
 *
 * The "See this on me" flow now generates 3 AI body-shape photos
 * (slim / average / fuller) the user picks from, instead of static labels.
 * Generation runs on the backend worker, so this is an async submit→poll API:
 *
 *   1. POST /api/body-shape/generate {full_body_id, selfie_id, gemini_opt_in}
 *        → 202 { job_id, status: "pending" }
 *   2. GET  /api/body-shape/result/{job_id}  (poll ~2s)
 *        → { status, shapes:[{shape,image_url}], partial, error }
 *   3. POST /api/body-shape/select {job_id, shape}
 *        → the new primary BodyProfile (its id is the body_id for the render)
 *
 * All calls go through `apiClient`, so they inherit the Bearer-token request
 * interceptor + the 401 refresh-and-replay response interceptor (same as
 * `tryOnService` / `bodyService`). The polling loop lives in the background
 * generation store — this module is just the typed transport.
 */
import { apiClient } from './apiClient';
import { BodyProfile, BodyShape } from './bodyService';

export type BodyShapeJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

/** One generated body-shape photo: which build + its durable S3 URL. */
export interface GeneratedShape {
  shape: BodyShape;
  image_url: string;
}

/**
 * The body-shape job result. `shapes` may grow incrementally across polls and
 * arrive out of order (the backend renders the 3 builds in parallel) — sort by
 * `SHAPE_ORDER` for stable display. `partial` is true when only 1–2/3 builds
 * succeeded (the job is still `completed`); surface a "regenerate" affordance.
 */
export interface BodyShapeJobResult {
  job_id: string;
  status: BodyShapeJobStatus;
  shapes?: GeneratedShape[] | null;
  partial?: boolean | null;
  error?: string | null;
}

export interface GenerateBodyShapesPayload {
  full_body_id: string;
  selfie_id: string;
  /** Consent flag; the backend requires `true` (else 400). */
  gemini_opt_in: true;
}

// The 3-shape render is slower than a normal request (OpenAI does 3 builds in
// parallel); give the submit + each poll generous headroom over apiClient's
// default. The overall ceiling is enforced by the polling loop in the store.
const BODY_SHAPE_TIMEOUT_MS = 120000;

export const bodyShapeService = {
  /** Submit a 3-shape generation job. Resolves to the job id to poll. */
  generateBodyShapes: async (
    payload: GenerateBodyShapesPayload,
  ): Promise<{ job_id: string; status: BodyShapeJobStatus }> => {
    try {
      const response = await apiClient.post('/body-shape/generate', payload, {
        timeout: BODY_SHAPE_TIMEOUT_MS,
      });
      return response.data;
    } catch (error) {
      console.error('generateBodyShapes error', error);
      throw error;
    }
  },

  /** Poll a generation job's status + (partial) results. */
  getBodyShapeResult: async (jobId: string): Promise<BodyShapeJobResult> => {
    try {
      const response = await apiClient.get(`/body-shape/result/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('getBodyShapeResult error', error);
      throw error;
    }
  },

  /**
   * Persist the chosen build as the user's primary self-visualization profile.
   * Returns the new profile — its `id` is the `body_id` for the outfit render.
   */
  selectBodyShape: async (payload: {
    job_id: string;
    shape: BodyShape;
  }): Promise<BodyProfile> => {
    try {
      const response = await apiClient.post('/body-shape/select', payload);
      return response.data;
    } catch (error) {
      console.error('selectBodyShape error', error);
      throw error;
    }
  },
};
