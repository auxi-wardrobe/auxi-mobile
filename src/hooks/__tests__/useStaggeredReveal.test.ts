// useStaggeredReveal — See-on-me redesign (B1) staggered row reveal + the 7s
// CTA min-wait gate shared by both loading screens.
//
// No testing-library in this repo — render via react-test-renderer + a tiny
// harness component (same pattern as useAiLimitGate.test.ts).

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AccessibilityInfo } from 'react-native';
import {
  useStaggeredReveal,
  type UseStaggeredRevealOptions,
  type UseStaggeredRevealResult,
} from '../useStaggeredReveal';

// Spy on the real module's method rather than `jest.mock('react-native', ...)`
// with `requireActual` — the latter re-evaluates react-native's native-module
// registration eagerly and breaks TurboModule setup (`DevMenu` etc.) under
// this repo's `preset: 'react-native'` jest config.
const mockedIsReduceMotionEnabled = jest.spyOn(
  AccessibilityInfo,
  'isReduceMotionEnabled',
);

const mountHook = (
  rowCount: number,
  options?: UseStaggeredRevealOptions,
) => {
  const ref: { current: UseStaggeredRevealResult | null } = { current: null };
  const Harness = (): null => {
    ref.current = useStaggeredReveal(rowCount, options);
    return null;
  };
  let root!: ReturnType<typeof TestRenderer.create>;
  act(() => {
    root = TestRenderer.create(React.createElement(Harness));
  });
  return {
    get: (): UseStaggeredRevealResult => {
      if (!ref.current) throw new Error('hook did not render');
      return ref.current;
    },
    unmount: () => act(() => root.unmount()),
  };
};

beforeEach(() => {
  jest.useFakeTimers();
  mockedIsReduceMotionEnabled.mockResolvedValue(false);
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('useStaggeredReveal', () => {
  it('reveals row 1 immediately and one more every stepMs', async () => {
    const { get, unmount } = mountHook(3, { stepMs: 2000, minCtaMs: 7000 });
    await act(async () => {});
    expect(get().visibleCount).toBe(1);

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(get().visibleCount).toBe(2);

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(get().visibleCount).toBe(3);
    unmount();
  });

  it('gates the CTA to minCtaMs even after all rows revealed', async () => {
    const { get, unmount } = mountHook(3, { stepMs: 2000, minCtaMs: 7000 });
    await act(async () => {
      jest.advanceTimersByTime(4000); // all 3 rows revealed (0s, 2s, 4s)
    });
    expect(get().visibleCount).toBe(3);
    expect(get().ctaEnabled).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(3000); // 7s total
    });
    expect(get().ctaEnabled).toBe(true);
    unmount();
  });

  it('binds the gate even when rows take longer than the floor (4 rows = 6s)', async () => {
    const { get, unmount } = mountHook(4, { stepMs: 2000, minCtaMs: 7000 });
    await act(async () => {
      jest.advanceTimersByTime(6000); // all 4 rows revealed (0,2,4,6s)
    });
    expect(get().visibleCount).toBe(4);
    expect(get().ctaEnabled).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(1000); // 7s total
    });
    expect(get().ctaEnabled).toBe(true);
    unmount();
  });

  it('reduce-motion reveals all rows immediately but still gates the CTA', async () => {
    mockedIsReduceMotionEnabled.mockResolvedValue(true);
    const { get, unmount } = mountHook(3, { stepMs: 2000, minCtaMs: 7000 });
    await act(async () => {});
    expect(get().visibleCount).toBe(3);
    expect(get().ctaEnabled).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(7000);
    });
    expect(get().ctaEnabled).toBe(true);
    unmount();
  });
});
