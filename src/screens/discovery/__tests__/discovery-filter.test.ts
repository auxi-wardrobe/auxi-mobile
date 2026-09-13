// discovery-filter — the multi-select contract the Discovery feed runs on.
//
// The interesting part is not the toggling (that mirrors wardrobe-filter) but
// the SPLIT between what the backend can express and what the client has to
// narrow itself: `GET /discovery/outfits` takes one season and one trend tag,
// so a second selection on an axis moves that axis off the wire.

import type { DiscoveryOutfitCard } from '../../../services/discoveryService';
import {
  analyticsValue,
  isAllSeasons,
  isAllTrendTags,
  narrowOutfits,
  needsClientNarrowing,
  summaryLabel,
  toServerFilters,
  toggleSeason,
  toggleTrendTag,
} from '../discovery-filter';

const outfit = (
  id: string,
  season: DiscoveryOutfitCard['season'],
  trend_tags: string[],
): DiscoveryOutfitCard =>
  ({ id, season, trend_tags } as DiscoveryOutfitCard);

const SUMMER_QUIET = outfit('a', 'summer', ['quiet luxury']);
const WINTER_WORK = outfit('b', 'winter', ['workwear']);
const SPRING_BOTH = outfit('c', 'spring', ['quiet luxury', 'workwear']);
const SEASONLESS = outfit('d', null, ['workwear']);
const UNTAGGED = outfit('e', 'summer', []);

const ALL = [SUMMER_QUIET, WINTER_WORK, SPRING_BOTH, SEASONLESS, UNTAGGED];

describe('the empty selection is "All"', () => {
  it('reads an empty season selection as All season', () => {
    expect(isAllSeasons([])).toBe(true);
    expect(isAllSeasons(['summer'])).toBe(false);
  });

  it('reads an empty tag selection as every tag', () => {
    expect(isAllTrendTags([])).toBe(true);
    expect(isAllTrendTags(['workwear'])).toBe(false);
  });
});

describe('toggleSeason', () => {
  it('adds a season that is not selected', () => {
    expect(toggleSeason([], 'summer')).toEqual(['summer']);
  });

  it('removes a season that is already selected', () => {
    expect(toggleSeason(['summer', 'winter'], 'summer')).toEqual(['winter']);
  });

  it('accumulates more than one season', () => {
    expect(toggleSeason(['summer'], 'winter')).toEqual(['summer', 'winter']);
  });

  it('keeps canonical spring→winter order regardless of tap order', () => {
    const out = toggleSeason(toggleSeason(['winter'], 'summer'), 'spring');
    expect(out).toEqual(['spring', 'summer', 'winter']);
  });
});

describe('toggleTrendTag', () => {
  const AVAILABLE = ['quiet luxury', 'workwear', 'y2k'];

  it('accumulates more than one tag', () => {
    expect(toggleTrendTag(['workwear'], 'y2k', AVAILABLE)).toEqual([
      'workwear',
      'y2k',
    ]);
  });

  it('removes a tag that is already selected', () => {
    expect(toggleTrendTag(['workwear', 'y2k'], 'workwear', AVAILABLE)).toEqual([
      'y2k',
    ]);
  });

  it('orders by the server tag list, not by tap order', () => {
    const out = toggleTrendTag(['y2k'], 'quiet luxury', AVAILABLE);
    expect(out).toEqual(['quiet luxury', 'y2k']);
  });

  it('keeps a selected tag the server no longer offers, at the end', () => {
    expect(toggleTrendTag(['retired tag'], 'y2k', AVAILABLE)).toEqual([
      'y2k',
      'retired tag',
    ]);
  });
});

describe('toServerFilters — only a single value fits on the wire', () => {
  it('sends nothing for an empty selection', () => {
    expect(toServerFilters([], [])).toEqual({
      season: undefined,
      trendTag: undefined,
    });
  });

  it('sends a single selection on each axis', () => {
    expect(toServerFilters(['summer'], ['workwear'])).toEqual({
      season: 'summer',
      trendTag: 'workwear',
    });
  });

  it('drops an axis the endpoint cannot express, keeping the other one', () => {
    expect(toServerFilters(['summer', 'winter'], ['workwear'])).toEqual({
      season: undefined,
      trendTag: 'workwear',
    });
  });
});

describe('needsClientNarrowing', () => {
  it('is false while every axis has at most one value', () => {
    expect(needsClientNarrowing([], [])).toBe(false);
    expect(needsClientNarrowing(['summer'], ['workwear'])).toBe(false);
  });

  it('is true as soon as either axis has two', () => {
    expect(needsClientNarrowing(['summer', 'winter'], [])).toBe(true);
    expect(needsClientNarrowing([], ['workwear', 'y2k'])).toBe(true);
  });
});

describe('narrowOutfits', () => {
  it('passes the list through untouched when the backend applied the filter', () => {
    expect(narrowOutfits(ALL, [], [])).toBe(ALL);
    // A single-value axis is the SERVER's call — re-deriving it here would
    // change what a one-season filter returns.
    expect(narrowOutfits(ALL, ['winter'], [])).toBe(ALL);
  });

  it('ORs the selections within the season axis', () => {
    expect(narrowOutfits(ALL, ['summer', 'winter'], [])).toEqual([
      SUMMER_QUIET,
      WINTER_WORK,
      UNTAGGED,
    ]);
  });

  it('drops a season-less outfit from a multi-season filter', () => {
    expect(narrowOutfits(ALL, ['spring', 'summer'], [])).not.toContain(
      SEASONLESS,
    );
  });

  it('ORs the selections within the tag axis', () => {
    expect(narrowOutfits(ALL, [], ['quiet luxury', 'y2k'])).toEqual([
      SUMMER_QUIET,
      SPRING_BOTH,
    ]);
  });

  it('ANDs across axes', () => {
    const out = narrowOutfits(ALL, ['summer', 'spring'], [
      'workwear',
      'y2k',
    ]);
    expect(out).toEqual([SPRING_BOTH]);
  });

  it('narrows only the multi-value axis, leaving the server-applied one alone', () => {
    // One tag ⇒ the backend already filtered to it, so every row here is
    // assumed to match; only the two seasons are applied locally.
    const served = [SUMMER_QUIET, WINTER_WORK, SPRING_BOTH];
    expect(narrowOutfits(served, ['summer', 'winter'], ['quiet luxury'])).toEqual(
      [SUMMER_QUIET, WINTER_WORK],
    );
  });
});

describe('summaryLabel — what the pill reads', () => {
  const label = (s: string) => s.toUpperCase();

  it('falls back to the All copy for an empty selection', () => {
    expect(summaryLabel([], label, 'All season')).toBe('All season');
  });

  it('joins a multi-selection', () => {
    expect(summaryLabel(['summer', 'winter'], label, 'All season')).toBe(
      'SUMMER, WINTER',
    );
  });
});

describe('analyticsValue', () => {
  it('reports an empty selection as "all"', () => {
    expect(analyticsValue([])).toBe('all');
  });

  it('joins a multi-selection into one stable dimension', () => {
    expect(analyticsValue(['spring', 'fall'])).toBe('spring,fall');
  });
});
