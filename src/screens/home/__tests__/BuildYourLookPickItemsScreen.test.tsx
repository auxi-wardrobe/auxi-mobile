// Home "Build your look" → Add item picker: items already on the section are
// not re-pickable, the pick is capped at the room left under three, and
// confirming hands the ids back to HomeLanding by merging route params.

import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BuildYourLookPickItemsScreen } from '../BuildYourLookPickItemsScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockParams: { selectedIds: string[] } = { selectedIds: [] };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
const mockToastShow = jest.fn();
jest.mock('../../../components/design-system/lib', () => ({
  ...jest.requireActual('../../../components/design-system/lib'),
  toast: { show: (...args: unknown[]) => mockToastShow(...args) },
}));
jest.mock('../../../services/wardrobeService', () => ({
  wardrobeKeys: { list: () => ['wardrobe-items', 'All'] },
  wardrobeService: {
    getWardrobeItems: () =>
      Promise.resolve(
        ['a', 'b', 'c', 'd'].map(id => ({ id, name: id, category: 'Top', image_url: `https://x/${id}.png` })),
      ),
  },
}));

const byTestID = (root: ReactTestInstance, id: string) =>
  root.findAll(n => n.props?.testID === id);
// Host nodes only (a Pressable is composite + native View, both with the id).
const hostByTestID = (root: ReactTestInstance, id: string) =>
  root.findAll(n => n.props?.testID === id && typeof n.type === 'string');
const press = (node: ReactTestInstance) => act(() => node.props.onPress());

const render = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(
      <QueryClientProvider client={client}>
        <BuildYourLookPickItemsScreen />
      </QueryClientProvider>,
    );
  });
  // Let the wardrobe query resolve.
  for (let i = 0; i < 3; i += 1) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  }
  return r;
};

beforeEach(() => {
  mockNavigate.mockReset();
  mockToastShow.mockReset();
  mockParams = { selectedIds: [] };
});

describe('BuildYourLookPickItemsScreen', () => {
  it('confirms the picked ids back to HomeLanding with merge', async () => {
    const r = await render();
    expect(byTestID(r.root, 'home-build-look-pick-confirm')[0].props.disabled).toBe(true);
    press(byTestID(r.root, 'home-build-look-pick-item-a')[0]);
    press(byTestID(r.root, 'home-build-look-pick-item-b')[0]);
    expect(hostByTestID(r.root, 'home-build-look-pick-item-a-selected')).toHaveLength(1);
    press(byTestID(r.root, 'home-build-look-pick-confirm')[0]);
    expect(mockNavigate).toHaveBeenCalledWith({
      name: 'HomeLanding',
      params: { buildLookAddItemIds: ['a', 'b'] },
      merge: true,
    });
  });

  it('caps the pick at the room left under three and disables items already on the section', async () => {
    mockParams = { selectedIds: ['a'] };
    const r = await render();
    expect(byTestID(r.root, 'home-build-look-pick-item-a')[0].props.disabled).toBe(true);
    press(byTestID(r.root, 'home-build-look-pick-item-b')[0]);
    press(byTestID(r.root, 'home-build-look-pick-item-c')[0]);
    press(byTestID(r.root, 'home-build-look-pick-item-d')[0]);
    expect(hostByTestID(r.root, 'home-build-look-pick-item-d-selected')).toHaveLength(0);
    expect(mockToastShow).toHaveBeenCalledTimes(1);
    press(byTestID(r.root, 'home-build-look-pick-confirm')[0]);
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ params: { buildLookAddItemIds: ['b', 'c'] } }),
    );
  });
});
