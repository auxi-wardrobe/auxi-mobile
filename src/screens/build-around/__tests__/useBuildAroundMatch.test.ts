// useBuildAroundMatch — run lifecycle: dedup, min loading time, cancel, retry
// (keeps the style), unmount abort. react-test-renderer harness.

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MIN_LOADING_MS } from '../../make-it-yours/useMakeItYoursRun';
import { useBuildAroundMatch } from '../useBuildAroundMatch';
import { buildAroundMatchService } from '../../../services/buildAroundMatchService';
import { track } from '../../../services/analytics';

jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('../../../services/buildAroundMatchService', () => ({
  ...jest.requireActual('../../../services/buildAroundMatchService'),
  buildAroundMatchService: { run: jest.fn() },
}));

const runMock = buildAroundMatchService.run as jest.Mock;
const trackMock = track as jest.Mock;

const RESULT = {
  state: 'success',
  algorithm_version: 'ba-1',
  inspiration: { id: 'o1', title: 'Look', composite_image_url: null },
  outfit: { outfit_hash: 'ba_x', is_complete: true, slots: [] },
};

type Api = ReturnType<typeof useBuildAroundMatch>;

// `null` = no item (a bare `undefined` would hit the default).
const mount = (itemIdArg: string | null = 'A') => {
  const itemId = itemIdArg ?? undefined;
  const onDone = jest.fn();
  const ref: { current: Api | null } = { current: null };
  const Harness = (): null => {
    ref.current = useBuildAroundMatch(itemId, onDone);
    return null;
  };
  let root!: ReturnType<typeof TestRenderer.create>;
  act(() => {
    root = TestRenderer.create(React.createElement(Harness));
  });
  return { get: () => ref.current as Api, onDone, unmount: () => act(() => root.unmount()) };
};

const flush = async (ms = MIN_LOADING_MS) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  runMock.mockReset();
  trackMock.mockReset();
});
afterEach(() => jest.useRealTimers());

describe('useBuildAroundMatch', () => {
  it('runs once for repeated start() and hands the result to onDone', async () => {
    runMock.mockResolvedValue(RESULT);
    const { get, onDone } = mount();
    act(() => {
      get().start('minimal');
      get().start('minimal');
    });
    expect(get().status).toBe('loading');
    expect(runMock).toHaveBeenCalledTimes(1);
    expect(runMock).toHaveBeenCalledWith('A', 'minimal', expect.any(Object));
    await flush();
    expect(onDone).toHaveBeenCalledWith(RESULT);
    expect(get().status).toBe('idle');
    expect(trackMock).toHaveBeenCalledWith(
      'build_around_discovery_completed',
      expect.objectContaining({ item_id: 'A', trend_tag: 'minimal', state: 'success' }),
    );
  });

  it('holds the loading state for MIN_LOADING_MS even if the API is instant', async () => {
    runMock.mockResolvedValue(RESULT);
    const { get, onDone } = mount();
    act(() => get().start('casual'));
    await flush(MIN_LOADING_MS - 100);
    expect(onDone).not.toHaveBeenCalled();
    await flush(100);
    expect(onDone).toHaveBeenCalled();
  });

  it('cancel aborts silently — no error, no onDone', async () => {
    let signal: AbortSignal | undefined;
    runMock.mockImplementation((_i: string, _s: string, s: AbortSignal) => {
      signal = s;
      return new Promise((_, reject) =>
        s.addEventListener('abort', () => reject({ code: 'ERR_CANCELED' })),
      );
    });
    const { get, onDone } = mount();
    act(() => get().start('casual'));
    act(() => get().cancel());
    await flush();
    expect(signal?.aborted).toBe(true);
    expect(get().status).toBe('idle');
    expect(get().errorCode).toBeNull();
    expect(onDone).not.toHaveBeenCalled();
    expect(trackMock).not.toHaveBeenCalledWith('build_around_discovery_failed', expect.anything());
  });

  it('failure → error state; retry re-runs with the same style', async () => {
    runMock.mockRejectedValueOnce({ response: { status: 429 } }).mockResolvedValueOnce(RESULT);
    const { get, onDone } = mount();
    act(() => get().start('classic'));
    await flush();
    expect(get().status).toBe('error');
    expect(get().errorCode).toBe('rate_limited');
    act(() => get().retry());
    await flush();
    expect(runMock).toHaveBeenLastCalledWith('A', 'classic', expect.any(Object));
    expect(onDone).toHaveBeenCalledWith(RESULT);
  });

  it('does nothing without an item id, and unmount mid-run aborts the request', () => {
    const none = mount(null);
    act(() => none.get().start('casual'));
    expect(runMock).not.toHaveBeenCalled();

    let signal: AbortSignal | undefined;
    runMock.mockImplementation((_i: string, _s: string, s: AbortSignal) => {
      signal = s;
      return new Promise(() => undefined);
    });
    const { get, unmount } = mount();
    act(() => get().start('casual'));
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
