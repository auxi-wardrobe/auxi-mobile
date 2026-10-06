/**
 * WardrobeDeleteItemsScreen — multi-select delete (Figma "wardrobe - delete" /
 * "wardrobe - delete selected"). Delete stays disabled until an item is
 * picked, then reads "Delete (n)"; confirming deletes every pick and pops back.
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WardrobeDeleteItemsScreen } from '../WardrobeDeleteItemsScreen';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const navigation = { goBack: () => mockGoBack() };
  return {
    useNavigation: () => navigation,
    useRoute: () => ({ params: undefined }),
  };
});

const mockGetWardrobeItems = jest.fn();
const mockDeleteWardrobeItem = jest.fn();
jest.mock('../../../services/wardrobeService', () => ({
  wardrobeService: {
    getWardrobeItems: (...args: unknown[]) => mockGetWardrobeItems(...args),
    deleteWardrobeItem: (...args: unknown[]) => mockDeleteWardrobeItem(...args),
  },
  wardrobeKeys: {
    all: ['wardrobe-items'],
    list: (f: string = 'All') => ['wardrobe-items', f],
  },
  matchesCategoryFilter: () => true,
}));

const mockTrack = jest.fn();
jest.mock('../../../services/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

const ITEMS = [
  { id: 'a', name: 'Jacket A', created_at: '2026-01-03T00:00:00Z' },
  { id: 'b', name: 'Jacket B', created_at: '2026-01-02T00:00:00Z' },
  // System catalog row — not the user's to delete, never shown.
  {
    id: 'sys',
    name: 'Catalog',
    is_common_item: true,
    created_at: '2026-01-01T00:00:00Z',
  },
];

// Composite (non-host) nodes only, skipping the WardrobeGridTile wrapper (it
// takes the testID as a prop too) so `onPress` is the pressable's own handler.
const byTestID = (root: ReactTestInstance, id: string) =>
  root.findAll(
    n =>
      n.props?.testID === id &&
      typeof n.type !== 'string' &&
      n.props.item === undefined,
  );

const flush = async () => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
};

const render = async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <QueryClientProvider client={client}>
        <WardrobeDeleteItemsScreen />
      </QueryClientProvider>,
    );
  });
  await flush();
  return renderer;
};

describe('WardrobeDeleteItemsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWardrobeItems.mockResolvedValue(ITEMS);
    mockDeleteWardrobeItem.mockResolvedValue(undefined);
  });

  it('hides catalog rows and starts with Delete disabled', async () => {
    const { root } = await render();
    expect(byTestID(root, 'wardrobe-delete-item-a')).not.toHaveLength(0);
    expect(byTestID(root, 'wardrobe-delete-item-b')).not.toHaveLength(0);
    expect(byTestID(root, 'wardrobe-delete-item-sys')).toHaveLength(0);
    const submit = byTestID(root, 'wardrobe-delete-submit-disabled')[0];
    expect(submit.props.disabled).toBe(true);
  });

  it('enables Delete with the selected count and deletes every pick', async () => {
    const { root } = await render();
    await act(async () => {
      byTestID(root, 'wardrobe-delete-item-a')[0].props.onPress();
    });
    await act(async () => {
      byTestID(root, 'wardrobe-delete-item-b')[0].props.onPress();
    });
    expect(byTestID(root, 'wardrobe-delete-item-a-selected')).not.toHaveLength(
      0,
    );
    const submit = byTestID(root, 'wardrobe-delete-submit')[0];
    expect(submit.props.disabled).toBe(false);
    expect(submit.props.children).toBe('wardrobe.delete_items.delete_count');

    await act(async () => {
      submit.props.onPress();
    });
    await act(async () => {
      await byTestID(root, 'wardrobe-delete-dialog')[0].props.onConfirm();
    });

    expect(mockDeleteWardrobeItem.mock.calls.map(c => c[0]).sort()).toEqual([
      'a',
      'b',
    ]);
    expect(mockTrack).toHaveBeenCalledWith('wardrobe_items_bulk_deleted', {
      selected_count: 2,
      deleted_count: 2,
      failed_count: 0,
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('stays put with only the failed item selected on a partial failure', async () => {
    mockDeleteWardrobeItem.mockImplementation((id: string) =>
      id === 'b' ? Promise.reject(new Error('boom')) : Promise.resolve(),
    );
    const { root } = await render();
    await act(async () => {
      byTestID(root, 'wardrobe-delete-item-a')[0].props.onPress();
    });
    await act(async () => {
      byTestID(root, 'wardrobe-delete-item-b')[0].props.onPress();
    });
    await act(async () => {
      await byTestID(root, 'wardrobe-delete-dialog')[0].props.onConfirm();
    });
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(byTestID(root, 'wardrobe-delete-item-b-selected')).not.toHaveLength(
      0,
    );
    expect(byTestID(root, 'wardrobe-delete-item-a-selected')).toHaveLength(0);
  });
});
