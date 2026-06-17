import { apiClient } from './apiClient';

/**
 * In-app feedback. Wraps `POST /api/feedback` (apiClient baseURL already ends
 * in `/api`, so the path here is `/feedback`). Bearer auth is auto-injected by
 * the apiClient request interceptor.
 *
 * Contract (see `wardrobe-backend/API_DOCUMENTATION.md`):
 *   - 201 → { id, created_at }
 *   - 401 auth, 422 validation, 429 rate limit (5/min)
 */

export type FeedbackCategory = 'bug' | 'idea' | 'general' | 'praise';

export interface FeedbackSubmitRequest {
  /** One of the four canonical categories. Required. */
  category: FeedbackCategory;
  /** Free-text body, 1–2000 chars, non-blank. Required. */
  message: string;
  /** Optional 1–5 star rating. Omit entirely when the user left it unset. */
  rating?: number;
  /** Optional app version string. Omitted until a real version source exists. */
  app_version?: string;
  /** Originating platform, auto-filled from `Platform.OS`. */
  platform?: 'ios' | 'android' | 'web';
}

export interface FeedbackSubmitResponse {
  id: string;
  created_at: string;
}

export const feedbackService = {
  submitFeedback: async (
    payload: FeedbackSubmitRequest,
  ): Promise<FeedbackSubmitResponse> => {
    try {
      const response = await apiClient.post('/feedback', payload);
      return response.data;
    } catch (error) {
      console.error('submitFeedback error', error);
      throw error;
    }
  },
};
