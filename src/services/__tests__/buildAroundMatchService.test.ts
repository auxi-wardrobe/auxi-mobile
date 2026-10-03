import { apiClient } from '../apiClient';
import {
  buildAroundMatchService,
  matchedItemIds,
  matchedItems,
  normalizeBuildAroundState,
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
const OUTFIT = {
  outfit_hash: 'ba_1',
  is_complete: true,
  slots: [
    { inspiration_item_id: 'i1', role: 'top', item: item('A') },
    { inspiration_item_id: 'i2', role: 'bottom', item: item('B') },
    { inspiration_item_id: 'i3', role: 'shoes', item: null },
  ],
};
const BODY = {
  state: 'success',
  algorithm_version: 'ba-1',
  inspiration: { id: 'o1', title: 'Look', composite_image_url: null },
  outfit: OUTFIT,
};

beforeEach(() => postMock.mockReset());

describe('buildAroundMatchService', () => {
  it('posts the anchor item and omits style for "Surprise me"', async () => {
    postMock.mockResolvedValue({ data: BODY });
    await buildAroundMatchService.run('A', 'surprise_me');
    expect(postMock).toHaveBeenCalledWith(
      '/discovery/build-around',
      { item_id: 'A', style: undefined },
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
  });

  it('sends the chosen style', async () => {
    postMock.mockResolvedValue({ data: BODY });
    await buildAroundMatchService.run('A', 'monochrome');
    expect(postMock.mock.calls[0][1]).toEqual({ item_id: 'A', style: 'monochrome' });
  });

  it('keeps a real success and exposes only owned pieces, anchor included', async () => {
    postMock.mockResolvedValue({ data: BODY });
    const res = await buildAroundMatchService.run('A', 'casual');
    expect(res.state).toBe('success');
    expect(matchedItems(res.outfit).map(i => i.id)).toEqual(['A', 'B']);
    expect(matchedItemIds(res.outfit!)).toEqual(['A', 'B']);
  });

  it('downgrades an unknown state, or a success with nothing to show, to no_match', async () => {
    postMock.mockResolvedValueOnce({ data: { ...BODY, state: 'brand_new_state' } });
    expect((await buildAroundMatchService.run('A', 'casual')).state).toBe('no_match');
    postMock.mockResolvedValueOnce({ data: { ...BODY, outfit: null } });
    expect((await buildAroundMatchService.run('A', 'casual')).state).toBe('no_match');
  });

  it('normalizeBuildAroundState keeps known states', () => {
    expect(normalizeBuildAroundState('no_wardrobe')).toBe('no_wardrobe');
    expect(normalizeBuildAroundState(undefined)).toBe('no_match');
  });
});
