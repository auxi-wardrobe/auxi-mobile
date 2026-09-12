/* eslint-env jest */
/**
 * Source precedence for the landing page's "Today's picks".
 *
 * The rule this locks: an explicit plan (scheduled) beats the live deck, which
 * beats the persisted blob — and an unsettled persisted read reports `loading`
 * rather than flashing the empty state. The landing page NEVER calls the V05
 * engine, so these three reads are the only sources it has.
 */
import type { OutfitSheet } from '../../HomeScreen/types';
import { pickTodaysSheets, TODAYS_PICKS_LIMIT } from '../todays-picks';

const sheet = (hash: string): OutfitSheet => ({
  items: [],
  outfitHash: hash,
  caption: null,
});

describe('pickTodaysSheets', () => {
  it("prefers today's scheduled outfits over everything else", () => {
    const result = pickTodaysSheets(
      [sheet('scheduled-1')],
      [sheet('deck-1')],
      [sheet('persisted-1')],
    );
    expect(result.source).toBe('scheduled');
    expect(result.sheets.map(s => s.outfitHash)).toEqual(['scheduled-1']);
    expect(result.loading).toBe(false);
  });

  it('falls back to the live deck when nothing is scheduled', () => {
    const result = pickTodaysSheets([], [sheet('deck-1')], [sheet('p-1')]);
    expect(result.source).toBe('deck');
    expect(result.sheets.map(s => s.outfitHash)).toEqual(['deck-1']);
  });

  it('falls back to the persisted blob, freshest first', () => {
    // `persistLatestOutfits` stores oldest-first, so the tail is the newest.
    const result = pickTodaysSheets([], [], [sheet('old'), sheet('new')]);
    expect(result.source).toBe('persisted');
    expect(result.sheets.map(s => s.outfitHash)).toEqual(['new', 'old']);
  });

  it('reports loading while the persisted read is unsettled', () => {
    const result = pickTodaysSheets([], [], null);
    expect(result).toEqual({ sheets: [], source: 'none', loading: true });
  });

  it('reports an empty, settled state when every source is empty', () => {
    expect(pickTodaysSheets([], [], [])).toEqual({
      sheets: [],
      source: 'none',
      loading: false,
    });
  });

  it('caps every source at the carousel limit', () => {
    const many = Array.from({ length: TODAYS_PICKS_LIMIT + 3 }, (_, i) =>
      sheet(`s-${i}`),
    );
    expect(pickTodaysSheets(many, [], []).sheets).toHaveLength(
      TODAYS_PICKS_LIMIT,
    );
    expect(pickTodaysSheets([], many, []).sheets).toHaveLength(
      TODAYS_PICKS_LIMIT,
    );
    expect(pickTodaysSheets([], [], many).sheets).toHaveLength(
      TODAYS_PICKS_LIMIT,
    );
  });
});
