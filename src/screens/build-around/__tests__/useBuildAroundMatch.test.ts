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
  algorithm_version: 'ba-2',
  outfits: [
    {
      inspiration: { id: 'o1', title: 'Look', composite_image_url: null },
      anchor_match: 'exact',
      outfit_hash: 'ba_x',
      is_complete: true,
      slots: [],
    },
  ],
};

type Api = ReturnType<typeof useBuildAroundMatch>;

const mount = (itemIds: string[] = ['A']) => {
  const onDone = jest.fn();
  const ref: { current: Api | null } = { current: null };
  const Harness = (): null => {
    ref.current = useBuildAroundMatch(itemIds, onDone);
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
      get().start(['minimal']);
      get().start(['minimal']);
    });
    expect(get().status).toBe('loading');
    expect(runMock).toHaveBeenCalledTimes(1);
    expect(runMock).toHaveBeenCalledWith(
      { itemIds: ['A'], trendTags: ['minimal'] },
      expect.any(Object),
    );
    await flush();
    expect(onDone).toHaveBeenCalledWith(RESULT);
    expect(get().status).toBe('idle');
    expect(trackMock).toHaveBeenCalledWith(
      'build_around_discovery_completed',
      expect.objectContaining({
        item_id: 'A',
        item_count: 1,
        entry: 'item_detail',
        trend_tag: 'minimal',
        state: 'success',
      }),
    );
  });

  it('multi-anchor (Home entry): sends every id, reports item_count + entry, trend_tags only for several tags', async () => {
    runMock.mockResolvedValue(RESULT);
    const onDone = jest.fn();
    const ref: { current: Api | null } = { current: null };
    const Harness = (): null => {
      ref.current = useBuildAroundMatch(['A', 'B', 'C'], onDone, 'home_landing');
      return null;
    };
    act(() => {
      TestRenderer.create(React.createElement(Harness));
    });
    act(() => (ref.current as Api).start(['minimal', 'casual']));
    expect(runMock).toHaveBeenCalledWith(
      { itemIds: ['A', 'B', 'C'], trendTags: ['minimal', 'casual'] },
      expect.any(Object),
    );
    await flush();
    expect(trackMock).toHaveBeenCalledWith(
      'build_around_discovery_started',
      expect.objectContaining({
        item_id: 'A',
        item_count: 3,
        entry: 'home_landing',
        trend_tag: 'minimal',
        trend_tags: ['minimal', 'casual'],
      }),
    );
    expect(onDone).toHaveBeenCalledWith(RESULT);
  });

  it('omits trend_tag from analytics for Surprise me (never null)', async () => {
    runMock.mockResolvedValue(RESULT);
    const { get } = mount();
    act(() => get().start([]));
    await flush();
    for (const [, props] of trackMock.mock.calls) {
      expect(props).not.toHaveProperty('trend_tag');
      expect(props).not.toHaveProperty('trend_tags');
    }
    expect(runMock).toHaveBeenCalledWith({ itemIds: ['A'], trendTags: [] }, expect.any(Object));
  });

  it('holds the loading state for MIN_LOADING_MS even if the API is instant', async () => {
    runMock.mockResolvedValue(RESULT);
    const { get, onDone } = mount();
    act(() => get().start(['casual']));
    await flush(MIN_LOADING_MS - 100);
    expect(onDone).not.toHaveBeenCalled();
    await flush(100);
    expect(onDone).toHaveBeenCalled();
  });

  it('cancel aborts silently — no error, no onDone', async () => {
    let signal: AbortSignal | undefined;
    runMock.mockImplementation((_req: unknown, s: AbortSignal) => {
      signal = s;
      return new Promise((_, reject) =>
        s.addEventListener('abort', () => reject({ code: 'ERR_CANCELED' })),
      );
    });
    const { get, onDone } = mount();
    act(() => get().start(['casual']));
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
    act(() => get().start(['classic']));
    await flush();
    expect(get().status).toBe('error');
    expect(get().errorCode).toBe('rate_limited');
    act(() => get().retry());
    await flush();
    expect(runMock).toHaveBeenLastCalledWith(
      { itemIds: ['A'], trendTags: ['classic'] },
      expect.any(Object),
    );
    expect(onDone).toHaveBeenCalledWith(RESULT);
  });

  it('does nothing without an item id, and unmount mid-run aborts the request', () => {
    const none = mount([]);
    act(() => none.get().start(['casual']));
    expect(runMock).not.toHaveBeenCalled();

    let signal: AbortSignal | undefined;
    runMock.mockImplementation((_req: unknown, s: AbortSignal) => {
      signal = s;
      return new Promise(() => undefined);
    });
    const { get, unmount } = mount();
    act(() => get().start(['casual']));
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
