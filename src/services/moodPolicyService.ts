import { apiClient } from './apiClient';

/**
 * AU-318 mood feedback prompt policy (Phase 2 backend contract).
 *
 * `GET /api/v05/mood-feedback/policy` decides whether tapping "Wear this"
 * should open the mood sheet (`should_prompt`) and which prompting cadence
 * tier the user is currently in.
 *
 * Callers MUST treat ANY fetch error (network, 5xx, malformed body) as
 * `DEFAULT_MOOD_PROMPT_POLICY` — a silent fallback. Ticket: new users are
 * prompted on every save, and the save path itself must never break or show
 * an error because of a policy outage. See `useMoodFeedback` for the
 * once-per-session cache + post-submit refetch.
 */
export type MoodPromptTier =
  | 'every_save'
  | 'frequent'
  | 'occasional'
  | 'contextual';

export interface MoodPromptPolicy {
  should_prompt: boolean;
  tier: MoodPromptTier;
}

export const DEFAULT_MOOD_PROMPT_POLICY: MoodPromptPolicy = {
  should_prompt: true,
  tier: 'every_save',
};

export const moodPolicyService = {
  getMoodPromptPolicy: async (): Promise<MoodPromptPolicy> => {
    const response = await apiClient.get<MoodPromptPolicy>(
      '/v05/mood-feedback/policy',
    );
    return response.data;
  },
};
