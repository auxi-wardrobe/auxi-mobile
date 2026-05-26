/* eslint-env jest */
/**
 * Deferred-completion contract (Phase 0 architecture decision + Phase 5 fix).
 *
 *  - OnboardingCompleted: "Continue" navigates to Outro and does NOT call
 *    completeOnboarding() (is_first_login stays true through Completed).
 *  - OnboardingOutro: "See my outfit" DOES call completeOnboarding(), and
 *    fires track('onboarding_completed') AFTER completeOnboarding RESOLVES
 *    (ordering matters — must emit exactly once, at true completion). On
 *    rejection, the event must NOT fire and the CTA re-enables.
 *
 * AuthContext + analytics are mocked; navigation file-locally. We assert the
 * call ORDER via mock.invocationCallOrder (same technique as the analytics
 * identify-before-People test).
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';

const mockNavigate = jest.fn();
const SELECTION = {
  wardrobe_direction: 'Womenswear' as const,
  fit_preference: 'Slim Fit' as const,
  style_preferences: ['Soft' as const, 'Formal' as const],
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: { selection: SELECTION } }),
}));

const mockCompleteOnboarding = jest.fn();
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ completeOnboarding: mockCompleteOnboarding }),
}));

const mockTrack = jest.fn();
jest.mock('../../../services/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

import { OnboardingOutroScreen } from '../OnboardingOutroScreen';
import { OnboardingCompletedScreen } from '../OnboardingCompletedScreen';

const byTestID = (root: ReactTestInstance, id: string): ReactTestInstance[] =>
  root.findAll(n => n.props?.testID === id);
const oneByTestID = (
  root: ReactTestInstance,
  id: string,
): ReactTestInstance => {
  const m = byTestID(root, id);
  if (m.length === 0) throw new Error(`no node with testID="${id}"`);
  return m[0];
};

const liveRenderers: TestRenderer.ReactTestRenderer[] = [];
const render = (el: React.ReactElement) => {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(el);
  });
  liveRenderers.push(renderer);
  return renderer;
};
const flush = async () =>
  act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

beforeEach(() => jest.clearAllMocks());
afterEach(() => {
  liveRenderers.splice(0).forEach(r => {
    try {
      act(() => r.unmount());
    } catch {
      // already unmounted
    }
  });
});

describe('OnboardingCompletedScreen — does NOT complete onboarding', () => {
  it('Continue navigates to Outro and never calls completeOnboarding', () => {
    const { root } = render(<OnboardingCompletedScreen />);
    act(() => {
      oneByTestID(root, 'onboarding-completed-continue').props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith('OnboardingOutro', {
      selection: SELECTION,
    });
    expect(mockCompleteOnboarding).not.toHaveBeenCalled();
  });
});

describe('OnboardingOutroScreen — the only completion point', () => {
  it('See my outfit calls completeOnboarding, then fires onboarding_completed AFTER it resolves', async () => {
    mockCompleteOnboarding.mockResolvedValue(undefined);
    const { root } = render(<OnboardingOutroScreen />);

    await act(async () => {
      oneByTestID(root, 'onboarding-outro-see-outfit').props.onPress();
      await Promise.resolve();
    });
    await flush();

    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('onboarding_completed', {
      styles_selected: 2,
      wardrobe_direction: 'Womenswear',
      fit_preference: 'Slim Fit',
    });
    // ordering: track fires AFTER completeOnboarding (Phase 5 fix)
    expect(mockCompleteOnboarding.mock.invocationCallOrder[0]).toBeLessThan(
      mockTrack.mock.invocationCallOrder[0],
    );
  });

  it('on completeOnboarding rejection: track NOT fired + CTA re-enabled for retry', async () => {
    mockCompleteOnboarding.mockRejectedValue(new Error('network'));
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { root } = render(<OnboardingOutroScreen />);

    await act(async () => {
      oneByTestID(root, 'onboarding-outro-see-outfit').props.onPress();
      await Promise.resolve();
    });
    await flush();

    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
    expect(mockTrack).not.toHaveBeenCalled();
    // CTA re-enabled (isFinishing reset) so the user can retry
    expect(
      oneByTestID(root, 'onboarding-outro-see-outfit').props.disabled,
    ).toBe(false);
    errSpy.mockRestore();
  });

  it('ignores re-taps while finishing (single completeOnboarding call)', async () => {
    // never-resolving promise keeps isFinishing=true so a 2nd tap is a no-op
    mockCompleteOnboarding.mockReturnValue(new Promise(() => {}));
    const { root } = render(<OnboardingOutroScreen />);

    act(() => {
      oneByTestID(root, 'onboarding-outro-see-outfit').props.onPress();
    });
    act(() => {
      oneByTestID(root, 'onboarding-outro-see-outfit').props.onPress();
    });

    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
  });
});
