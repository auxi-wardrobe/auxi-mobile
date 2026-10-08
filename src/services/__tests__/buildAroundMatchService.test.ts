import { apiClient } from '../apiClient';
import {
  buildAroundMatchService,
  isBuildAroundSuccess,
  outfitItemIds,
  normalizeBuildAroundState,
  mergeBuildAroundResults,
  pickRandomTags,
  trendTagProps,
} from '../buildAroundMatchService';

jest.mock('../apiClient', () => ({ apiClient: { post: jest.fn() } }));
const postMock = apiClient.post as jest.Mock;

const item = (id: string) => ({
  id,
  name: id,
  image_url: `https://x/${id}.png`,
  image_png: null,
  image_studio: null,
  category: 'Top',
  category_code: 'TOP',
  layer_code: 'BASE',
  is_common_item: false,
});
const LOOK = {
  inspiration: { id: 'o1', title: 'Look', composite_image_url: null },
  anchor_match: 'exact',
  outfit_hash: 'ba_1',
  is_complete: false,
  slots: [
    { inspiration_item_id: 'i1', role: 'top', source: 'wardrobe', item: item('A') },
    { inspiration_item_id: 'i2', role: 'bottom', source: 'wardrobe', item: item('B') },
    { inspiration_item_id: 'i3', role: 'shoes', source: 'discovery', item: item('D') },
  ],
};
const BODY = {
  state: 'success',
  algorithm_version: 'ba-2',
  outfits: [LOOK],
  // Deprecated ba-1 fields — never read.
  inspiration: null,
  outfit: null,
};

beforeEach(() => postMock.mockReset());

describe('buildAroundMatchService', () => {
  it('posts the anchor item and omits trend_tag for "Surprise me"', async () => {
    postMock.mockResolvedValue({ data: BODY });
    await buildAroundMatchService.run('A', null);
    expect(postMock).toHaveBeenCalledWith(
      '/discovery/build-around',
      { item_id: 'A', trend_tag: undefined },
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
  });

  it('sends the chosen Discovery tag', async () => {
    postMock.mockResolvedValue({ data: BODY });
    await buildAroundMatchService.run('A', 'quiet-luxury');
    expect(postMock.mock.calls[0][1]).toEqual({ item_id: 'A', trend_tag: 'quiet-luxury' });
  });

  it('keeps a real success with every look and its sources', async () => {
    postMock.mockResolvedValue({ data: BODY });
    const res = await buildAroundMatchService.run('A', 'casual');
    expect(res.state).toBe('success');
    expect(isBuildAroundSuccess(res)).toBe(true);
    expect(res.outfits).toHaveLength(1);
    expect(res.outfits[0].slots.map(s => s.source)).toEqual(['wardrobe', 'wardrobe', 'discovery']);
    expect(outfitItemIds(res.outfits[0])).toEqual(['A', 'B', 'D']);
  });

  it('never claims ownership when unsure', async () => {
    const odd = {
      ...LOOK,
      anchor_match: 'brand_new',
      is_complete: true, // recomputed from the slots, not trusted
      slots: [
        { ...LOOK.slots[0] },
        { ...LOOK.slots[1], source: 'brand_new_source' },
        { ...LOOK.slots[2], item: null }, // dropped
      ],
    };
    postMock.mockResolvedValue({ data: { ...BODY, outfits: [odd] } });
    const [look] = (await buildAroundMatchService.run('A', null)).outfits;
    expect(look.slots.map(s => s.source)).toEqual(['wardrobe', 'discovery']);
    expect(look.anchor_match).toBe('similar');
    expect(look.is_complete).toBe(false);
  });

  it('keeps only looks that contain the anchor piece, exact matches first', async () => {
    const look = (id: string, extra: Record<string, unknown> = {}) => ({
      ...LOOK,
      inspiration: { ...LOOK.inspiration, id },
      outfit_hash: `ba_${id}`,
      ...extra,
    });
    postMock.mockResolvedValue({
      data: {
        ...BODY,
        outfits: [
          look('near', { anchor_match: 'similar' }), // near color — after exact ones
          look('o1'),
          look('no-anchor', { slots: LOOK.slots.slice(1) }), // anchor missing
          look('not-owned', {
            slots: [{ ...LOOK.slots[0], source: 'discovery' }, ...LOOK.slots.slice(1)],
          }),
          look('odd', { anchor_match: 'brand_new' }), // unknown → similar
          look('o2'),
        ],
      },
    });
    const res = await buildAroundMatchService.run('A', null);
    expect(res.outfits.map(o => [o.inspiration.id, o.anchor_match])).toEqual([
      ['o1', 'exact'],
      ['o2', 'exact'],
      ['near', 'similar'],
      ['odd', 'similar'],
    ]);
  });

  it('returns one result per Discovery look (3 looks ⇒ 3 results)', async () => {
    const rebuild = (id: string, hash: string) => ({
      ...LOOK,
      inspiration: { ...LOOK.inspiration, id },
      outfit_hash: hash,
    });
    postMock.mockResolvedValue({
      data: {
        ...BODY,
        outfits: [
          rebuild('o1', 'h1'),
          rebuild('o1', 'h1-alt'), // a second rebuild of the same look
          rebuild('o2', 'h2'),
          rebuild('o3', 'h3'),
          rebuild('o2', 'h2-alt'),
        ],
      },
    });
    const res = await buildAroundMatchService.run('A', null);
    expect(res.outfits.map(o => o.outfit_hash)).toEqual(['h1', 'h2', 'h3']);
  });

  it('is a no_match when no look contains the anchor piece', async () => {
    postMock.mockResolvedValue({
      data: { ...BODY, outfits: [{ ...LOOK, slots: LOOK.slots.slice(1) }] },
    });
    const res = await buildAroundMatchService.run('A', null);
    expect(res.state).toBe('no_match');
    expect(res.outfits).toEqual([]);
  });

  it('downgrades an unknown state, or a success with nothing to show, to no_match', async () => {
    postMock.mockResolvedValueOnce({ data: { ...BODY, state: 'brand_new_state' } });
    expect((await buildAroundMatchService.run('A', 'casual')).state).toBe('no_match');
    postMock.mockResolvedValueOnce({ data: { ...BODY, outfits: [] } });
    expect((await buildAroundMatchService.run('A', 'casual')).state).toBe('no_match');
    postMock.mockResolvedValueOnce({ data: { ...BODY, outfits: [{ ...LOOK, inspiration: null }] } });
    expect((await buildAroundMatchService.run('A', 'casual')).state).toBe('no_match');
  });

  it('passes a non-success state through with no looks', async () => {
    postMock.mockResolvedValue({ data: { state: 'no_match', algorithm_version: 'ba-2', outfits: [] } });
    const res = await buildAroundMatchService.run('A', null);
    expect(res).toEqual({ state: 'no_match', algorithm_version: 'ba-2', outfits: [] });
    expect(isBuildAroundSuccess(res)).toBe(false);
  });

  it('runMany with one item is exactly run', async () => {
    postMock.mockResolvedValue({ data: BODY });
    const many = await buildAroundMatchService.runMany(['A'], 'casual');
    const one = await buildAroundMatchService.run('A', 'casual');
    expect(postMock).toHaveBeenCalledTimes(2);
    expect(postMock.mock.calls[0][1]).toEqual(postMock.mock.calls[1][1]);
    expect(many).toEqual(one);
  });

  it('runMany sends the single-item request once per chosen item (deduped, capped at 3)', async () => {
    postMock.mockResolvedValue({ data: BODY });
    await buildAroundMatchService.runMany(['A', 'B', 'A', 'C', 'D'], 'minimal');
    expect(postMock.mock.calls.map(call => call[1])).toEqual([
      { item_id: 'A', trend_tag: 'minimal' },
      { item_id: 'B', trend_tag: 'minimal' },
      { item_id: 'C', trend_tag: 'minimal' },
    ]);
  });

  it('runMany rejects an empty anchor list without calling the API', async () => {
    await expect(buildAroundMatchService.runMany([], null)).rejects.toThrow();
    expect(postMock).not.toHaveBeenCalled();
  });

  describe('mergeBuildAroundResults', () => {
    const look = (
      id: string,
      slots: Array<[string, string, 'wardrobe' | 'discovery']>,
      anchor_match: 'exact' | 'similar' = 'exact',
    ) => ({
      inspiration: { id, title: id, composite_image_url: null },
      anchor_match,
      outfit_hash: `ba_${id}`,
      is_complete: slots.every(([, , source]) => source === 'wardrobe'),
      anchor_coverage: 1,
      slots: slots.map(([pieceId, itemId, source]) => ({
        inspiration_item_id: `${id}-${pieceId}`,
        role: '',
        source,
        item: item(itemId),
      })),
    });
    const ok = (...outfits: ReturnType<typeof look>[]) => ({
      state: 'success' as const,
      algorithm_version: 'ba-2',
      outfits,
    });
    const none = (state: 'no_match' | 'no_wardrobe' = 'no_match') => ({
      state,
      algorithm_version: 'ba-2',
      outfits: [],
    });

    it('is the identity for a single result', () => {
      const result = ok(look('o1', [['p1', 'A', 'wardrobe'], ['p2', 'D', 'discovery']]));
      expect(mergeBuildAroundResults([result], ['A'])).toEqual(result);
    });

    it('merges the same look from two items slot by slot, owned pieces winning, ranked first', () => {
      const fromA = ok(
        look('shared', [['p1', 'A', 'wardrobe'], ['p2', 'D-b', 'discovery'], ['p3', 'C', 'wardrobe']]),
        look('only-a', [['p1', 'A', 'wardrobe']]),
      );
      const fromB = ok(
        look('only-b', [['p2', 'B', 'wardrobe']]),
        look('shared', [['p1', 'D-a', 'discovery'], ['p2', 'B', 'wardrobe'], ['p3', 'C', 'wardrobe']]),
      );
      const merged = mergeBuildAroundResults([fromA, fromB], ['A', 'B']);
      expect(merged.state).toBe('success');
      expect(merged.outfits.map(o => o.inspiration.id)).toEqual(['shared', 'only-a', 'only-b']);
      const shared = merged.outfits[0];
      expect(shared.anchor_coverage).toBe(2);
      expect(shared.is_complete).toBe(true);
      expect(shared.slots.map(s => [s.inspiration_item_id, s.item.id, s.source])).toEqual([
        ['shared-p1', 'A', 'wardrobe'],
        ['shared-p2', 'B', 'wardrobe'],
        ['shared-p3', 'C', 'wardrobe'],
      ]);
      expect(merged.outfits[1].anchor_coverage).toBe(1);
    });

    it('a near-color version of a shared look makes the merged look a Close match, after exact ones', () => {
      const fromA = ok(
        look('x', [['p1', 'A', 'wardrobe'], ['p2', 'B', 'wardrobe']], 'similar'),
        look('y', [['p1', 'A', 'wardrobe'], ['p2', 'B', 'wardrobe']]),
      );
      const fromB = ok(
        look('x', [['p1', 'A', 'wardrobe'], ['p2', 'B', 'wardrobe']]),
        look('y', [['p1', 'A', 'wardrobe'], ['p2', 'B', 'wardrobe']]),
      );
      const merged = mergeBuildAroundResults([fromA, fromB], ['A', 'B']);
      expect(merged.outfits.map(o => [o.inspiration.id, o.anchor_match])).toEqual([
        ['y', 'exact'],
        ['x', 'similar'],
      ]);
    });

    it('never shows a wardrobe item twice in a merged look', () => {
      const fromA = ok(look('o', [['pa', 'A', 'wardrobe'], ['pb', 'B', 'wardrobe']]));
      const fromB = ok(look('o', [['pb', 'B', 'wardrobe'], ['pa2', 'A', 'wardrobe']]));
      const merged = mergeBuildAroundResults([fromA, fromB], ['A', 'B']);
      expect(merged.outfits[0].slots.map(s => s.item.id)).toEqual(['A', 'B']);
    });

    it('is no_wardrobe only when every item said so, else no_match; success wins', () => {
      expect(mergeBuildAroundResults([none('no_wardrobe'), none('no_wardrobe')], ['A', 'B']).state).toBe('no_wardrobe');
      expect(mergeBuildAroundResults([none('no_wardrobe'), none()], ['A', 'B']).state).toBe('no_match');
      expect(mergeBuildAroundResults([none(), none()], ['A', 'B']).state).toBe('no_match');
      const win = mergeBuildAroundResults([none(), ok(look('o', [['p', 'B', 'wardrobe']]))], ['A', 'B']);
      expect(win.state).toBe('success');
      expect(win.outfits).toHaveLength(1);
    });
  });

  it('pickRandomTags returns distinct tags, capped, without mutating the input', () => {
    const tags = ['a', 'b', 'c', 'd', 'e', 'f', 'a'];
    const copy = [...tags];
    const picked = pickRandomTags(tags, 5);
    expect(picked).toHaveLength(5);
    expect(new Set(picked).size).toBe(5);
    expect(picked.every(t => tags.includes(t))).toBe(true);
    expect(tags).toEqual(copy);
    expect(pickRandomTags([], 5)).toEqual([]);
    expect(pickRandomTags(['x', 'y'], 5).sort()).toEqual(['x', 'y']);
  });

  it('trendTagProps omits the key for Surprise me, never sends null', () => {
    expect(trendTagProps(null)).toEqual({});
    expect('trend_tag' in trendTagProps(null)).toBe(false);
    expect(trendTagProps('minimal')).toEqual({ trend_tag: 'minimal' });
  });

  it('normalizeBuildAroundState keeps known states', () => {
    expect(normalizeBuildAroundState('no_wardrobe')).toBe('no_wardrobe');
    expect(normalizeBuildAroundState(undefined)).toBe('no_match');
  });
});
