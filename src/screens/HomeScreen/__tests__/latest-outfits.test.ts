import { extractLatestOutfitSheets } from '../latest-outfits';
import type { WardrobeItem } from '../../../services/wardrobeService';
import type {
  RecommendationHistoryResponse,
  RecommendationHistoryRequest,
} from '../../../services/recommendationService';

const wItem = (over: Partial<WardrobeItem> & Pick<WardrobeItem, 'id'>): WardrobeItem => ({
  image_url: `https://img/${over.id}.png`,
  category: 'Top',
  ...over,
});

const req = (
  over: Partial<RecommendationHistoryRequest> &
    Pick<RecommendationHistoryRequest, 'outfit_hash' | 'created_at'>,
): RecommendationHistoryRequest => ({
  request_type: 'next',
  outfit_items: ['a', 'b'],
  styling_note: null,
  variation_axis: null,
  ...over,
});

const history = (
  requests: RecommendationHistoryRequest[],
): RecommendationHistoryResponse => ({
  sessions: [{ session_id: 's1', started_at: '', requests }],
  total_sessions: 1,
});

const wardrobe = (items: WardrobeItem[]): Map<string, WardrobeItem> =>
  new Map(items.map(i => [i.id, i]));

describe('extractLatestOutfitSheets', () => {
  const closet = wardrobe([
    wItem({ id: 'a' }),
    wItem({ id: 'b' }),
    wItem({ id: 'c' }),
  ]);

  it('returns [] for missing / empty history or non-positive count', () => {
    expect(extractLatestOutfitSheets(null, closet, 3)).toEqual([]);
    expect(extractLatestOutfitSheets(undefined, closet, 3)).toEqual([]);
    expect(extractLatestOutfitSheets(history([]), closet, 3)).toEqual([]);
    expect(
      extractLatestOutfitSheets(
        history([req({ outfit_hash: 'h1', created_at: '2026-07-20T10:00:00Z' })]),
        closet,
        0,
      ),
    ).toEqual([]);
  });

  it('orders by created_at desc and caps at count', () => {
    const result = extractLatestOutfitSheets(
      history([
        req({ outfit_hash: 'old', created_at: '2026-07-20T08:00:00Z' }),
        req({ outfit_hash: 'new', created_at: '2026-07-20T12:00:00Z' }),
        req({ outfit_hash: 'mid', created_at: '2026-07-20T10:00:00Z' }),
      ]),
      closet,
      2,
    );
    expect(result.map(o => o.outfitHash)).toEqual(['new', 'mid']);
  });

  it('collapses duplicate outfit hashes to the most recent occurrence', () => {
    const result = extractLatestOutfitSheets(
      history([
        req({ outfit_hash: 'dup', created_at: '2026-07-20T08:00:00Z' }),
        req({ outfit_hash: 'dup', created_at: '2026-07-20T12:00:00Z' }),
      ]),
      closet,
      3,
    );
    expect(result).toHaveLength(1);
    expect(result[0].outfitHash).toBe('dup');
  });

  it('hydrates item IDs into items with images and carries the styling note as caption', () => {
    const result = extractLatestOutfitSheets(
      history([
        req({
          outfit_hash: 'h1',
          created_at: '2026-07-20T10:00:00Z',
          outfit_items: ['a', 'c'],
          styling_note: 'Crisp and clean.',
        }),
      ]),
      closet,
      3,
    );
    expect(result[0].caption).toBe('Crisp and clean.');
    expect(result[0].items.map(i => i.id)).toEqual(['a', 'c']);
    expect(result[0].items[0].image_url).toBe('https://img/a.png');
  });

  it('drops unresolvable item IDs and skips outfits with fewer than two showable garments', () => {
    const result = extractLatestOutfitSheets(
      history([
        // Only one resolvable item ('a') → skipped.
        req({ outfit_hash: 'thin', created_at: '2026-07-20T11:00:00Z', outfit_items: ['a', 'missing'] }),
        // Two resolvable items → kept, with the missing one dropped.
        req({ outfit_hash: 'ok', created_at: '2026-07-20T10:00:00Z', outfit_items: ['a', 'b', 'missing'] }),
      ]),
      closet,
      3,
    );
    expect(result.map(o => o.outfitHash)).toEqual(['ok']);
    expect(result[0].items.map(i => i.id)).toEqual(['a', 'b']);
  });

  it('skips items that resolve but have no image', () => {
    const noImageCloset = wardrobe([
      wItem({ id: 'a' }),
      { id: 'b', category: 'Bottom' } as WardrobeItem, // no image fields
    ]);
    const result = extractLatestOutfitSheets(
      history([
        req({ outfit_hash: 'h1', created_at: '2026-07-20T10:00:00Z', outfit_items: ['a', 'b'] }),
      ]),
      noImageCloset,
      3,
    );
    // 'b' has no image → only 'a' hydrates → below the 2-item floor → skipped.
    expect(result).toEqual([]);
  });
});
