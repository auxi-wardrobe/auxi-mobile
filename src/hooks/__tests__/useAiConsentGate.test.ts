/* eslint-env jest */
// useAiConsentGate — the AI data-sharing consent wrapper.
//
// The decline branch is the point of these tests. A caller that has ALREADY
// committed UI to the action it is about to run (SeeThisOnMeScreen mounts
// straight onto its 'generating' loading step on the auto-reuse render entry)
// has nothing to fall back to when consent is refused: no job starts, the
// store stays 'idle', and the loading screen spins forever. `run`'s optional
// `onDecline` is that unwind hook, and it must fire on BOTH ways the action
// can fail to run — an explicit Decline, and an accept whose consent-persist
// throws.
//
// No testing-library in this repo — render via react-test-renderer + a tiny
// harness component (same pattern as useUsageLimitGate.test.ts).

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const mockHasConsent = jest.fn();
const mockGrant = jest.fn();
const mockDecline = jest.fn();

jest.mock('../../services/aiConsent', () => ({
  hasAiDataSharingConsent: () => mockHasConsent(),
  grantAiDataSharingConsent: () => mockGrant(),
  declineAiDataSharingConsent: () => mockDecline(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

import { useAiConsentGate, type AiConsentGate } from '../useAiConsentGate';

const mountHook = () => {
  const ref: { current: AiConsentGate | null } = { current: null };
  const Harness = (): null => {
    ref.current = useAiConsentGate();
    return null;
  };
  let root!: ReturnType<typeof TestRenderer.create>;
  act(() => {
    root = TestRenderer.create(React.createElement(Harness));
  });
  const get = (): AiConsentGate => {
    if (!ref.current) {
      throw new Error('hook did not render');
    }
    return ref.current;
  };
  return { get, unmount: () => act(() => root.unmount()) };
};

// `run` resolves a promise before touching state, so every interaction needs a
// flushed microtask queue inside act() before assertions.
const flush = async (fn: () => void) => {
  await act(async () => {
    fn();
  });
};

beforeEach(() => {
  mockHasConsent.mockReset().mockResolvedValue(false);
  mockGrant.mockReset().mockResolvedValue(undefined);
  mockDecline.mockReset().mockResolvedValue(undefined);
});

describe('useAiConsentGate', () => {
  it('runs the action immediately when consent is already granted', async () => {
    mockHasConsent.mockResolvedValue(true);
    const action = jest.fn();
    const onDecline = jest.fn();
    const { get, unmount } = mountHook();

    await flush(() => get().run(action, onDecline));

    expect(action).toHaveBeenCalledTimes(1);
    expect(onDecline).not.toHaveBeenCalled();
    expect(get().dialogProps.visible).toBe(false);
    unmount();
  });

  it('prompts instead of running when consent is not granted', async () => {
    const action = jest.fn();
    const { get, unmount } = mountHook();

    await flush(() => get().run(action));

    expect(action).not.toHaveBeenCalled();
    expect(get().dialogProps.visible).toBe(true);
    unmount();
  });

  it('fires onDecline (not the action) when the user declines', async () => {
    const action = jest.fn();
    const onDecline = jest.fn();
    const { get, unmount } = mountHook();

    await flush(() => get().run(action, onDecline));
    await flush(() => get().dialogProps.onDecline());

    expect(action).not.toHaveBeenCalled();
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(mockDecline).toHaveBeenCalledTimes(1);
    expect(get().dialogProps.visible).toBe(false);
    unmount();
  });

  it('fires onDecline when accept persists but the write throws', async () => {
    // The action deliberately does NOT run without a recorded consent — so the
    // caller still needs its unwind, or it is stranded exactly as on decline.
    mockGrant.mockRejectedValue(new Error('storage full'));
    const action = jest.fn();
    const onDecline = jest.fn();
    const { get, unmount } = mountHook();

    await flush(() => get().run(action, onDecline));
    await flush(() => get().dialogProps.onAccept());

    expect(action).not.toHaveBeenCalled();
    expect(onDecline).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('runs the action on accept and never the decline branch', async () => {
    const action = jest.fn();
    const onDecline = jest.fn();
    const { get, unmount } = mountHook();

    await flush(() => get().run(action, onDecline));
    await flush(() => get().dialogProps.onAccept());

    expect(action).toHaveBeenCalledTimes(1);
    expect(onDecline).not.toHaveBeenCalled();
    unmount();
  });

  it('does not replay a previous decline branch on a later run', async () => {
    // Refs are cleared on each decision, so a second run() that passes no
    // onDecline can never fire the first call's handler.
    const firstDecline = jest.fn();
    const { get, unmount } = mountHook();

    await flush(() => get().run(jest.fn(), firstDecline));
    await flush(() => get().dialogProps.onDecline());
    expect(firstDecline).toHaveBeenCalledTimes(1);

    await flush(() => get().run(jest.fn()));
    await flush(() => get().dialogProps.onDecline());
    expect(firstDecline).toHaveBeenCalledTimes(1);
    unmount();
  });
});
