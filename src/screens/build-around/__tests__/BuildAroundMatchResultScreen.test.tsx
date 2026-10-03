// "Find the best match from Discovery" result: owned pieces (anchor + others)
// under the matched Discovery cover, Save favourites the OWNED outfit.

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
const mockParams = {
  itemId: 'A',
  result: {
    state: 'success',
    algorithm_version: 'ba-1',
    inspiration: { id: 'o1', title: 'Quiet luxury', composite_image_url: null },
    outfit: {
      outfit_hash: 'ba_1',
      is_complete: true,
      slots: [
        { inspiration_item_id: 'i1', role: 'top', item: item('A') },
        { inspiration_item_id: 'i2', role: 'bottom', item: item('B') },
        { inspiration_item_id: 'i3', role: 'shoes', item: null },
      ],
    },
  },
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
  mockGoBack.mockReset();
  (favouriteService.saveFavourite as jest.Mock).mockReset();
});

describe('BuildAroundMatchResultScreen', () => {
  it('shows the Discovery look title and only the owned pieces, anchor flagged', async () => {
    const { root } = await render();
    expect(byTestID(root, 'build-around-result-title')[0].props.children).toBe('Quiet luxury');
    expect(byTestID(root, 'build-around-result-item-A-anchor').length).toBeGreaterThan(0);
    expect(byTestID(root, 'build-around-result-item-B').length).toBeGreaterThan(0);
    // The empty slot is simply left out — never a fabricated tile.
    expect(byTestID(root, 'build-around-result-item-null')).toHaveLength(0);
  });

  it('Close goes back', async () => {
    const { root } = await render();
    act(() => byTestID(root, 'build-around-result-close')[0].props.onPress());
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('Save favourites the owned item ids with source build_around_discovery', async () => {
    (favouriteService.saveFavourite as jest.Mock).mockResolvedValue({ id: 'fav-1' });
    const { root } = await render();
    await act(async () => {
      byTestID(root, 'build-around-result-save')[0].props.onPress();
    });
    expect(favouriteService.saveFavourite).toHaveBeenCalledWith(
      expect.objectContaining({
        outfit_hash: 'ba_1',
        item_ids: ['A', 'B'],
        source: 'build_around_discovery',
        title: 'Quiet luxury',
      }),
    );
    expect(byTestID(root, 'build-around-result-save-saved').length).toBeGreaterThan(0);
  });
});
