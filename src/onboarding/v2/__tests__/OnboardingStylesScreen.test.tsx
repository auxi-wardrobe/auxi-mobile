/* eslint-env jest */
/**
 * OnboardingStylesScreen (Step 3/3) — selection-ranking + navigation logic.
 *
 * Coverage (Phase 6 unit scope):
 *  1. max-2 enforcement — ACTUAL behavior is BLOCK (not replace): a 3rd
 *     distinct pick is ignored; the un-picked tiles become disabled at the cap.
 *  2. pin numbers reflect selection ORDER (rank 1 = first picked).
 *  3. deselect collapses the ranks (rank 2 promotes to rank 1).
 *  4. Next disabled until exactly MAX_STYLE_PICKS picks; the (n/2) label tracks.
 *  5. Next navigates to OnboardingLoading with the full ranked selection.
 *
 * No @testing-library/react-native in this repo — drive react-test-renderer
 * directly, query by testID (mirrors SettingsScreen.test.tsx). useNavigation /
 * useRoute are mocked file-locally so we can inject route params + capture
 * navigate(). The OnboardingSelectionCard receives `pinNumber` — we assert on
 * that prop to read the rank.
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { OnboardingStylesScreen } from '../OnboardingStylesScreen';

const mockNavigate = jest.fn();
const ROUTE_PARAMS = {
  wardrobe_direction: 'Menswear' as const,
  fit_preference: 'Classic Fit' as const,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: ROUTE_PARAMS }),
}));

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

/**
 * PillButton renders its `title` as a child <Text>, not as a prop on the
 * testID node (the TouchableOpacity). Read the rendered label text instead.
 */
const buttonLabel = (root: ReactTestInstance, id: string): string => {
  const btn = oneByTestID(root, id);
  const texts = btn.findAll(
    n => typeof n.type === 'string' && typeof n.children?.[0] === 'string',
  );
  return texts.map(t => t.children[0]).join('');
};

/** The OnboardingSelectionCard rendered inside a style tile — holds pinNumber. */
const cardFor = (root: ReactTestInstance, tag: string): ReactTestInstance => {
  const tile = oneByTestID(root, `onboarding-style-tile-${tag}`);
  // first descendant carrying a pinNumber/selected prop is the selection card
  const cards = tile.findAll(
    n => typeof n.type !== 'string' && 'selected' in (n.props ?? {}),
  );
  if (cards.length === 0) throw new Error(`no selection card under ${tag}`);
  return cards[0];
};

const renderScreen = () => {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(<OnboardingStylesScreen />);
  });
  return renderer;
};

const liveRenderers: TestRenderer.ReactTestRenderer[] = [];
const render = () => {
  const r = renderScreen();
  liveRenderers.push(r);
  return r;
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

describe('OnboardingStylesScreen — selection ranking', () => {
  it('pin numbers reflect the order picks are made (rank 1 = first)', () => {
    const { root } = render();
    press(oneByTestID(root, 'onboarding-style-tile-bold'));
    press(oneByTestID(root, 'onboarding-style-tile-soft'));

    expect(cardFor(root, 'bold').props.pinNumber).toBe(1);
    expect(cardFor(root, 'soft').props.pinNumber).toBe(2);
    expect(cardFor(root, 'minimal').props.pinNumber).toBeUndefined();
  });

  it('deselecting the rank-1 pick collapses ranks (rank 2 → rank 1)', () => {
    const { root } = render();
    press(oneByTestID(root, 'onboarding-style-tile-bold')); // rank 1
    press(oneByTestID(root, 'onboarding-style-tile-soft')); // rank 2

    // remove bold → soft promotes to rank 1
    press(oneByTestID(root, 'onboarding-style-tile-bold'));
    expect(cardFor(root, 'bold').props.pinNumber).toBeUndefined();
    expect(cardFor(root, 'soft').props.pinNumber).toBe(1);
  });

  it('max-2 BLOCKS a 3rd distinct pick (does not replace) + disables un-picked tiles', () => {
    const { root } = render();
    press(oneByTestID(root, 'onboarding-style-tile-minimal')); // rank 1
    press(oneByTestID(root, 'onboarding-style-tile-casual')); // rank 2

    // at the cap, un-picked tiles are disabled
    expect(oneByTestID(root, 'onboarding-style-tile-bold').props.disabled).toBe(
      true,
    );

    // attempting a 3rd pick is a no-op (BLOCK, not replace) — first two hold
    press(oneByTestID(root, 'onboarding-style-tile-bold'));
    expect(cardFor(root, 'bold').props.pinNumber).toBeUndefined();
    expect(cardFor(root, 'minimal').props.pinNumber).toBe(1);
    expect(cardFor(root, 'casual').props.pinNumber).toBe(2);

    // an already-selected tile can still be toggled OFF at the cap
    press(oneByTestID(root, 'onboarding-style-tile-minimal'));
    expect(cardFor(root, 'minimal').props.pinNumber).toBeUndefined();
    // bold is now selectable again
    expect(oneByTestID(root, 'onboarding-style-tile-bold').props.disabled).toBe(
      false,
    );
  });
});

describe('OnboardingStylesScreen — Next gating + payload', () => {
  it('Next is disabled until exactly 2 picks and the (n/2) label tracks count', () => {
    const { root } = render();
    expect(oneByTestID(root, 'onboarding-style-next').props.disabled).toBe(
      true,
    );
    expect(buttonLabel(root, 'onboarding-style-next')).toBe('(0/2) Next');

    press(oneByTestID(root, 'onboarding-style-tile-minimal'));
    expect(oneByTestID(root, 'onboarding-style-next').props.disabled).toBe(
      true,
    );
    expect(buttonLabel(root, 'onboarding-style-next')).toBe('(1/2) Next');

    press(oneByTestID(root, 'onboarding-style-tile-bold'));
    expect(oneByTestID(root, 'onboarding-style-next').props.disabled).toBe(
      false,
    );
    expect(buttonLabel(root, 'onboarding-style-next')).toBe('(2/2) Next');
  });

  it('Next navigates to OnboardingLoading with the full ranked selection', () => {
    const { root } = render();
    press(oneByTestID(root, 'onboarding-style-tile-formal')); // rank 1
    press(oneByTestID(root, 'onboarding-style-tile-soft')); // rank 2
    press(oneByTestID(root, 'onboarding-style-next'));

    expect(mockNavigate).toHaveBeenCalledWith('OnboardingLoading', {
      selection: {
        wardrobe_direction: 'Menswear',
        fit_preference: 'Classic Fit',
        style_preferences: ['Formal', 'Soft'],
      },
    });
  });

  it('does not navigate when fewer than 2 picks (guarded handleNext)', () => {
    const { root } = render();
    press(oneByTestID(root, 'onboarding-style-tile-minimal'));
    // pressing the disabled Next should not fire navigate (isReady=false guard)
    press(oneByTestID(root, 'onboarding-style-next'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
