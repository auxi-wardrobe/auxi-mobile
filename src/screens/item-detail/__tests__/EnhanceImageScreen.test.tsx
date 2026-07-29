/**
 * AI Image Enhancement preview (EnhanceImage) — state machine coverage.
 *
 * Coverage:
 *  1. loading → ready       — nothing in flight → POST beautify, 2s poll,
 *                             candidate swaps in, hint + actions appear
 *  2. long-press compare    — hold shows the original, release restores
 *  3. timeout               — no `ready` within the budget → error copy +
 *                             Retry; Retry re-probes (attaches to a running
 *                             job, POSTs only when nothing is in flight)
 *  4. server failure        — status `failed` → generic error copy
 *  5. discard               — fires discardBeautify + goBack, no persistence
 *  6. replace original      — acceptBeautify → popTo ItemDetail with the
 *                             merged `enhancedItem` return param
 *  7. replace failure       — stays on the preview, actions re-enable
 *  8. back while loading    — resets the stack to a single Wardrobe root
 *  9. session start         — patches beautify_status onto the cached list
 * 10. loading design        — one sentence per 2s slot, checked off in turn
 *                             (3 rows = 6s), sequence never ends the wait
 * 11. leave-and-notify      — same Wardrobe reset, nothing discarded
 * 12. re-entry             — an existing ready candidate opens as a RESULT
 *                            (no second generation); a running job is joined
 * 13. regenerate           — spends an attempt, back to loading, capped at 5
 * 14. wardrobe origin      — accept/discard resolve back to the grid
 *
 * Patterns follow ItemDetailScreen.test.tsx (react-test-renderer, testID
 * queries, real en-EN copy). Fake timers drive the poll loop; microtask
 * flushes run the async interval callbacks.
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from '../../../components/design-system/lib';
import { theme } from '../../../theme/theme';
import { EnhanceImageScreen } from '../EnhanceImageScreen';

// ---- mocks ------------------------------------------------------------------

const mockGoBack = jest.fn();
const mockPopTo = jest.fn();
const mockReset = jest.fn();
const mockRouteParams: {
  itemId: string;
  displayUri: string;
  origin?: 'itemDetail' | 'wardrobe';
} = {
  itemId: 'item-1',
  displayUri: 'https://cdn.example/original.png',
};

jest.mock('@react-navigation/native', () => {
  const navigation = {
    goBack: (...args: unknown[]) => mockGoBack(...args),
    popTo: (...args: unknown[]) => mockPopTo(...args),
    reset: (...args: unknown[]) => mockReset(...args),
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

// The mount path chains several awaits (status probe → POST → poll), so a
// couple of microtask ticks isn't enough to settle it.
const flushPromises = async () => {
  await act(async () => {
    for (let i = 0; i < 8; i += 1) {
      await Promise.resolve();
    }
  });
};

/** Advance one poll tick (2s) and run the async interval callback. */
const pollTick = async () => {
  await act(async () => {
    jest.advanceTimersByTime(2000);
    for (let i = 0; i < 8; i += 1) {
      await Promise.resolve();
    }
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
  await flushPromises(); // settle the mount probe + any beautifyItem POST
  return { renderer, client };
};

/**
 * A loading row shows the green check once its own 2s slot is over; until then
 * it spins. Under the `.svg` jest stub both glyphs render as a bare View, so
 * the completed state is identified by the check's green `color` prop.
 */
const rowIsChecked = (root: ReactTestInstance, index: number): boolean =>
  oneByTestID(root, `enhance-loading-row-${index}`).findAll(
    n => n.props?.color === theme.colors.figmaToggleOn,
  ).length > 0;

const READY_STATUS = {
  status: 'ready',
  candidate_url: 'https://cdn.example/candidate.png',
  attempts: 1,
};
const PENDING_STATUS = { status: 'pending', attempts: 1 };
/** Nothing in flight — what the mount probe sees for a fresh enhance. */
const NONE_STATUS = { status: 'none', attempts: 0 };

/**
 * Mount-probe status first, then one value per poll tick (the last one
 * repeats). The screen asks the server what already exists before it spends a
 * generation, so every test has to say what that probe finds.
 */
const withStatuses = (probe: object, ...polls: object[]): void => {
  mockGetBeautifyStatus.mockResolvedValueOnce(probe);
  polls.forEach((status, index) => {
    if (index === polls.length - 1) {
      mockGetBeautifyStatus.mockResolvedValue(status);
    } else {
      mockGetBeautifyStatus.mockResolvedValueOnce(status);
    }
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  // clearAllMocks only clears calls — drop queued once-values too so a test
  // that leaves an unconsumed status can't leak it into the next one.
  mockGetBeautifyStatus.mockReset();
  mockRouteParams.origin = undefined; // default entry: ItemDetail's sparkle FAB
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
  withStatuses(NONE_STATUS, PENDING_STATUS, READY_STATUS);

  const { renderer: r } = await renderScreen();
  const root = r.root;

  // Nothing in flight → the probe falls through to a real generation.
  expect(mockBeautifyItem).toHaveBeenCalledWith('item-1');
  expect(mockTrack).toHaveBeenCalledWith('enhance_started', {
    item_id: 'item-1',
    mode: 'resume',
  });

  // Loading owns the body: progress rows + leave CTA, no preview/actions/hint
  expect(byTestID(root, 'enhance-loading-overlay').length).toBeGreaterThan(0);
  expect(byTestID(root, 'enhance-leave-btn').length).toBeGreaterThan(0);
  expect(byTestID(root, 'enhance-discard-btn').length).toBe(0);
  expect(byTestID(root, 'enhance-replace-btn').length).toBe(0);
  expect(byTestID(root, 'enhance-image-preview').length).toBe(0);
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
  expect(byTestID(root, 'enhance-regenerate-btn').length).toBeGreaterThan(0);
});

// =============================================================================
// 2. long-press compare
// =============================================================================
it('shows the original while long-pressed and restores the candidate on release', async () => {
  withStatuses(NONE_STATUS, READY_STATUS);

  const { renderer: r } = await renderScreen();
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
  withStatuses(NONE_STATUS, PENDING_STATUS);

  const { renderer: r } = await renderScreen();
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

  // Retry → back to loading. It re-probes first: the job is still running
  // server-side, so it attaches to that one rather than paying for a second
  // generation on top of it.
  act(() => oneByTestID(root, 'enhance-retry-btn').props.onPress());
  await flushPromises();
  expect(byTestID(root, 'enhance-loading-overlay').length).toBeGreaterThan(0);
  expect(mockBeautifyItem).toHaveBeenCalledTimes(1);
});

it('Retry does fire a fresh job once nothing is in flight', async () => {
  withStatuses(NONE_STATUS, { status: 'failed', attempts: 1 });

  const { renderer: r } = await renderScreen();
  await pollTick(); // → failed
  expect(mockBeautifyItem).toHaveBeenCalledTimes(1);

  act(() => oneByTestID(r.root, 'enhance-retry-btn').props.onPress());
  await flushPromises();
  expect(mockBeautifyItem).toHaveBeenCalledTimes(2);
  expect(byTestID(r.root, 'enhance-loading-overlay').length).toBeGreaterThan(0);
});

// =============================================================================
// 4. server-side failure
// =============================================================================
it('shows the generic error when the job resolves as failed', async () => {
  withStatuses(NONE_STATUS, { status: 'failed', attempts: 1 });

  const { renderer: r } = await renderScreen();
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
  withStatuses(NONE_STATUS, READY_STATUS);
  mockDiscardBeautify.mockResolvedValue({});

  const { renderer: r } = await renderScreen();
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
  withStatuses(NONE_STATUS, READY_STATUS);
  mockAcceptBeautify.mockResolvedValue({
    id: 'item-1',
    image_studio: 'https://cdn.example/studio.png',
  });

  const { renderer: r } = await renderScreen();
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
  withStatuses(NONE_STATUS, READY_STATUS);
  mockAcceptBeautify.mockRejectedValue(new Error('boom'));

  const { renderer: r } = await renderScreen();
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

// =============================================================================
// 8. back button while loading → Wardrobe, not ItemDetail
// =============================================================================
it('pressing back mid-generation resets the whole stack to a single Wardrobe root instead of going back to ItemDetail', async () => {
  withStatuses(NONE_STATUS, PENDING_STATUS);

  const { renderer: r } = await renderScreen();

  expect(byTestID(r.root, 'enhance-loading-overlay').length).toBeGreaterThan(
    0,
  );

  act(() => oneByTestID(r.root, 'enhance-back-btn').props.onPress());

  // A plain navigate would only pop to an existing Wardrobe route; if
  // ItemDetail was reached from Home (no Wardrobe in history yet) it would
  // instead PUSH a new instance on top, leaving ItemDetail/EnhanceImage
  // mounted underneath. `reset` is what guarantees a clean, full-screen
  // Wardrobe root and unmounts everything above it (stopping this screen's
  // own poll for good).
  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Wardrobe' }],
  });
  expect(mockGoBack).not.toHaveBeenCalled();
});

it('pressing back once ready still goes back to ItemDetail (unchanged)', async () => {
  withStatuses(NONE_STATUS, READY_STATUS);

  const { renderer: r } = await renderScreen();
  await pollTick();

  act(() => oneByTestID(r.root, 'enhance-back-btn').props.onPress());

  expect(mockGoBack).toHaveBeenCalled();
  expect(mockReset).not.toHaveBeenCalled();
});

// =============================================================================
// 9. starting a session invalidates the Wardrobe list cache immediately
// =============================================================================
it('patches beautify_status: pending onto the cached wardrobe item as soon as the job starts (no refetch)', async () => {
  withStatuses(NONE_STATUS, PENDING_STATUS);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  // Seed the Wardrobe list cache the way a real session would have it —
  // this test bypasses the shared renderScreen() helper to seed first.
  client.setQueryData(['wardrobe-items', 'All'], [
    { id: 'item-1', beautify_status: 'none' },
    { id: 'other-item', beautify_status: 'none' },
  ]);

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

  expect(client.getQueryData(['wardrobe-items', 'All'])).toEqual([
    { id: 'item-1', beautify_status: 'pending' },
    { id: 'other-item', beautify_status: 'none' },
  ]);
  // No network round trip needed for the badge to appear.
  expect(client.getQueryState(['wardrobe-items', 'All'])?.isInvalidated).toBe(
    false,
  );
});

// =============================================================================
// 10. loading design — one sentence per 2s slot (6s for all three)
// =============================================================================
it('reveals one loading sentence every 2s and checks each off at the end of its own slot', async () => {
  withStatuses(NONE_STATUS, PENDING_STATUS);

  const { renderer: r } = await renderScreen();
  const root = r.root;

  // t=0 — first sentence only, still in progress (spinner, no check).
  expect(byTestID(root, 'enhance-loading-row-0').length).toBeGreaterThan(0);
  expect(byTestID(root, 'enhance-loading-row-1').length).toBe(0);
  expect(rowIsChecked(root, 0)).toBe(false);

  await pollTick(); // t=2s
  expect(rowIsChecked(root, 0)).toBe(true);
  expect(byTestID(root, 'enhance-loading-row-1').length).toBeGreaterThan(0);
  expect(rowIsChecked(root, 1)).toBe(false);
  expect(byTestID(root, 'enhance-loading-row-2').length).toBe(0);

  await pollTick(); // t=4s
  expect(rowIsChecked(root, 1)).toBe(true);
  expect(byTestID(root, 'enhance-loading-row-2').length).toBeGreaterThan(0);
  expect(rowIsChecked(root, 2)).toBe(false);

  await pollTick(); // t=6s — the whole sequence is done
  expect(rowIsChecked(root, 2)).toBe(true);

  // The cosmetic sequence never ends the wait: still loading, still polling.
  await pollTick();
  expect(byTestID(root, 'enhance-loading-overlay').length).toBeGreaterThan(0);
  expect(byTestID(root, 'enhance-loading-row-2').length).toBeGreaterThan(0);
});

// =============================================================================
// 11. "Leave — notify me when ready" — job keeps running server-side
// =============================================================================
it('leaving from the loading screen resets to Wardrobe without discarding the job', async () => {
  withStatuses(NONE_STATUS, PENDING_STATUS);

  const { renderer: r } = await renderScreen();

  act(() => oneByTestID(r.root, 'enhance-leave-btn').props.onPress());

  expect(mockTrack).toHaveBeenCalledWith('enhance_left_waiting', {
    item_id: 'item-1',
  });
  // Same exit as the header back button mid-generation: a full stack reset to
  // Wardrobe, where the beautify-ready snackbar delivers the "we'll let you
  // know" promise. Nothing is cancelled or discarded.
  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Wardrobe' }],
  });
  expect(mockDiscardBeautify).not.toHaveBeenCalled();
  expect(mockGoBack).not.toHaveBeenCalled();
});

// =============================================================================
// 12. re-entry shows the existing result instead of generating again
// =============================================================================
it('opens straight on the ready result when a candidate already exists (no new job)', async () => {
  // What the user hits after "Leave — notify me when ready": they tap the
  // sparkle icon (or the tile / snackbar) again while the candidate is sitting
  // server-side. That must be a result view, not a second generation.
  withStatuses(READY_STATUS);

  const { renderer: r } = await renderScreen();
  const root = r.root;

  expect(mockBeautifyItem).not.toHaveBeenCalled();
  expect(mockTrack).toHaveBeenCalledWith('enhance_resumed', {
    item_id: 'item-1',
    state: 'ready',
  });
  expect(byTestID(root, 'enhance-loading-overlay').length).toBe(0);
  expect(
    root.findAll(
      n => n.props?.source?.uri === 'https://cdn.example/candidate.png',
    ).length,
  ).toBeGreaterThan(0);
  expect(byTestID(root, 'enhance-replace-btn').length).toBeGreaterThan(0);
});

it('attaches to a job that is still running instead of starting another', async () => {
  withStatuses(PENDING_STATUS, READY_STATUS);

  const { renderer: r } = await renderScreen();

  expect(mockBeautifyItem).not.toHaveBeenCalled();
  expect(mockTrack).toHaveBeenCalledWith('enhance_resumed', {
    item_id: 'item-1',
    state: 'pending',
  });
  expect(byTestID(r.root, 'enhance-loading-overlay').length).toBeGreaterThan(0);

  // Still a live poll — the running job lands on this screen when it finishes.
  await pollTick();
  expect(byTestID(r.root, 'enhance-loading-overlay').length).toBe(0);
});

// =============================================================================
// 13. Regenerate
// =============================================================================
it('Regenerate spends another attempt and goes back to the loading state', async () => {
  withStatuses(READY_STATUS);

  const { renderer: r } = await renderScreen();
  act(() => oneByTestID(r.root, 'enhance-regenerate-btn').props.onPress());
  await flushPromises();

  expect(mockTrack).toHaveBeenCalledWith('enhance_regenerated', {
    item_id: 'item-1',
    attempt: 2, // READY_STATUS reported one attempt already spent
  });
  // Regenerate skips the probe — it always fires a new job over the candidate.
  expect(mockBeautifyItem).toHaveBeenCalledWith('item-1');
  expect(mockTrack).toHaveBeenCalledWith('enhance_started', {
    item_id: 'item-1',
    mode: 'regenerate',
  });
  expect(byTestID(r.root, 'enhance-loading-overlay').length).toBeGreaterThan(0);
});

it('stops offering Regenerate once the attempt cap is spent', async () => {
  withStatuses({ ...READY_STATUS, attempts: 5 });

  const { renderer: r } = await renderScreen();

  expect(byTestID(r.root, 'enhance-regenerate-btn').length).toBe(0);
  const capped = oneByTestID(r.root, 'enhance-regenerate-btn-capped');
  expect(capped.props.disabled).toBe(true);
  expect(capped.props.title).toBe('Keep the best one');

  act(() => capped.props.onPress());
  expect(mockBeautifyItem).not.toHaveBeenCalled();
});

// =============================================================================
// 14. wardrobe entry points resolve back to the grid
// =============================================================================
it('accepting from a Wardrobe entry returns to the grid instead of popping to ItemDetail', async () => {
  mockRouteParams.origin = 'wardrobe';
  withStatuses(READY_STATUS);
  mockAcceptBeautify.mockResolvedValue({
    id: 'item-1',
    image_studio: 'https://cdn.example/studio.png',
  });

  const { renderer: r, client } = await renderScreen();

  await act(async () => {
    oneByTestID(r.root, 'enhance-replace-btn').props.onPress();
    await Promise.resolve();
  });
  await flushPromises();

  expect(mockAcceptBeautify).toHaveBeenCalledWith('item-1');
  // No ItemDetail underneath (tile / snackbar / push) — reset to the grid.
  expect(mockPopTo).not.toHaveBeenCalled();
  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Wardrobe' }],
  });
  expect(client.getQueryState(['wardrobe-items', 'All'])).toBeUndefined();
});

it('discarding from a Wardrobe entry keeps the original and returns to the grid', async () => {
  mockRouteParams.origin = 'wardrobe';
  withStatuses(READY_STATUS);
  mockDiscardBeautify.mockResolvedValue({});

  const { renderer: r } = await renderScreen();

  act(() => oneByTestID(r.root, 'enhance-discard-btn').props.onPress());

  expect(mockDiscardBeautify).toHaveBeenCalledWith('item-1');
  expect(mockAcceptBeautify).not.toHaveBeenCalled();
  expect(mockReset).toHaveBeenCalledWith({
    index: 0,
    routes: [{ name: 'Wardrobe' }],
  });
  expect(mockGoBack).not.toHaveBeenCalled();
});
