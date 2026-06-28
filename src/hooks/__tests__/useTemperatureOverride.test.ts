// AU-391 — useTemperatureOverride is session-only (in-memory).
//
// The manual temperature override must reset to Live Weather on a true app
// terminate → reopen. We implement that by NOT persisting it: the hook holds the
// active bucket in React state only, so a cold start (fresh JS context)
// re-initializes to `weather`. These tests pin that contract and guard against
// re-introducing AsyncStorage persistence (the AU-362 "D3" behavior AU-391
// reverses).
//
// No testing-library in this repo — render via react-test-renderer + a tiny
// harness component, like the App smoke test renders the tree.

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useTemperatureOverride,
  type UseTemperatureOverride,
} from '../useTemperatureOverride';

// Explicit in-memory mock so we can assert the hook never touches storage. If
// anyone re-adds AsyncStorage.setItem to the hook, the "never persists" tests
// fail — that is the AU-391 regression guard.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

const mountHook = () => {
  const ref: { current: UseTemperatureOverride | null } = { current: null };
  const Harness = (): null => {
    ref.current = useTemperatureOverride();
    return null;
  };
  let root!: ReturnType<typeof TestRenderer.create>;
  act(() => {
    root = TestRenderer.create(React.createElement(Harness));
  });
  const get = (): UseTemperatureOverride => {
    if (!ref.current) {
      throw new Error('hook did not render');
    }
    return ref.current;
  };
  return { get, unmount: () => act(() => root.unmount()) };
};

describe('useTemperatureOverride (session-only / AU-391)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes to Live Weather on a fresh mount (cold-start default)', () => {
    const { get, unmount } = mountHook();
    expect(get().activeBucketKey).toBe('weather');
    expect(get().overrideTempC).toBeNull();
    expect(get().overrideTempCRef.current).toBeNull();
    expect(get().isOverrideActive).toBe(false);
    unmount();
  });

  it('does not rehydrate from persisted storage on mount', () => {
    const { unmount } = mountHook();
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    unmount();
  });

  it('apply() activates a bucket in memory and never persists it', () => {
    const { get, unmount } = mountHook();
    act(() => {
      get().apply('hot_28_40');
    });
    expect(get().activeBucketKey).toBe('hot_28_40');
    expect(get().overrideTempC).toBe(33);
    expect(get().overrideTempCRef.current).toBe(33);
    expect(get().activeBucketKeyRef.current).toBe('hot_28_40');
    expect(get().isOverrideActive).toBe(true);
    // The crux of AU-391: nothing is written, so a cold start cannot restore it.
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    unmount();
  });

  it('clear() returns to Live Weather', () => {
    const { get, unmount } = mountHook();
    act(() => {
      get().apply('cold_0_7');
    });
    expect(get().isOverrideActive).toBe(true);
    act(() => {
      get().clear();
    });
    expect(get().activeBucketKey).toBe('weather');
    expect(get().overrideTempC).toBeNull();
    expect(get().overrideTempCRef.current).toBeNull();
    expect(get().isOverrideActive).toBe(false);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    unmount();
  });
});
