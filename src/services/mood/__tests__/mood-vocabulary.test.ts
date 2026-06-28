import {
  FEEDBACK_MOOD_TO_INTENT,
  MODE_TO_INTENT_MOOD,
  feedbackMoodsToIntentMoods,
  moodForMode,
} from '../mood-vocabulary';
import { MOODS } from '../../v05Api';
import { MOOD_CHIPS } from '../../../components/features/mood-chips';

describe('mood-vocabulary bridge (AU-388)', () => {
  describe('moodForMode', () => {
    it('maps each Home mode pill to its engine mood', () => {
      expect(moodForMode('safe')).toBe('calm');
      expect(moodForMode('power')).toBe('confident');
      expect(moodForMode('creative')).toBe('playful');
    });

    it('only ever yields valid engine moods', () => {
      const valid = new Set<string>(MOODS);
      for (const mood of Object.values(MODE_TO_INTENT_MOOD)) {
        expect(valid.has(mood)).toBe(true);
      }
    });
  });

  describe('feedbackMoodsToIntentMoods', () => {
    it('maps known feedback chips to engine moods', () => {
      expect(feedbackMoodsToIntentMoods(['confident'])).toEqual(['confident']);
      expect(feedbackMoodsToIntentMoods(['expressive'])).toEqual(['playful']);
    });

    it('de-dupes chips that map to the same engine mood', () => {
      // relaxed, comfortable, effortless all → calm
      expect(
        feedbackMoodsToIntentMoods(['relaxed', 'comfortable', 'effortless']),
      ).toEqual(['calm']);
    });

    it('preserves first-seen order across distinct moods', () => {
      expect(feedbackMoodsToIntentMoods(['expressive', 'relaxed'])).toEqual([
        'playful',
        'calm',
      ]);
    });

    it('drops the soft-negative (not_quite_me)', () => {
      expect(feedbackMoodsToIntentMoods(['not_quite_me'])).toEqual([]);
    });

    it('keeps the positive signal in a mixed selection', () => {
      // [confident, not_quite_me] → [confident] (the very case AU-388 validates)
      expect(
        feedbackMoodsToIntentMoods(['confident', 'not_quite_me']),
      ).toEqual(['confident']);
    });

    it('drops unknown ids', () => {
      expect(feedbackMoodsToIntentMoods(['totally_made_up'])).toEqual([]);
      expect(feedbackMoodsToIntentMoods(['confident', 'nope'])).toEqual([
        'confident',
      ]);
    });

    it('returns an empty array for empty input', () => {
      expect(feedbackMoodsToIntentMoods([])).toEqual([]);
    });
  });

  describe('mapping coverage / validity', () => {
    it('maps every feedback chip in the vocab', () => {
      for (const chip of MOOD_CHIPS) {
        expect(chip.id in FEEDBACK_MOOD_TO_INTENT).toBe(true);
      }
    });

    it('every non-null mapping targets a real engine mood', () => {
      const valid = new Set<string>(MOODS);
      for (const mood of Object.values(FEEDBACK_MOOD_TO_INTENT)) {
        if (mood !== null) {
          expect(valid.has(mood)).toBe(true);
        }
      }
    });
  });
});
