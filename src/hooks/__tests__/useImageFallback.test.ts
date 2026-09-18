// Regression cover for the blank-tile bug: an onboarding clone copies the
// SYSTEM catalog item's `processed/` blob URLs, so the highest-precedence URL
// can be non-empty but DEAD while the `common_items/` original still loads.
// Picking on string presence alone rendered nothing — the chain must degrade.
//
// No testing-library in this repo — render via react-test-renderer + a tiny
// harness component (same pattern as useStaggeredReveal.test.ts).

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useImageFallback } from '../useImageFallback';

type Result = ReturnType<typeof useImageFallback>;

const STUDIO = 'https://cdn.test/processed/studio.png';
const CUTOUT = 'https://cdn.test/processed/cutout.png';
const ORIGINAL = 'https://cdn.test/common_items/TOP_W_U/SYS_L2_TEE.png';

const mountHook = (initialSources: string[]) => {
  const ref: { current: Result | null } = { current: null };
  const Harness = ({ sources }: { sources: string[] }): null => {
    ref.current = useImageFallback(sources);
    return null;
  };
  let root!: ReturnType<typeof TestRenderer.create>;
  act(() => {
    root = TestRenderer.create(
      React.createElement(Harness, { sources: initialSources }),
    );
  });
  return {
    get: (): Result => {
      if (!ref.current) throw new Error('hook did not render');
      return ref.current;
    },
    fail: () =>
      act(() => {
        ref.current?.onError();
      }),
    setSources: (sources: string[]) =>
      act(() => {
        root.update(React.createElement(Harness, { sources }));
      }),
    unmount: () => act(() => root.unmount()),
  };
};

describe('useImageFallback', () => {
  it('serves the best candidate first', () => {
    const { get, unmount } = mountHook([STUDIO, CUTOUT, ORIGINAL]);

    expect(get().uri).toBe(STUDIO);
    expect(get().allFailed).toBe(false);
    unmount();
  });

  it('falls through a dead cutout to the surviving original', () => {
    const { get, fail, unmount } = mountHook([STUDIO, CUTOUT, ORIGINAL]);

    fail();
    expect(get().uri).toBe(CUTOUT);

    fail();
    expect(get().uri).toBe(ORIGINAL);
    expect(get().allFailed).toBe(false);
    unmount();
  });

  it('reports allFailed only once every candidate errored', () => {
    const { get, fail, unmount } = mountHook([STUDIO, ORIGINAL]);

    fail();
    fail();

    expect(get().uri).toBeUndefined();
    expect(get().allFailed).toBe(true);
    unmount();
  });

  it('is empty-safe — no sources is not "all failed"', () => {
    const { get, fail, unmount } = mountHook([]);

    expect(get().uri).toBeUndefined();
    expect(get().allFailed).toBe(false);
    fail();
    expect(get().allFailed).toBe(false);
    unmount();
  });

  it('tracks failures by URL, so a changed chain is not pre-failed', () => {
    const { get, fail, setSources, unmount } = mountHook([STUDIO, ORIGINAL]);

    fail();
    expect(get().uri).toBe(ORIGINAL);

    setSources([CUTOUT, ORIGINAL]);
    expect(get().uri).toBe(CUTOUT);
    unmount();
  });
});
