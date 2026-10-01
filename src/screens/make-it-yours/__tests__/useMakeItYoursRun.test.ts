// useMakeItYoursRun — AU-458 run lifecycle: dedup, cancel, error mapping,
// result hand-off via the query cache. react-test-renderer harness (no
// testing-library in this repo).

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import {
  MIN_LOADING_MS,
  toErrorCode,
  useMakeItYoursRun,
} from '../useMakeItYoursRun';
import { makeItYoursService } from '../../../services/makeItYoursService';
import { track } from '../../../services/analytics';

jest.mock('../../../services/analytics', () => ({ track: jest.fn() }));
jest.mock('../../../services/makeItYoursService', () => ({
  ...jest.requireActual('../../../services/makeItYoursService'),
  makeItYoursService: { run: jest.fn() },
}));

const runMock = makeItYoursService.run as jest.Mock;
const trackMock = track as jest.Mock;

const RESULT = {
  state: 'success',
  algorithm_version: 'miy-1',
  inspiration: { id: 'o1', title: 'Look', composite_image_url: null },
  outfits: [{ outfit_hash: 'miy_x', is_complete: true, slots: [] }],
  relevant_items: [],
};

type Api = ReturnType<typeof useMakeItYoursRun>;

// `null` = no outfit loaded yet (a bare `undefined` would hit the default).
const mount = (outfitIdArg: string | null = 'o1') => {
  const outfitId = outfitIdArg ?? undefined;
  const client = new QueryClient();
  const onDone = jest.fn();
  const ref: { current: Api | null } = { current: null };
  const Harness = (): null => {
    ref.current = useMakeItYoursRun(outfitId, onDone);
    return null;
  };
  let root!: ReturnType<typeof TestRenderer.create>;
  act(() => {
    root = TestRenderer.create(
      React.createElement(QueryClientProvider, { client }, React.createElement(Harness)),
    );
  });
  return { get: () => ref.current as Api, onDone, client, unmount: () => act(() => root.unmount()) };
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

describe('useMakeItYoursRun', () => {
  it('runs once even when start() is tapped repeatedly', async () => {
    runMock.mockResolvedValue(RESULT);
    const { get, onDone } = mount();
    act(() => {
      get().start();
      get().start();
      get().start();
    });
    expect(get().status).toBe('loading');
    expect(runMock).toHaveBeenCalledTimes(1);
    await flush();
    expect(onDone).toHaveBeenCalledWith(RESULT);
    expect(get().status).toBe('idle');
    expect(trackMock).toHaveBeenCalledWith('make_it_yours_completed', expect.objectContaining({ state: 'success', outfit_count: 1 }));
  });

  it('keeps the modal up for MIN_LOADING_MS even if the API is instant', async () => {
    runMock.mockResolvedValue(RESULT);
    const { get, onDone } = mount();
    act(() => get().start());
    await flush(MIN_LOADING_MS - 100);
    expect(onDone).not.toHaveBeenCalled();
    await flush(100);
    expect(onDone).toHaveBeenCalled();
  });

  it('cancel aborts silently — no error, no onDone', async () => {
    let signal: AbortSignal | undefined;
    runMock.mockImplementation((_id: string, s: AbortSignal) => {
      signal = s;
      return new Promise((_, reject) =>
        s.addEventListener('abort', () => reject({ code: 'ERR_CANCELED' })),
      );
    });
    const { get, onDone } = mount();
    act(() => get().start());
    act(() => get().cancel());
    await flush();
    expect(signal?.aborted).toBe(true);
    expect(get().status).toBe('idle');
    expect(get().errorCode).toBeNull();
    expect(onDone).not.toHaveBeenCalled();
    expect(trackMock).toHaveBeenCalledWith('make_it_yours_cancelled', expect.objectContaining({ outfit_id: 'o1' }));
    expect(trackMock).not.toHaveBeenCalledWith('make_it_yours_failed', expect.anything());
  });

  it('failure → error state, retry runs again', async () => {
    runMock.mockRejectedValueOnce({ response: { status: 500 } }).mockResolvedValueOnce(RESULT);
    const { get, onDone } = mount();
    act(() => get().start());
    await flush();
    expect(get().status).toBe('error');
    expect(get().errorCode).toBe('server_error');
    act(() => get().retry());
    await flush();
    expect(runMock).toHaveBeenCalledTimes(2);
    expect(onDone).toHaveBeenCalledWith(RESULT);
  });

  it('unmount mid-run aborts the request', () => {
    let signal: AbortSignal | undefined;
    runMock.mockImplementation((_id: string, s: AbortSignal) => {
      signal = s;
      return new Promise(() => undefined);
    });
    const { get, unmount } = mount();
    act(() => get().start());
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it('does nothing without an outfit id', () => {
    const { get } = mount(null);
    act(() => get().start());
    expect(runMock).not.toHaveBeenCalled();
  });
});

describe('toErrorCode', () => {
  it.each([
    [{ response: { status: 404 } }, 'not_found'],
    [{ response: { status: 429 } }, 'rate_limited'],
    [{ response: { status: 503 } }, 'server_error'],
    [{ code: 'ECONNABORTED' }, 'timeout'],
    [{ message: 'Network Error' }, 'network_error'],
  ])('%j → %s', (error, code) => {
    expect(toErrorCode(error)).toBe(code);
  });
});
