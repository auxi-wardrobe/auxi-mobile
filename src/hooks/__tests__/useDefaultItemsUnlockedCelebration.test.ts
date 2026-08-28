// useDefaultItemsUnlockedCelebration — WHEN the milestone check runs.
//
// The service owns once-per-user, the server's `unlocked` flag and fail-open
// (covered in services/__tests__/defaultItemsMilestone.test.ts). This hook
// only decides when to ask, so that is all these tests pin: it asks once the
// wardrobe has loaded, asks again when the wardrobe GROWS (whichever route
// added the item — a Database pick never touches useAddWardrobeItem), and
// stays quiet otherwise.
//
// No testing-library in this repo — render via react-test-renderer + a tiny
// harness component (same pattern as useUsageLimitGate.test.ts).

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const mockMaybeCelebrate = jest.fn();
jest.mock('../../services/defaultItemsMilestone', () => ({
  maybeCelebrateDefaultItemsUnlocked: (...a: any[]) => mockMaybeCelebrate(...a),
}));

const mockTrack = jest.fn();
jest.mock('../../services/analytics', () => ({
  track: (...a: any[]) => mockTrack(...a),
}));

import { useDefaultItemsUnlockedCelebration } from '../useDefaultItemsUnlockedCelebration';

type Hook = ReturnType<typeof useDefaultItemsUnlockedCelebration>;

const USER = { id: 'user-1' } as any;

const mountHook = (initial: { itemCount?: number; user?: any }) => {
  const ref: { current: Hook | null } = { current: null };
  const Harness = (props: { itemCount?: number; user?: any }): null => {
    ref.current = useDefaultItemsUnlockedCelebration({
      itemCount: props.itemCount,
      user: props.user,
    });
    return null;
  };
  let root!: ReturnType<typeof TestRenderer.create>;
  act(() => {
    root = TestRenderer.create(React.createElement(Harness, initial));
  });
  return {
    get: (): Hook => {
      if (!ref.current) {
        throw new Error('hook did not render');
      }
      return ref.current;
    },
    rerender: (next: { itemCount?: number; user?: any }) =>
      act(() => {
        root.update(React.createElement(Harness, next));
      }),
    unmount: () => act(() => root.unmount()),
  };
};

/** Let the fire-and-forget `.then(...)` settle. */
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockMaybeCelebrate.mockResolvedValue(null);
});

describe('useDefaultItemsUnlockedCelebration', () => {
  it('starts hidden', () => {
    const { get, unmount } = mountHook({ itemCount: 3, user: USER });

    expect(get().sheetProps.visible).toBe(false);
    unmount();
  });

  it('does not ask while the wardrobe is still loading', () => {
    const { unmount } = mountHook({ itemCount: undefined, user: USER });

    expect(mockMaybeCelebrate).not.toHaveBeenCalled();
    unmount();
  });

  it('does not ask without a signed-in user', () => {
    const { unmount } = mountHook({ itemCount: 12, user: null });

    expect(mockMaybeCelebrate).not.toHaveBeenCalled();
    unmount();
  });

  it('asks once the wardrobe has loaded', () => {
    const { unmount } = mountHook({ itemCount: 12, user: USER });

    expect(mockMaybeCelebrate).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('asks again when the wardrobe grows — whichever route added the item', () => {
    const { rerender, unmount } = mountHook({ itemCount: 11, user: USER });
    expect(mockMaybeCelebrate).toHaveBeenCalledTimes(1);

    // e.g. a Database pick, which lands here by navigation only.
    rerender({ itemCount: 12, user: USER });

    expect(mockMaybeCelebrate).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('stays quiet on a re-render with an unchanged wardrobe', () => {
    const { rerender, unmount } = mountHook({ itemCount: 12, user: USER });
    expect(mockMaybeCelebrate).toHaveBeenCalledTimes(1);

    rerender({ itemCount: 12, user: USER });
    rerender({ itemCount: 12, user: USER });

    expect(mockMaybeCelebrate).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('stays quiet when the wardrobe shrinks (a delete is not a milestone)', () => {
    const { rerender, unmount } = mountHook({ itemCount: 12, user: USER });
    expect(mockMaybeCelebrate).toHaveBeenCalledTimes(1);

    rerender({ itemCount: 11, user: USER });

    expect(mockMaybeCelebrate).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('re-checks after a shrink once the wardrobe grows past the new low', () => {
    const { rerender, unmount } = mountHook({ itemCount: 12, user: USER });
    rerender({ itemCount: 11, user: USER });
    expect(mockMaybeCelebrate).toHaveBeenCalledTimes(1);

    rerender({ itemCount: 12, user: USER });

    expect(mockMaybeCelebrate).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('shows the sheet with the milestone numbers when the service says so', async () => {
    mockMaybeCelebrate.mockResolvedValue({ own_item_count: 12, threshold: 12 });
    const { get, unmount } = mountHook({ itemCount: 12, user: USER });

    await flush();

    expect(get().sheetProps.visible).toBe(true);
    expect(get().sheetProps.ownItemCount).toBe(12);
    expect(get().sheetProps.threshold).toBe(12);
    unmount();
  });

  it('stays hidden when the service declines', async () => {
    mockMaybeCelebrate.mockResolvedValue(null);
    const { get, unmount } = mountHook({ itemCount: 12, user: USER });

    await flush();

    expect(get().sheetProps.visible).toBe(false);
    unmount();
  });

  it('tracks and hides on dismiss', async () => {
    mockMaybeCelebrate.mockResolvedValue({ own_item_count: 12, threshold: 12 });
    const { get, unmount } = mountHook({ itemCount: 12, user: USER });
    await flush();

    act(() => get().sheetProps.onDismiss());

    expect(mockTrack).toHaveBeenCalledWith('default_items_unlock_dismissed');
    expect(get().sheetProps.visible).toBe(false);
    unmount();
  });
});
