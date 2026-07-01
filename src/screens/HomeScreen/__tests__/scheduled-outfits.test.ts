import {
  SCHEDULED_HASH_PREFIX,
  buildScheduledOutfitSheets,
  isScheduledHash,
  withScheduledPrefix,
} from '../scheduled-outfits';
import { OutfitSheet } from '../types';
import { ScheduledOutfit } from '../../../context/ScheduleContext';
import { Favourite } from '../../../services/favouriteService';
import { Creation } from '../../../services/creationsService';

const favourite = (over: Partial<Favourite> & Pick<Favourite, 'id'>): Favourite => ({
  user_id: 'u1',
  outfit_items: [],
  outfit_context: null,
  outfit_thumbnail_url: null,
  created_at: '',
  updated_at: '',
  ...over,
});

const favouriteEntry = (fav: Favourite): ScheduledOutfit => ({
  kind: 'favourite',
  favourite: fav,
});

const rec = (hash: string): OutfitSheet => ({ items: [], outfitHash: hash });

describe('buildScheduledOutfitSheets', () => {
  it('returns [] for missing / empty input', () => {
    expect(buildScheduledOutfitSheets(undefined)).toEqual([]);
    expect(buildScheduledOutfitSheets([])).toEqual([]);
  });

  it('maps favourites to namespaced, scheduled-flagged sheets', () => {
    const fav = favourite({
      id: 'fav-1',
      title: 'Bring some warmth.',
      outfit_items: [
        {
          id: 'item-1',
          image_url: 'http://x/1.jpg',
          image_png: null,
          name: 'Blazer',
          category: 'Top',
          is_common_item: false,
        },
      ],
    });

    const [sheet] = buildScheduledOutfitSheets([favouriteEntry(fav)]);

    expect(sheet.outfitHash).toBe(`${SCHEDULED_HASH_PREFIX}fav-1`);
    expect(sheet.scheduled).toBe(true);
    expect(sheet.caption).toBe('Bring some warmth.');
    expect(sheet.items).toHaveLength(1);
    expect(sheet.items[0]).toMatchObject({ id: 'item-1', category: 'Top' });
  });

  it('falls back to the context reasoning when there is no title', () => {
    const fav = favourite({
      id: 'fav-2',
      outfit_context: { reasoning_human: 'Cosy but sharp.' },
    });

    const [sheet] = buildScheduledOutfitSheets([favouriteEntry(fav)]);

    expect(sheet.caption).toBe('Cosy but sharp.');
  });

  it('skips creation entries (no flat item grid to render)', () => {
    const creationEntry: ScheduledOutfit = {
      kind: 'creation',
      creation: { id: 'creation-1' } as Creation,
    };
    const fav = favourite({ id: 'fav-3' });

    const sheets = buildScheduledOutfitSheets([
      creationEntry,
      favouriteEntry(fav),
    ]);

    expect(sheets).toHaveLength(1);
    expect(sheets[0].outfitHash).toBe(`${SCHEDULED_HASH_PREFIX}fav-3`);
  });
});

describe('isScheduledHash', () => {
  it('recognises namespaced scheduled hashes only', () => {
    expect(isScheduledHash(`${SCHEDULED_HASH_PREFIX}abc`)).toBe(true);
    expect(isScheduledHash('outfit-3')).toBe(false);
  });
});

describe('withScheduledPrefix', () => {
  const scheduledA = buildScheduledOutfitSheets([
    favouriteEntry(favourite({ id: 'a' })),
  ]);
  const scheduledB = buildScheduledOutfitSheets([
    favouriteEntry(favourite({ id: 'b' })),
  ]);

  it('prepends scheduled sheets ahead of recommendations', () => {
    const result = withScheduledPrefix([rec('outfit-0'), rec('outfit-1')], scheduledA);
    expect(result.map(o => o.outfitHash)).toEqual([
      `${SCHEDULED_HASH_PREFIX}a`,
      'outfit-0',
      'outfit-1',
    ]);
  });

  it('replaces any stale scheduled prefix without duplicating', () => {
    const existing = [...scheduledA, rec('outfit-0')];
    // Plan changed from A to B — A must drop, B must lead, recs preserved.
    const result = withScheduledPrefix(existing, scheduledB);
    expect(result.map(o => o.outfitHash)).toEqual([
      `${SCHEDULED_HASH_PREFIX}b`,
      'outfit-0',
    ]);
  });

  it('strips scheduled sheets entirely when the day has no plan', () => {
    const existing = [...scheduledA, rec('outfit-0')];
    const result = withScheduledPrefix(existing, []);
    expect(result.map(o => o.outfitHash)).toEqual(['outfit-0']);
  });
});
