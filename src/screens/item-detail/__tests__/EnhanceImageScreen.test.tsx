/**
 * AI Image Enhancement preview (EnhanceImage) — state machine coverage.
 *
 * Coverage:
 *  1. loading → ready       — POST beautify on mount, 2s poll, candidate
 *                             swaps in, compare hint appears, actions enable
 *  2. long-press compare    — hold shows the original, release restores
 *  3. timeout               — no `ready` within 15s → error copy + Retry;
 *                             Retry starts a NEW session (fresh POST)
 *  4. server failure        — status `failed` → generic error copy
 *  5. discard               — fires discardBeautify + goBack, no persistence
 *  6. replace original      — acceptBeautify → popTo ItemDetail with the
 *                             merged `enhancedItem` return param
 *  7. replace failure       — stays on the preview, actions re-enable
 *
 * Patterns follow ItemDetailScreen.test.tsx (react-test-renderer, testID
 * queries, real en-EN copy). Fake timers drive the poll loop; microtask
 * flushes run the async interval callbacks.
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from '../../../components/design-system/lib';
import { EnhanceImageScreen } from '../EnhanceImageScreen';

// ---- mocks ------------------------------------------------------------------

const mockGoBack = jest.fn();
const mockPopTo = jest.fn();
const mockRouteParams = {
  itemId: 'item-1',
  displayUri: 'https://cdn.example/original.png',
};

jest.mock('@react-navigation/native', () => {
  const navigation = {
    goBack: (...args: unknown[]) => mockGoBack(...args),
    popTo: (...args: unknown[]) => mockPopTo(...args),
  };
  return {
    useNavigation: () => navigation,
    useRoute: () => ({ params: mockRouteParams }),
  };
});

jest.mock('react-i18next', () => {
  const en = require('../../../translations/en-EN.json').boilerplate;
  const t = (key: string) =>
    key
      .split('.')
      .reduce<unknown>(
        (acc, part) =>
          acc && typeof acc === 'object'
            ? (acc as Record<string, unknown>)[part]
            : undefined,
        en,
      ) ?? key;
  const translation = { t };
  return { useTranslation: () => translation };
});

const mockBeautifyItem = jest.fn();
const mockGetBeautifyStatus = jest.fn();
const mockAcceptBeautify = jest.fn();
const mockDiscardBeautify = jest.fn();

jest.mock('../../../services/wardrobeService', () => ({
  wardrobeService: {
    beautifyItem: (...args: unknown[]) => mockBeautifyItem(...args),
    getBeautifyStatus: (...args: unknown[]) => mockGetBeautifyStatus(...args),
    acceptBeautify: (...args: unknown[]) => mockAcceptBeautify(...args),
    discardBeautify: (...args: unknown[]) => mockDiscardBeautify(...args),
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

// Cuts the utils/url → apiClient → react-native-keychain import chain.
jest.mock('../../../utils/url', () => ({
  getImageUrl: (url?: string | null) => url ?? undefined,
}));

const mockedToastShow = (toast as unknown as { show: jest.Mock }).show;

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

/** Advance one poll tick (2s) and run the async interval callback. */
const pollTick = async () => {
  await act(async () => {
    jest.advanceTimersByTime(2000);
    await Promise.resolve();
    await Promise.resolve();
  });
};

const liveRenderers: TestRenderer.ReactTestRenderer[] = [];

const renderScreen = async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <QueryClientProvider client={client}>
        <EnhanceImageScreen />
      </QueryClientProvider>,
    );
  });
  liveRenderers.push(renderer);
  await flushPromises(); // settle the mount-effect beautifyItem POST
  return renderer;
};

const READY_STATUS = {
  status: 'ready',
  candidate_url: 'https://cdn.example/candidate.png',
  attempts: 1,
};
const PENDING_STATUS = { status: 'pending', attempts: 1 };

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockBeautifyItem.mockResolvedValue({
    job_id: 'j-1',
    status: 'pending',
    attempts: 1,
  });
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
// 1. loading → ready
// =============================================================================
it('polls until ready, then swaps to the candidate and enables both actions', async () => {
  mockGetBeautifyStatus
    .mockResolvedValueOnce(PENDING_STATUS)
    .mockResolvedValueOnce(READY_STATUS);

  const r = await renderScreen();
  const root = r.root;

  expect(mockBeautifyItem).toHaveBeenCalledWith('item-1');
  expect(mockTrack).toHaveBeenCalledWith('enhance_started', {
    item_id: 'item-1',
  });

  // Loading: overlay + copy shown, both actions disabled, no compare hint
  expect(byTestID(root, 'enhance-loading-overlay').length).toBeGreaterThan(0);
  expect(oneByTestID(root, 'enhance-discard-btn').props.disabled).toBe(true);
  expect(oneByTestID(root, 'enhance-replace-btn').props.disabled).toBe(true);
  expect(byTestID(root, 'enhance-compare-hint').length).toBe(0);

  await pollTick(); // → pending
  expect(byTestID(root, 'enhance-loading-overlay').length).toBeGreaterThan(0);

  await pollTick(); // → ready
  expect(byTestID(root, 'enhance-loading-overlay').length).toBe(0);
  expect(mockTrack).toHaveBeenCalledWith(
    'enhance_completed',
    expect.objectContaining({ item_id: 'item-1' }),
  );

  // Candidate renders, hint appears, actions enable
  expect(
    root.findAll(
      n => n.props?.source?.uri === 'https://cdn.example/candidate.png',
    ).length,
  ).toBeGreaterThan(0);
  expect(byTestID(root, 'enhance-compare-hint').length).toBeGreaterThan(0);
  expect(oneByTestID(root, 'enhance-discard-btn').props.disabled).toBe(false);
  expect(oneByTestID(root, 'enhance-replace-btn').props.disabled).toBe(false);
});

// =============================================================================
// 2. long-press compare
// =============================================================================
it('shows the original while long-pressed and restores the candidate on release', async () => {
  mockGetBeautifyStatus.mockResolvedValue(READY_STATUS);

  const r = await renderScreen();
  await pollTick();
  const root = r.root;

  const showsUri = (uri: string) =>
    root.findAll(n => n.props?.source?.uri === uri).length > 0;

  expect(showsUri('https://cdn.example/candidate.png')).toBe(true);

  const preview = oneByTestID(root, 'enhance-image-preview');
  act(() => preview.props.onLongPress());
  expect(showsUri('https://cdn.example/original.png')).toBe(true);
  expect(showsUri('https://cdn.example/candidate.png')).toBe(false);

  act(() => preview.props.onPressOut());
  expect(showsUri('https://cdn.example/candidate.png')).toBe(true);
});

// =============================================================================
// 3. timeout → Retry restarts a fresh session
// =============================================================================
it('times out past the 3min wait budget, shows the timeout copy, and Retry re-fires the request', async () => {
  mockGetBeautifyStatus.mockResolvedValue(PENDING_STATUS);

  const r = await renderScreen();
  const root = r.root;

  for (let i = 0; i < 91; i += 1) {
    await pollTick(); // 91 × 2s = 182s > 180s (3min) timeout
  }

  expect(mockTrack).toHaveBeenCalledWith('enhance_failed', {
    item_id: 'item-1',
    reason: 'timeout',
  });
  expect(oneByTestID(root, 'enhance-error-message').props.children).toBe(
    'Enhancement is taking longer than expected.',
  );

  // Retry → new session, new POST, back to loading
  act(() => oneByTestID(root, 'enhance-retry-btn').props.onPress());
  await flushPromises();
  expect(mockBeautifyItem).toHaveBeenCalledTimes(2);
  expect(byTestID(root, 'enhance-loading-overlay').length).toBeGreaterThan(0);
});

// =============================================================================
// 4. server-side failure
// =============================================================================
it('shows the generic error when the job resolves as failed', async () => {
  mockGetBeautifyStatus.mockResolvedValue({ status: 'failed', attempts: 1 });

  const r = await renderScreen();
  await pollTick();

  expect(mockTrack).toHaveBeenCalledWith('enhance_failed', {
    item_id: 'item-1',
    reason: 'server_error',
  });
  expect(
    oneByTestID(r.root, 'enhance-error-message').props.children,
  ).toBe("Couldn't enhance the image. Please try again.");
});

// =============================================================================
// 5. discard
// =============================================================================
it('Discard drops the candidate and returns to Item Detail', async () => {
  mockGetBeautifyStatus.mockResolvedValue(READY_STATUS);
  mockDiscardBeautify.mockResolvedValue({});

  const r = await renderScreen();
  await pollTick();

  act(() => oneByTestID(r.root, 'enhance-discard-btn').props.onPress());

  expect(mockDiscardBeautify).toHaveBeenCalledWith('item-1');
  expect(mockTrack).toHaveBeenCalledWith('enhance_discarded', {
    item_id: 'item-1',
  });
  expect(mockGoBack).toHaveBeenCalled();
  expect(mockAcceptBeautify).not.toHaveBeenCalled();
});

// =============================================================================
// 6. replace original
// =============================================================================
it('Replace original accepts the candidate and pops back with the merged result', async () => {
  mockGetBeautifyStatus.mockResolvedValue(READY_STATUS);
  mockAcceptBeautify.mockResolvedValue({
    id: 'item-1',
    image_studio: 'https://cdn.example/studio.png',
  });

  const r = await renderScreen();
  await pollTick();

  await act(async () => {
    oneByTestID(r.root, 'enhance-replace-btn').props.onPress();
    await Promise.resolve();
  });
  await flushPromises();

  expect(mockAcceptBeautify).toHaveBeenCalledWith('item-1');
  expect(mockTrack).toHaveBeenCalledWith('enhance_applied', {
    item_id: 'item-1',
  });
  expect(mockedToastShow).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'success' }),
  );
  expect(mockPopTo).toHaveBeenCalledWith(
    'ItemDetail',
    {
      itemId: 'item-1',
      enhancedItem: {
        id: 'item-1',
        image_studio: 'https://cdn.example/studio.png',
        beautify_status: 'accepted',
      },
    },
    { merge: true },
  );
});

// =============================================================================
// 7. replace failure — candidate preserved, actions re-enable
// =============================================================================
it('stays on the preview with actions re-enabled when saving fails', async () => {
  mockGetBeautifyStatus.mockResolvedValue(READY_STATUS);
  mockAcceptBeautify.mockRejectedValue(new Error('boom'));

  const r = await renderScreen();
  await pollTick();

  await act(async () => {
    oneByTestID(r.root, 'enhance-replace-btn').props.onPress();
    await Promise.resolve();
  });
  await flushPromises();

  expect(mockPopTo).not.toHaveBeenCalled();
  expect(mockGoBack).not.toHaveBeenCalled();
  expect(mockTrack).toHaveBeenCalledWith('enhance_apply_failed', {
    item_id: 'item-1',
  });
  expect(mockedToastShow).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'error' }),
  );
  // Candidate still previewed, Replace enabled for another attempt
  expect(
    r.root.findAll(
      n => n.props?.source?.uri === 'https://cdn.example/candidate.png',
    ).length,
  ).toBeGreaterThan(0);
  expect(oneByTestID(r.root, 'enhance-replace-btn').props.disabled).toBe(
    false,
  );
});
