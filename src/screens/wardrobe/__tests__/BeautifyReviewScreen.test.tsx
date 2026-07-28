/**
 * BeautifyReviewScreen — accept/discard/regenerate the AI studio-shot
 * candidate. "Accept" and "Keep original" both exit via `done()`, which
 * must reset the whole stack to a single Wardrobe root (not a plain
 * `navigate`) — see beautify-status.ts#goToWardrobe.
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BeautifyReviewScreen } from '../BeautifyReviewScreen';

// ---- mocks ------------------------------------------------------------------

const mockReset = jest.fn();
const mockReplace = jest.fn();
const mockRouteParams: { itemId: string; originalUri: string; from?: string } =
  {
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
const mockAcceptBeautify = jest.fn();
const mockDiscardBeautify = jest.fn();
const mockBeautifyItem = jest.fn();

jest.mock('../../../services/wardrobeService', () => ({
  wardrobeService: {
    getBeautifyStatus: (...args: unknown[]) => mockGetBeautifyStatus(...args),
    acceptBeautify: (...args: unknown[]) => mockAcceptBeautify(...args),
    discardBeautify: (...args: unknown[]) => mockDiscardBeautify(...args),
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

const liveRenderers: TestRenderer.ReactTestRenderer[] = [];

const renderScreen = async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <QueryClientProvider client={client}>
        <BeautifyReviewScreen />
      </QueryClientProvider>,
    );
  });
  liveRenderers.push(renderer);
  await flushPromises(); // settle the mount-effect getBeautifyStatus fetch
  return renderer;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams.from = undefined;
  mockGetBeautifyStatus.mockResolvedValue({
    status: 'ready',
    candidate_url: 'https://cdn.example/candidate.png',
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
});

// =============================================================================
// 1. Accept → resets the whole stack to a single Wardrobe root
// =============================================================================
it('Accept & save resets the whole stack to Wardrobe, not a plain navigate', async () => {
  mockAcceptBeautify.mockResolvedValue({});
  const r = await renderScreen();

  await act(async () => {
    oneByTestID(r.root, 'beautify-review-accept').props.onPress();
    await Promise.resolve();
  });
  await flushPromises();

  expect(mockAcceptBeautify).toHaveBeenCalledWith('item-1');
  expect(mockTrack).toHaveBeenCalledWith('beautify_accepted');
  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Wardrobe' }],
  });
});

// =============================================================================
// 2. Keep original → same reset exit
// =============================================================================
it('Keep original resets the whole stack to Wardrobe', async () => {
  mockDiscardBeautify.mockResolvedValue({});
  const r = await renderScreen();

  await act(async () => {
    oneByTestID(r.root, 'beautify-review-keep-original').props.onPress();
    await Promise.resolve();
  });
  await flushPromises();

  expect(mockDiscardBeautify).toHaveBeenCalledWith('item-1');
  expect(mockTrack).toHaveBeenCalledWith('beautify_kept_original');
  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Wardrobe' }],
  });
});

// =============================================================================
// 3. Regenerate → still replaces into BeautifyPending (unchanged)
// =============================================================================
it('Regenerate replaces into BeautifyPending and does not touch the stack reset', async () => {
  mockBeautifyItem.mockResolvedValue({ job_id: 'j2', status: 'pending' });
  const r = await renderScreen();

  await act(async () => {
    oneByTestID(r.root, 'beautify-review-regenerate').props.onPress();
    await Promise.resolve();
  });
  await flushPromises();

  expect(mockBeautifyItem).toHaveBeenCalledWith('item-1');
  expect(mockReplace).toHaveBeenCalledWith('BeautifyPending', {
    itemId: 'item-1',
    originalUri: 'https://cdn.example/original.png',
  });
  expect(mockReset).not.toHaveBeenCalled();
});

// =============================================================================
// 4. Accept failure → stays on the review screen, no navigation
// =============================================================================
it('stays on review and re-enables actions when accept fails', async () => {
  mockAcceptBeautify.mockRejectedValue(new Error('boom'));
  const r = await renderScreen();

  await act(async () => {
    oneByTestID(r.root, 'beautify-review-accept').props.onPress();
    await Promise.resolve();
  });
  await flushPromises();

  expect(mockReset).not.toHaveBeenCalled();
  expect(oneByTestID(r.root, 'beautify-review-accept').props.disabled).toBe(
    false,
  );
});

// =============================================================================
// 5. mount fetches the candidate for the "After" preview
// =============================================================================
it('fetches the beautify status on mount to render the candidate preview', async () => {
  const r = await renderScreen();

  expect(mockGetBeautifyStatus).toHaveBeenCalledWith('item-1');
  expect(
    r.root.findAll(
      n => n.props?.source?.uri === 'https://cdn.example/candidate.png',
    ).length,
  ).toBeGreaterThan(0);
});
