// useAiLimitGate — the reactive AI daily-limit gate.
//
// Pins the `check()` truth table: it returns `true` (and opens the sheet) ONLY
// for the backend `ai_daily_limit_reached` code, and `false` for every other
// error kind / null / undefined so the caller falls through to its generic
// error handling. Also guards that dismiss closes the sheet and that a repeated
// limit `check` while visible stays idempotent (never re-opens / toggles).
//
// No testing-library in this repo — render via react-test-renderer + a tiny
// harness component (same pattern as useTemperatureOverride.test.ts).

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AI_DAILY_LIMIT_CODE } from '../../utils/aiError';
import { useAiLimitGate, type AiLimitGate } from '../useAiLimitGate';

const mountHook = () => {
  const ref: { current: AiLimitGate | null } = { current: null };
  const Harness = (): null => {
    ref.current = useAiLimitGate();
    return null;
  };
  let root!: ReturnType<typeof TestRenderer.create>;
  act(() => {
    root = TestRenderer.create(React.createElement(Harness));
  });
  const get = (): AiLimitGate => {
    if (!ref.current) {
      throw new Error('hook did not render');
    }
    return ref.current;
  };
  return { get, unmount: () => act(() => root.unmount()) };
};

describe('useAiLimitGate', () => {
  it('starts hidden', () => {
    const { get, unmount } = mountHook();
    expect(get().sheetProps.visible).toBe(false);
    unmount();
  });

  it('check() returns true and opens the sheet ONLY for the daily-limit code', () => {
    const { get, unmount } = mountHook();
    let result!: boolean;
    act(() => {
      result = get().check(AI_DAILY_LIMIT_CODE);
    });
    expect(result).toBe(true);
    expect(get().sheetProps.visible).toBe(true);
    unmount();
  });

  it.each([
    'ai_temporarily_unavailable',
    'job_failed',
    'timed_out',
    'network',
    'server',
    'unknown',
    '',
    null,
    undefined,
  ])('check(%p) returns false and keeps the sheet hidden', code => {
    const { get, unmount } = mountHook();
    let result!: boolean;
    act(() => {
      result = get().check(code as string | null | undefined);
    });
    expect(result).toBe(false);
    expect(get().sheetProps.visible).toBe(false);
    unmount();
  });

  it('is idempotent while visible — a repeated limit check stays open', () => {
    const { get, unmount } = mountHook();
    act(() => {
      get().check(AI_DAILY_LIMIT_CODE);
    });
    expect(get().sheetProps.visible).toBe(true);
    let result!: boolean;
    act(() => {
      result = get().check(AI_DAILY_LIMIT_CODE);
    });
    expect(result).toBe(true);
    expect(get().sheetProps.visible).toBe(true);
    unmount();
  });

  it('onDismiss hides the sheet', () => {
    const { get, unmount } = mountHook();
    act(() => {
      get().check(AI_DAILY_LIMIT_CODE);
    });
    expect(get().sheetProps.visible).toBe(true);
    act(() => {
      get().sheetProps.onDismiss();
    });
    expect(get().sheetProps.visible).toBe(false);
    unmount();
  });
});
