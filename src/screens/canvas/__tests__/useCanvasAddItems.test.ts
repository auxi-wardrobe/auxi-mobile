// AU-392 sweep fix (2026-07-30, qa-ui HIGH finding): the in-editor "+" picker
// add-flow was the only seeding path that never called `resolveTileStatus` on
// the picked `WardrobeItem`, so items added mid-session lost their status
// badge while `seedFromOutfit` (initial seed) and the Remix initial-items
// mapping both resolved it correctly. Regression-covers the fix: an added
// item with a resolvable status gets `status` set on its `CanvasItemData`.
//
// No testing-library in this repo — render via react-test-renderer + a tiny
// harness component (same pattern as useTryOnFeedback.test.ts).

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { CanvasItemData } from '../../../components/features/OutfitCanvasSurface';
import { WardrobeItem } from '../../../services/wardrobeService';
import { useCanvasAddItems } from '../useCanvasAddItems';

// Bypass the real prefetch warm-up (700ms floor + native Image.prefetch) so the
// test resolves synchronously-ish without needing fake timers.
jest.mock('../canvas-helpers', () => {
  const actual = jest.requireActual('../canvas-helpers');
  return {
    ...actual,
    delay: jest.fn(() => Promise.resolve()),
    prefetchWithTimeout: jest.fn(() => Promise.resolve()),
  };
});

type Harness = ReturnType<typeof useCanvasAddItems>;

const mountHook = () => {
  let items: CanvasItemData[] = [];
  const setItems = jest.fn((updater: React.SetStateAction<CanvasItemData[]>) => {
    items = typeof updater === 'function' ? (updater as (p: CanvasItemData[]) => CanvasItemData[])(items) : updater;
  });
  const pushHistory = jest.fn();
  const setPickerVisible = jest.fn();

  const ref: { current: Harness | null } = { current: null };
  const HarnessComponent = (): null => {
    ref.current = useCanvasAddItems({ setItems, pushHistory, setPickerVisible });
    return null;
  };
  let root!: ReturnType<typeof TestRenderer.create>;
  act(() => {
    root = TestRenderer.create(React.createElement(HarnessComponent));
  });

  return {
    get: (): Harness => {
      if (!ref.current) throw new Error('hook did not render');
      return ref.current;
    },
    getItems: () => items,
    setPickerVisible,
    unmount: () => act(() => root.unmount()),
  };
};

const commonWardrobeItem: WardrobeItem = {
  id: 'wardrobe-1',
  image_url: 'https://cdn.example/trousers.jpg',
  category: 'trousers',
  is_common_item: true,
} as WardrobeItem;

describe('useCanvasAddItems', () => {
  it('sets status on a newly-added item resolved from the picker (AU-392 fix)', async () => {
    const { get, getItems, unmount } = mountHook();

    await act(async () => {
      await get().handlePickerConfirm([commonWardrobeItem]);
    });

    const added = getItems();
    expect(added).toHaveLength(1);
    expect(added[0].status).toBe('common');
    unmount();
  });

  it('resolves no status for a plain user item (none of the 4 states apply)', async () => {
    const { get, getItems, unmount } = mountHook();
    const plainItem: WardrobeItem = {
      id: 'wardrobe-2',
      image_url: 'https://cdn.example/shirt.jpg',
      category: 'shirt',
      user_id: 'user-1',
      is_common_item: false,
    } as WardrobeItem;

    await act(async () => {
      await get().handlePickerConfirm([plainItem]);
    });

    const added = getItems();
    expect(added).toHaveLength(1);
    expect(added[0].status).toBeNull();
    unmount();
  });
});
