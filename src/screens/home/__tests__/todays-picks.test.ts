/* eslint-env jest */
/**
 * Source resolution for the landing page's "Today's picks".
 *
 * The rules this locks:
 *  - precedence: an explicit plan (scheduled) beats the live deck, which beats
 *    this page's own cold-start build, which beats the persisted blob;
 *  - a persisted blob from a PREVIOUS day is not "today's picks" — it is
 *    treated as absent, which is what lets the cold start run;
 *  - a blob of UNKNOWN age (written before `savedAt` existed) is shown, not
 *    discarded — an upgrade artefact must not cost a metered build;
 *  - the page spends at most one build, and only when every cheaper source is
 *    exhausted and nothing has already failed.
 */
import type { OutfitSheet } from '../../HomeScreen/types';
import {
  isPersistedStale,
  pickTodaysSheets,
  shouldColdStart,
  TODAYS_PICKS_LIMIT,
  type TodaysPicksInput,
} from '../todays-picks';

const sheet = (hash: string): OutfitSheet => ({
  items: [],
  outfitHash: hash,
  caption: null,
});

const NOW = new Date('2026-09-12T09:00:00');
const TODAY = new Date('2026-09-12T07:30:00').getTime();
const YESTERDAY = new Date('2026-09-11T23:59:00').getTime();

const input = (over: Partial<TodaysPicksInput> = {}): TodaysPicksInput => ({
  scheduled: [],
  deck: [],
  fresh: [],
  persisted: [],
  persistedAt: null,
  fetching: false,
  failure: null,
  ...over,
});

const hashes = (sheets: OutfitSheet[]) => sheets.map(s => s.outfitHash);

describe('pickTodaysSheets precedence', () => {
  it("prefers today's scheduled outfits over every generated source", () => {
    const result = pickTodaysSheets(
      input({
        scheduled: [sheet('scheduled-1')],
        deck: [sheet('deck-1')],
        fresh: [sheet('fresh-1')],
        persisted: [sheet('persisted-1')],
      }),
    );
    expect(result.source).toBe('scheduled');
    expect(hashes(result.sheets)).toEqual(['scheduled-1']);
    expect(result.loading).toBe(false);
  });

  it("prefers the recommender's live deck over this page's own build", () => {
    const result = pickTodaysSheets(
      input({ deck: [sheet('deck-1')], fresh: [sheet('fresh-1')] }),
    );
    expect(result.source).toBe('deck');
    expect(hashes(result.sheets)).toEqual(['deck-1']);
  });

  it('falls back to the cold-start build before the persisted blob', () => {
    const result = pickTodaysSheets(
      input({ fresh: [sheet('fresh-1')], persisted: [sheet('p-1')] }),
    );
    expect(result.source).toBe('fresh');
  });

  it('falls back to the persisted blob, freshest first', () => {
    // `persistLatestOutfits` stores oldest-first, so the tail is the newest.
    const result = pickTodaysSheets(
      input({ persisted: [sheet('old'), sheet('new')], persistedAt: TODAY }),
    );
    expect(result.source).toBe('persisted');
    expect(hashes(result.sheets)).toEqual(['new', 'old']);
  });

  it('caps every source at the carousel limit', () => {
    const many = Array.from({ length: TODAYS_PICKS_LIMIT + 3 }, (_, i) =>
      sheet(`s-${i}`),
    );
    expect(pickTodaysSheets(input({ scheduled: many })).sheets).toHaveLength(
      TODAYS_PICKS_LIMIT,
    );
    expect(pickTodaysSheets(input({ deck: many })).sheets).toHaveLength(
      TODAYS_PICKS_LIMIT,
    );
    expect(pickTodaysSheets(input({ fresh: many })).sheets).toHaveLength(
      TODAYS_PICKS_LIMIT,
    );
  });
});

describe('pickTodaysSheets loading + failure', () => {
  it('reports loading while the persisted read is unsettled', () => {
    const result = pickTodaysSheets(input({ persisted: null }));
    expect(result).toEqual({
      sheets: [],
      source: 'none',
      loading: true,
      failure: null,
    });
  });

  it('reports loading while the cold-start build is in flight', () => {
    const result = pickTodaysSheets(input({ fetching: true }));
    expect(result.loading).toBe(true);
    expect(result.failure).toBeNull();
  });

  it('surfaces the failure once every source is exhausted', () => {
    const result = pickTodaysSheets(input({ failure: 'wardrobeGap' }));
    expect(result).toEqual({
      sheets: [],
      source: 'none',
      loading: false,
      failure: 'wardrobeGap',
    });
  });

  it('never reports a failure while it still has outfits to show', () => {
    const result = pickTodaysSheets(
      input({ deck: [sheet('deck-1')], failure: 'aiLimit' }),
    );
    expect(result.failure).toBeNull();
    expect(hashes(result.sheets)).toEqual(['deck-1']);
  });
});

describe('isPersistedStale', () => {
  it("treats a blob written earlier today as fresh", () => {
    expect(isPersistedStale(TODAY, NOW)).toBe(false);
  });

  it('treats a blob from a previous day as stale', () => {
    expect(isPersistedStale(YESTERDAY, NOW)).toBe(true);
  });

  it('treats an undated blob as unknown-age, NOT stale', () => {
    // Written before `savedAt` existed — showing it beats spending a build.
    expect(isPersistedStale(null, NOW)).toBe(false);
  });

  it("does not show yesterday's outfits as today's picks", () => {
    const result = pickTodaysSheets(
      input({ persisted: [sheet('yesterday')], persistedAt: YESTERDAY }),
    );
    expect(result.sheets).toEqual([]);
    expect(result.source).toBe('none');
  });
});

describe('shouldColdStart', () => {
  it('builds only when every cheaper source is exhausted', () => {
    expect(shouldColdStart(input())).toBe(true);
  });

  it.each([
    ['scheduled outfits exist', { scheduled: [sheet('s')] }],
    ['the live deck has outfits', { deck: [sheet('d')] }],
    ['a build already landed', { fresh: [sheet('f')] }],
    ['a build is in flight', { fetching: true }],
    ['the persisted read is unsettled', { persisted: null }],
    [
      "today's persisted outfits exist",
      { persisted: [sheet('p')], persistedAt: TODAY },
    ],
  ])('does not build when %s', (_label, over) => {
    expect(shouldColdStart(input(over as Partial<TodaysPicksInput>))).toBe(
      false,
    );
  });

  it("does build when the persisted blob is yesterday's", () => {
    expect(
      shouldColdStart(
        input({ persisted: [sheet('p')], persistedAt: YESTERDAY }),
      ),
    ).toBe(true);
  });

  it.each(['aiLimit', 'wardrobeGap', 'failed'] as const)(
    'never retries after a %s failure',
    failure => {
      expect(shouldColdStart(input({ failure }))).toBe(false);
    },
  );
});
