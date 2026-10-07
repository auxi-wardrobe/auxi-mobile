import { apiClient } from '../apiClient';
import {
  buildAroundMatchService,
  isBuildAroundSuccess,
  outfitItemIds,
  normalizeBuildAroundState,
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
    expect(look.anchor_match).toBe('exact');
    expect(look.is_complete).toBe(false);
  });

  it('keeps only looks that contain the exact anchor piece', async () => {
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
          look('o1'),
          look('near', { anchor_match: 'similar' }), // near color — not the same piece
          look('odd', { anchor_match: 'brand_new' }), // unknown — can't confirm exact
          look('no-anchor', { slots: LOOK.slots.slice(1) }), // anchor missing
          look('not-owned', {
            slots: [{ ...LOOK.slots[0], source: 'discovery' }, ...LOOK.slots.slice(1)],
          }),
          look('o2'),
        ],
      },
    });
    const res = await buildAroundMatchService.run('A', null);
    expect(res.outfits.map(o => o.inspiration.id)).toEqual(['o1', 'o2']);
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

  it('is a no_match when no look contains the exact piece', async () => {
    postMock.mockResolvedValue({
      data: { ...BODY, outfits: [{ ...LOOK, anchor_match: 'similar' }] },
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
