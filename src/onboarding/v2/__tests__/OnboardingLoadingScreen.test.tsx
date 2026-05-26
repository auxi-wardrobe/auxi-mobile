/* eslint-env jest */
/**
 * OnboardingLoadingScreen — owns the /generate mutation (D10). Phase 6
 * integration scope (mutation mocked at the v05Api boundary; no network):
 *  1. fires generateStarterWardrobe() exactly once on mount.
 *  2. success → navigation.replace('OnboardingCompleted', { selection }).
 *  3. error → renders the retry block (onboarding-loading-error / -retry).
 *  4. CRITICAL: does NOT call completeOnboarding() (deferred to Outro).
 *
 * useMutation requires a QueryClientProvider — wrap with a retry-disabled
 * client so the rejected path resolves to isError immediately. v05Api +
 * AuthContext are mocked; navigation is mocked file-locally.
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockReplace = jest.fn();
const mockNavigate = jest.fn();
const SELECTION = {
  wardrobe_direction: 'Menswear' as const,
  fit_preference: 'Classic Fit' as const,
  style_preferences: ['Minimal' as const, 'Bold' as const],
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockReplace, navigate: mockNavigate }),
  useRoute: () => ({ params: { selection: SELECTION } }),
}));

const mockGenerate = jest.fn();
jest.mock('../../../services/v05Api', () => ({
  generateStarterWardrobe: (...args: unknown[]) => mockGenerate(...args),
}));

// Guard the deferred-completion contract: completeOnboarding must NOT be
// reachable from Loading. Spy on the seam so any call would be visible.
const mockCompleteOnboarding = jest.fn();
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ completeOnboarding: mockCompleteOnboarding }),
}));

import { OnboardingLoadingScreen } from '../OnboardingLoadingScreen';

const byTestID = (root: ReactTestInstance, id: string): ReactTestInstance[] =>
  root.findAll(n => n.props?.testID === id);

const makeClient = () =>
  new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

const liveRenderers: TestRenderer.ReactTestRenderer[] = [];
const renderScreen = async () => {
  const client = makeClient();
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <QueryClientProvider client={client}>
        <OnboardingLoadingScreen />
      </QueryClientProvider>,
    );
  });
  liveRenderers.push(renderer);
  // settle the mount effect (mutate) + mutation resolution. The rejected
  // path needs a few extra microtask drains for TanStack Query to flip
  // isError and notify the observer (→ re-render with the error block).
  await flushMutation();
  return renderer;
};

/**
 * Drain mutation state → re-render. TanStack Query batches observer
 * notifications through a timer-based notifyManager, so under fake timers we
 * must BOTH flush microtasks (mutationFn promise) AND run the pending timers
 * (the batched notify that flips isError/isSuccess → re-render).
 */
const flushMutation = async () => {
  for (let i = 0; i < 5; i += 1) {
    await act(async () => {
      await Promise.resolve();
      jest.runOnlyPendingTimers();
    });
  }
};

beforeEach(() => {
  jest.clearAllMocks();
  // LoadingRow runs an infinite Animated.loop; fake timers keep it from
  // leaving an open handle that blocks act() from settling.
  jest.useFakeTimers();
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

describe('OnboardingLoadingScreen — generate on mount', () => {
  it('fires generateStarterWardrobe exactly once with the selection payload', async () => {
    mockGenerate.mockResolvedValue({ wardrobe_items: [] });
    await renderScreen();
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockGenerate).toHaveBeenCalledWith({
      wardrobe_direction: 'Menswear',
      fit_preference: 'Classic Fit',
      style_preferences: ['Minimal', 'Bold'],
    });
  });

  it('success → navigation.replace to OnboardingCompleted with the same selection', async () => {
    mockGenerate.mockResolvedValue({ wardrobe_items: [] });
    await renderScreen();
    expect(mockReplace).toHaveBeenCalledWith('OnboardingCompleted', {
      selection: SELECTION,
    });
  });

  it('does NOT call completeOnboarding (deferred-completion contract)', async () => {
    mockGenerate.mockResolvedValue({ wardrobe_items: [] });
    await renderScreen();
    expect(mockCompleteOnboarding).not.toHaveBeenCalled();
  });
});

describe('OnboardingLoadingScreen — error path', () => {
  it('renders the error/retry block and does NOT navigate on failure', async () => {
    mockGenerate.mockRejectedValue({
      response: { status: 422, data: { error: 'pool_insufficient' } },
    });
    const r = await renderScreen();
    const root = r.root;

    expect(byTestID(root, 'onboarding-loading-error').length).toBeGreaterThan(
      0,
    );
    expect(byTestID(root, 'onboarding-loading-retry').length).toBeGreaterThan(
      0,
    );
    // the loading rows are replaced by the error block
    expect(byTestID(root, 'onboarding-loading-view').length).toBe(0);
    // failed generate → no advance to Completed
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('retry re-runs the mutation', async () => {
    mockGenerate.mockRejectedValueOnce({ response: { status: 400 } });
    const r = await renderScreen();
    const root = r.root;

    expect(mockGenerate).toHaveBeenCalledTimes(1);

    // second attempt succeeds → replace to Completed
    mockGenerate.mockResolvedValueOnce({ wardrobe_items: [] });
    await act(async () => {
      byTestID(root, 'onboarding-loading-retry')[0].props.onPress();
    });
    await flushMutation();

    expect(mockGenerate).toHaveBeenCalledTimes(2);
    expect(mockReplace).toHaveBeenCalledWith('OnboardingCompleted', {
      selection: SELECTION,
    });
  });
});
