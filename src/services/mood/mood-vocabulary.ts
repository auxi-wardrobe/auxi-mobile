/**
 * Mood vocabulary bridge — the single place that reconciles the app's TWO mood
 * vocabularies so the "wear the feeling you want" strategy can close the loop.
 *
 *   1. Engine moods (`intent.mood` on POST /recommendation/build) — the 5-term
 *      vocab the Valen recommender biases scoring with (`v05Api.ts` MOODS):
 *      calm · confident · playful · low_energy · grounded.
 *   2. Feedback moods (`mood-chips.ts`, mirrors backend `mood_vocab.py`) — the
 *      15-term vocab the MoodFeedbackSheet captures from the user and stores on
 *      `favorites.mood_tags`.
 *
 * These vocabularies were authored independently and barely overlap (only
 * `confident`). Without a mapping the user's own mood feedback can never feed
 * back into suggestions. This module is that mapping — see
 * `docs/strategy-mood-aware-recommendations.md` for the full closed-loop design
 * and the backend contract the engine side still needs.
 *
 * The mapping is a v1 heuristic (one engine mood per feedback chip) and is meant
 * to be tuned against real `mood_feedback_submitted` data; keeping it here (not
 * scattered across screens) makes that a one-file change.
 */
import { Mood, MOODS } from '../v05Api';
import { RecommendationMode } from '../recommendationService';
import { MoodChipId, MOOD_CHIPS } from '../../components/features/mood-chips';

/**
 * Home mode pill → engine mood. Previously inlined in HomeScreen; centralised
 * so the pill, the request, and any future affinity logic agree on one vocab.
 */
export const MODE_TO_INTENT_MOOD: Record<RecommendationMode, Mood> = {
  safe: 'calm',
  power: 'confident',
  creative: 'playful',
};

export const moodForMode = (mode: RecommendationMode): Mood =>
  MODE_TO_INTENT_MOOD[mode];

/**
 * Feedback chip → engine mood. `not_quite_me` is the soft-negative and maps to
 * `null` (it expresses rejection, not a feeling to steer toward). The buckets:
 *   - calm       : relaxed, comfortable, effortless
 *   - confident  : confident, sharp, elevated, polished, attractive
 *   - playful    : expressive
 *   - low_energy : lightweight, easy
 *   - grounded   : feels_like_me, professional, prepared, functional
 */
export const FEEDBACK_MOOD_TO_INTENT: Record<MoodChipId, Mood | null> = {
  feels_like_me: 'grounded',
  confident: 'confident',
  relaxed: 'calm',
  polished: 'confident',
  comfortable: 'calm',
  sharp: 'confident',
  effortless: 'calm',
  elevated: 'confident',
  professional: 'grounded',
  prepared: 'grounded',
  easy: 'low_energy',
  attractive: 'confident',
  expressive: 'playful',
  functional: 'grounded',
  lightweight: 'low_energy',
  not_quite_me: null,
};

/**
 * Map a set of feedback chip ids to engine moods: drops the soft-negative and
 * any unknown ids, de-dupes, and preserves first-seen order. The output is the
 * engine-vocab signal the recommender can consume (once the backend reads it).
 */
export const feedbackMoodsToIntentMoods = (ids: string[]): Mood[] => {
  const out: Mood[] = [];
  for (const id of ids) {
    const mapped = FEEDBACK_MOOD_TO_INTENT[id as MoodChipId];
    if (mapped && !out.includes(mapped)) {
      out.push(mapped);
    }
  }
  return out;
};

// Dev-time guard (same pattern as mood-chips.ts): fail fast if the feedback
// vocab drifts away from the mapping, or a mapped value isn't a real engine
// mood — either would silently drop signal in production.
if (__DEV__) {
  const validMood = new Set<string>(MOODS);
  for (const chip of MOOD_CHIPS) {
    if (!(chip.id in FEEDBACK_MOOD_TO_INTENT)) {
      throw new Error(
        `mood-vocabulary: feedback chip "${chip.id}" has no engine-mood mapping`,
      );
    }
    const mapped = FEEDBACK_MOOD_TO_INTENT[chip.id];
    if (mapped !== null && !validMood.has(mapped)) {
      throw new Error(
        `mood-vocabulary: chip "${chip.id}" maps to unknown engine mood "${mapped}"`,
      );
    }
  }
}
