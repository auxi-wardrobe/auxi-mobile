/**
 * Unit tests for moodFeedbackText — the bridge that turns selected mood chips
 * into the natural-language text POSTed to /v05/feedback, so mood feedback
 * feeds the engine's decay-weighted L4 ranking signals.
 *
 * Contract verified:
 * - Positive chips become a single "made me feel …" sentence (locale-stable
 *   English the backend LLM-2 can parse, never the i18n display labels).
 * - The soft-negative `not_quite_me` becomes an explicit dislike.
 * - Positives + negative coexist; an empty / all-unknown selection → null
 *   (nothing worth sending).
 */

import { moodFeedbackText } from '../mood-chips';

describe('moodFeedbackText', () => {
  it('renders a single positive chip', () => {
    expect(moodFeedbackText(['confident'])).toBe(
      'This outfit made me feel confident.',
    );
  });

  it('joins multiple positives with commas and a trailing "and"', () => {
    expect(moodFeedbackText(['polished', 'sharp', 'confident'])).toBe(
      'This outfit made me feel polished, sharp and confident.',
    );
  });

  it('maps the soft-negative to an explicit dislike', () => {
    expect(moodFeedbackText(['not_quite_me'])).toBe(
      "It didn't quite feel like me, though.",
    );
  });

  it('combines positives and the soft-negative', () => {
    expect(moodFeedbackText(['comfortable', 'not_quite_me'])).toBe(
      "This outfit made me feel comfortable. It didn't quite feel like me, though.",
    );
  });

  it('returns null for an empty selection', () => {
    expect(moodFeedbackText([])).toBeNull();
  });

  it('ignores unknown chip ids', () => {
    expect(moodFeedbackText(['totally_made_up'])).toBeNull();
  });
});
