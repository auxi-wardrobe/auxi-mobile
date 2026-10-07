// "Find the best match from Discovery" result: one page per Discovery look
// containing the anchor's exact piece; unowned pieces carry a Discovery badge; the cover,
// title and Save follow the look on screen.

import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BuildAroundMatchResultScreen } from '../BuildAroundMatchResultScreen';
import { favouriteService } from '../../../services/favouriteService';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('../../../services/favouriteService', () => ({
  favouriteService: { saveFavourite: jest.fn(), removeFavourite: jest.fn() },
}));
jest.mock('../../../context/FavouritesSeenContext', () => ({
  useFavouritesSeen: () => ({ markSaved: jest.fn() }),
}));
jest.mock('@react-native-community/blur', () => ({ BlurView: () => null }));

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
const look = (
  id: string,
  title: string,
  slots: Array<[string, 'wardrobe' | 'discovery']>,
  anchor_match: 'exact' | 'similar' = 'exact',
) => ({
  inspiration: { id, title, composite_image_url: `https://x/${id}-cover.png` },
  anchor_match,
  outfit_hash: `ba_${id}`,
  is_complete: slots.every(([, source]) => source === 'wardrobe'),
  slots: slots.map(([itemId, source], i) => ({
    inspiration_item_id: `${id}-i${i}`,
    role: '',
    source,
    item: { ...item(itemId), is_common_item: source === 'discovery' },
  })),
});
let mockParams: { itemId: string; result: Record<string, unknown> };
const setLooks = (...outfits: ReturnType<typeof look>[]) => {
  mockParams = {
    itemId: 'A',
    result: { state: 'success', algorithm_version: 'ba-2', outfits },
  };
};

const byTestID = (root: ReactTestInstance, id: string) =>
  root.findAll(n => n.props?.testID === id);

const render = async () => {
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(
      <QueryClientProvider client={new QueryClient()}>
        <BuildAroundMatchResultScreen />
      </QueryClientProvider>,
    );
  });
  return r;
};

beforeEach(() => {
  setLooks(
    look('o1', 'Quiet luxury', [['A', 'wardrobe'], ['B', 'wardrobe'], ['D1', 'discovery']]),
    look('o2', 'Weekend', [['A', 'wardrobe'], ['D2', 'discovery']], 'similar'),
  );
  mockGoBack.mockReset();
  (favouriteService.saveFavourite as jest.Mock).mockReset();
});

describe('BuildAroundMatchResultScreen', () => {
  it('shows the first look: title, owned pieces, anchor flagged, Discovery pieces badged', async () => {
    const { root } = await render();
    expect(byTestID(root, 'build-around-result-title')[0].props.children).toBe('Quiet luxury');
    expect(byTestID(root, 'build-around-result-item-A-anchor').length).toBeGreaterThan(0);
    expect(byTestID(root, 'build-around-result-item-B').length).toBeGreaterThan(0);
    expect(byTestID(root, 'build-around-result-item-D1-discovery').length).toBeGreaterThan(0);
    expect(byTestID(root, 'build-around-result-item-D1-badge').length).toBeGreaterThan(0);
    // Owned pieces carry no badge.
    expect(byTestID(root, 'build-around-result-item-B-badge')).toHaveLength(0);
    // Exact match → no "Close match" label.
    expect(byTestID(root, 'build-around-result-similar')).toHaveLength(0);
  });

  it('renders one page per look with dots; swiping switches the cover, title and Save', async () => {
    (favouriteService.saveFavourite as jest.Mock).mockResolvedValue({ id: 'fav-2' });
    const cover = (root: ReactTestInstance) =>
      byTestID(root, 'discovery-detail-cover-image')[0].props.source.uri;
    const { root } = await render();
    expect(byTestID(root, 'build-around-result-items-1').length).toBeGreaterThan(0);
    expect(byTestID(root, 'build-around-result-dots').length).toBeGreaterThan(0);
    expect(cover(root)).toBe('https://x/o1-cover.png');
    const pager = byTestID(root, 'build-around-result-pager')[0];
    // Halfway is not enough to switch the look.
    act(() => pager.props.onLayout({ nativeEvent: { layout: { width: 300 } } }));
    act(() => pager.props.onScroll({ nativeEvent: { contentOffset: { x: 140 } } }));
    expect(cover(root)).toBe('https://x/o1-cover.png');
    act(() => pager.props.onLayout({ nativeEvent: { layout: { width: 300 } } }));
    act(() => pager.props.onScroll({ nativeEvent: { contentOffset: { x: 300 } } }));
    expect(byTestID(root, 'build-around-result-title')[0].props.children).toBe('Weekend');
    // Each look has its own Discovery photo.
    expect(cover(root)).toBe('https://x/o2-cover.png');
    // The anchor is the user's own piece on every look.
    expect(byTestID(root, 'build-around-result-item-A-anchor').length).toBeGreaterThan(1);
    // Near-color look → "Close match" label.
    expect(byTestID(root, 'build-around-result-similar').length).toBeGreaterThan(0);
    // Save favourites the look on screen, not the first one.
    await act(async () => {
      byTestID(root, 'build-around-result-save')[0].props.onPress();
    });
    expect(favouriteService.saveFavourite).toHaveBeenCalledWith(
      expect.objectContaining({ outfit_hash: 'ba_o2', title: 'Weekend' }),
    );
  });

  it('hides the dots for a single look', async () => {
    setLooks(look('o1', 'Quiet luxury', [['A', 'wardrobe']]));
    const { root } = await render();
    expect(byTestID(root, 'build-around-result-dots')).toHaveLength(0);
  });

  it('Close goes back', async () => {
    const { root } = await render();
    act(() => byTestID(root, 'build-around-result-close')[0].props.onPress());
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('Save favourites the look on screen (Discovery pieces included)', async () => {
    (favouriteService.saveFavourite as jest.Mock).mockResolvedValue({ id: 'fav-1' });
    const { root } = await render();
    await act(async () => {
      byTestID(root, 'build-around-result-save')[0].props.onPress();
    });
    expect(favouriteService.saveFavourite).toHaveBeenCalledWith(
      expect.objectContaining({
        outfit_hash: 'ba_o1',
        item_ids: ['A', 'B', 'D1'],
        source: 'build_around_discovery',
        title: 'Quiet luxury',
      }),
    );
    expect(byTestID(root, 'build-around-result-save-saved').length).toBeGreaterThan(0);
  });
});
