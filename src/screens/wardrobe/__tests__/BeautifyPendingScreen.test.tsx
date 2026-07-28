/**
 * BeautifyPendingScreen — "in progress" screen for a beautify job.
 *
 * The screen has no header (headerShown: false, gestureEnabled: false in
 * AppNavigator), so "Continue browsing" is the ONLY way to leave while
 * still pending. It must fully unmount on exit — this screen owns a 10s
 * poll (BEAUTIFY_POLL_MS) plus a 1s elapsed-time tick, and if it stays
 * mounted (a plain `navigate('Wardrobe')` isn't guaranteed to pop it off
 * the stack — see beautify-status.ts#goToWardrobe), the poll keeps firing
 * and can even auto-redirect into BeautifyReview from underneath whatever
 * screen is currently visible.
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BeautifyPendingScreen } from '../BeautifyPendingScreen';

// ---- mocks ------------------------------------------------------------------

const mockReset = jest.fn();
const mockReplace = jest.fn();
const mockRouteParams = {
  itemId: 'item-1',
  originalUri: 'https://cdn.example/original.png',
};

jest.mock('@react-navigation/native', () => {
  const navigation = {
    reset: (...args: unknown[]) => mockReset(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  };
  return {
    useNavigation: () => navigation,
    useRoute: () => ({ params: mockRouteParams }),
  };
});

const mockGetBeautifyStatus = jest.fn();
const mockBeautifyItem = jest.fn();

jest.mock('../../../services/wardrobeService', () => ({
  wardrobeService: {
    getBeautifyStatus: (...args: unknown[]) => mockGetBeautifyStatus(...args),
    beautifyItem: (...args: unknown[]) => mockBeautifyItem(...args),
  },
  wardrobeKeys: {
    all: ['wardrobe-items'],
    list: (f: string = 'All') => ['wardrobe-items', f],
  },
}));

const mockTrack = jest.fn();
jest.mock('../../../services/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

// ---- helpers ----------------------------------------------------------------

const byTestID = (root: ReactTestInstance, id: string): ReactTestInstance[] =>
  root.findAll(n => n.props?.testID === id);

const oneByTestID = (
  root: ReactTestInstance,
  id: string,
): ReactTestInstance => {
  const matches = byTestID(root, id);
  if (matches.length === 0) {
    throw new Error(`no node with testID="${id}"`);
  }
  return matches[0];
};

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

/** Advance one status-poll tick (10s) and run the async interval callback. */
const pollTick = async () => {
  await act(async () => {
    jest.advanceTimersByTime(10000);
    await Promise.resolve();
    await Promise.resolve();
  });
};

const liveRenderers: TestRenderer.ReactTestRenderer[] = [];

const renderScreen = async (client: QueryClient = new QueryClient()) => {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <QueryClientProvider client={client}>
        <BeautifyPendingScreen />
      </QueryClientProvider>,
    );
  });
  liveRenderers.push(renderer);
  await flushPromises();
  return renderer;
};

const PENDING_STATUS = { status: 'pending', attempts: 1 };
const READY_STATUS = {
  status: 'ready',
  candidate_url: 'https://cdn.example/candidate.png',
  attempts: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockGetBeautifyStatus.mockResolvedValue(PENDING_STATUS);
});

afterEach(() => {
  liveRenderers.splice(0).forEach(r => {
    try {
      act(() => r.unmount());
    } catch {
      // already unmounted
    }
  });
  jest.useRealTimers();
});

// =============================================================================
// 1. Continue browsing → reset to Wardrobe, not a plain navigate
// =============================================================================
it('"Continue browsing" resets the whole stack to a single Wardrobe root', async () => {
  const r = await renderScreen();

  act(() => oneByTestID(r.root, 'beautify-pending-continue').props.onPress());

  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Wardrobe' }],
  });
  expect(mockTrack).toHaveBeenCalledWith('beautify_wait_continued_browsing');
});

// =============================================================================
// 2. Unmounting stops the poll for good
// =============================================================================
it('stops polling getBeautifyStatus once unmounted (e.g. after the stack reset above)', async () => {
  const r = await renderScreen();

  await pollTick();
  const callsBeforeUnmount = mockGetBeautifyStatus.mock.calls.length;
  expect(callsBeforeUnmount).toBeGreaterThan(0);

  act(() => {
    r.unmount();
  });
  liveRenderers.pop(); // already unmounted here, don't double-unmount in afterEach

  await act(async () => {
    jest.advanceTimersByTime(10000 * 5); // well past several poll intervals
    await Promise.resolve();
  });

  expect(mockGetBeautifyStatus.mock.calls.length).toBe(callsBeforeUnmount);
});

// =============================================================================
// 3. ready → replaces into BeautifyReview (unchanged existing behavior)
// =============================================================================
it('replaces into BeautifyReview once the job is ready', async () => {
  mockGetBeautifyStatus.mockResolvedValue(READY_STATUS);
  await renderScreen();

  await pollTick();

  expect(mockReplace).toHaveBeenCalledWith('BeautifyReview', {
    itemId: 'item-1',
    originalUri: 'https://cdn.example/original.png',
    from: 'loader',
  });
  expect(mockTrack).toHaveBeenCalledWith('beautify_ready');
});

// =============================================================================
// 4. failed → "Keep original" also resets to Wardrobe
// =============================================================================
it('"Keep original" on the failed state resets the whole stack to Wardrobe', async () => {
  mockGetBeautifyStatus.mockResolvedValue({ status: 'failed', attempts: 1 });
  const r = await renderScreen();

  await pollTick();
  expect(byTestID(r.root, 'beautify-pending-failed').length).toBeGreaterThan(
    0,
  );

  act(() => oneByTestID(r.root, 'beautify-pending-keep').props.onPress());

  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Wardrobe' }],
  });
});

// =============================================================================
// 5. failed → "Try again" re-marks the item pending in the cache
// =============================================================================
it('"Try again" re-patches beautify_status: pending onto the cached item', async () => {
  mockGetBeautifyStatus.mockResolvedValue({ status: 'failed', attempts: 1 });
  mockBeautifyItem.mockResolvedValue({ job_id: 'j2', status: 'pending' });
  const client = new QueryClient();
  client.setQueryData(['wardrobe-items', 'All'], [
    { id: 'item-1', beautify_status: 'failed' },
  ]);

  const r = await renderScreen(client);
  await pollTick();
  expect(byTestID(r.root, 'beautify-pending-failed').length).toBeGreaterThan(
    0,
  );

  await act(async () => {
    await oneByTestID(r.root, 'beautify-pending-retry').props.onPress();
  });
  await flushPromises();

  expect(mockBeautifyItem).toHaveBeenCalledWith('item-1');
  expect(client.getQueryData(['wardrobe-items', 'All'])).toEqual([
    { id: 'item-1', beautify_status: 'pending' },
  ]);
});
