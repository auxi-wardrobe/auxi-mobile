/* eslint-env jest */
/**
 * OnboardingWardrobeScreen (Step 1) + OnboardingFitScreen (Step 2) —
 * Continue gating + correct wire-value forwarding (Phase 6 unit scope).
 *
 *  Wardrobe: Continue disabled until a tile is picked; forwards the wire
 *            `wardrobe_direction` to OnboardingFit.
 *  Fit:      Continue disabled until a tile is picked; forwards the WIRE value
 *            (UI "Regular" → `Classic Fit`, D2) — never the display label.
 *
 * react-test-renderer + testID querying (repo convention, no RTL). Navigation
 * is mocked file-locally; the Fit route carries `{wardrobe_direction}`.
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';

const mockNavigate = jest.fn();
// Fit screen reads route.params.wardrobe_direction.
const ROUTE_PARAMS = { wardrobe_direction: 'Womenswear' as const };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: ROUTE_PARAMS }),
  // Screen tracks a screen-view via useFocusEffect; no-op for these tests.
  useFocusEffect: jest.fn(),
}));

import { OnboardingWardrobeScreen } from '../OnboardingWardrobeScreen';
import { OnboardingFitScreen } from '../OnboardingFitScreen';

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
const press = (node: ReactTestInstance) =>
  act(() => {
    node.props.onPress();
  });

const liveRenderers: TestRenderer.ReactTestRenderer[] = [];
const render = (el: React.ReactElement) => {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(el);
  });
  liveRenderers.push(renderer);
  return renderer;
};

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

describe('OnboardingWardrobeScreen — Continue gating + forwarding', () => {
  it('Continue is disabled until a wardrobe tile is selected', () => {
    const { root } = render(<OnboardingWardrobeScreen />);
    expect(
      oneByTestID(root, 'onboarding-wardrobe-continue').props.disabled,
    ).toBe(true);

    press(oneByTestID(root, 'onboarding-wardrobe-tile-menswear'));
    expect(
      oneByTestID(root, 'onboarding-wardrobe-continue').props.disabled,
    ).toBe(false);
  });

  it('forwards the selected wire wardrobe_direction to OnboardingFit', () => {
    const { root } = render(<OnboardingWardrobeScreen />);
    press(oneByTestID(root, 'onboarding-wardrobe-tile-mixed'));
    press(oneByTestID(root, 'onboarding-wardrobe-continue'));
    expect(mockNavigate).toHaveBeenCalledWith('OnboardingFit', {
      wardrobe_direction: 'Mixed',
    });
  });

  it('does not navigate when no selection (guarded handleContinue)', () => {
    const { root } = render(<OnboardingWardrobeScreen />);
    press(oneByTestID(root, 'onboarding-wardrobe-continue'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('OnboardingFitScreen — Continue gating + D2 wire forwarding', () => {
  it('Continue is disabled until a fit tile is selected', () => {
    const { root } = render(<OnboardingFitScreen />);
    expect(oneByTestID(root, 'onboarding-fit-continue').props.disabled).toBe(
      true,
    );
    // tile testID is a stable slug (display label "Regular Fit" → "regular")
    press(oneByTestID(root, 'onboarding-fit-tile-regular'));
    expect(oneByTestID(root, 'onboarding-fit-continue').props.disabled).toBe(
      false,
    );
  });

  it('forwards the WIRE value "Classic Fit" for the UI "Regular" tile (D2)', () => {
    const { root } = render(<OnboardingFitScreen />);
    press(oneByTestID(root, 'onboarding-fit-tile-regular'));
    press(oneByTestID(root, 'onboarding-fit-continue'));
    expect(mockNavigate).toHaveBeenCalledWith('OnboardingStyles', {
      wardrobe_direction: 'Womenswear',
      fit_preference: 'Classic Fit',
    });
    // the display label must NOT leak onto the wire
    const [, params] = mockNavigate.mock.calls[0];
    expect(params.fit_preference).not.toBe('Regular');
  });

  it('forwards "Slim Fit" for the Slim tile', () => {
    const { root } = render(<OnboardingFitScreen />);
    press(oneByTestID(root, 'onboarding-fit-tile-slim'));
    press(oneByTestID(root, 'onboarding-fit-continue'));
    expect(mockNavigate).toHaveBeenCalledWith('OnboardingStyles', {
      wardrobe_direction: 'Womenswear',
      fit_preference: 'Slim Fit',
    });
  });
});
