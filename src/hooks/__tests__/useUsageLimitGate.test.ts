// useUsageLimitGate — the AU-442 soft-paywall gate.
//
// Pins the contract: starts hidden, `open(feature)` shows the sheet targeted
// at that feature, repeated `open()` calls while visible stay open
// (idempotent — mirrors useAiLimitGate semantics), and `dismiss()` hides it.
//
// No testing-library in this repo — render via react-test-renderer + a tiny
// harness component (same pattern as useAiLimitGate.test.ts).

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useUsageLimitGate, type UsageLimitGate } from '../useUsageLimitGate';

const mountHook = () => {
  const ref: { current: UsageLimitGate | null } = { current: null };
  const Harness = (): null => {
    ref.current = useUsageLimitGate();
    return null;
  };
  let root!: ReturnType<typeof TestRenderer.create>;
  act(() => {
    root = TestRenderer.create(React.createElement(Harness));
  });
  const get = (): UsageLimitGate => {
    if (!ref.current) {
      throw new Error('hook did not render');
    }
    return ref.current;
  };
  return { get, unmount: () => act(() => root.unmount()) };
};

describe('useUsageLimitGate', () => {
  it('starts hidden', () => {
    const { get, unmount } = mountHook();
    expect(get().sheetProps.visible).toBe(false);
    unmount();
  });

  it('open(feature) shows the sheet targeted at that feature', () => {
    const { get, unmount } = mountHook();
    act(() => {
      get().open('wardrobe_items');
    });
    expect(get().sheetProps.visible).toBe(true);
    expect(get().sheetProps.feature).toBe('wardrobe_items');
    unmount();
  });

  it('is idempotent while visible — a repeated open() stays open', () => {
    const { get, unmount } = mountHook();
    act(() => {
      get().open('see_on_me');
    });
    expect(get().sheetProps.visible).toBe(true);
    act(() => {
      get().open('see_on_me');
    });
    expect(get().sheetProps.visible).toBe(true);
    unmount();
  });

  it('dismiss() hides the sheet', () => {
    const { get, unmount } = mountHook();
    act(() => {
      get().open('enhance_photo');
    });
    expect(get().sheetProps.visible).toBe(true);
    act(() => {
      get().dismiss();
    });
    expect(get().sheetProps.visible).toBe(false);
    unmount();
  });

  it('sheetProps.onDismiss is the same dismiss behavior', () => {
    const { get, unmount } = mountHook();
    act(() => {
      get().open('see_on_me');
    });
    act(() => {
      get().sheetProps.onDismiss();
    });
    expect(get().sheetProps.visible).toBe(false);
    unmount();
  });
});
