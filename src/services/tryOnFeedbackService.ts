/**
 * See-on-me redesign (B3) — thumbs up/down feedback on the try-on result
 * screen (Figma 4814:11877). `POST /api/tryon/feedback` per the spec's
 * contract:
 *
 *   Request:  { job_id, result_url, vote: 'up' | 'down' }
 *   Response: 200 { ok: true }   (idempotent per job_id; latest vote wins)
 *
 * BACKEND NOTE: this endpoint does not exist yet (confirmed absent from
 * `wardrobe-backend/routers/**` and `API_DOCUMENTATION.md` at authoring
 * time) — a backend follow-up is required to document + implement it. The
 * mobile client ships against the contract now, fire-and-forget: `submitVote`
 * NEVER throws or rejects, so a 404/500 while the endpoint is unbuilt can
 * never block or error the result screen. Callers should treat the vote as
 * optimistic UI, not a confirmed server write.
 */
import { apiClient } from './apiClient';

export type TryOnFeedbackVote = 'up' | 'down';

export interface TryOnFeedbackRequest {
  job_id: string;
  result_url: string;
  vote: TryOnFeedbackVote;
}

export const tryOnFeedbackService = {
  /**
   * Fire-and-forget vote submit. Resolves `true` on a 2xx, `false` on any
   * failure (network, 404 while the endpoint is unbuilt, 5xx, …) — never
   * rejects, so callers can safely ignore the result.
   */
  submitVote: async (payload: TryOnFeedbackRequest): Promise<boolean> => {
    try {
      await apiClient.post('/tryon/feedback', payload);
      return true;
    } catch (error) {
      console.warn(
        'tryOnFeedbackService.submitVote failed (non-blocking, endpoint may be unbuilt)',
        error,
      );
      return false;
    }
  },
};
