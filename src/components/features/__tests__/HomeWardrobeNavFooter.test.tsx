/* eslint-env jest */
/**
 * HomeWardrobeNavFooter — the Home | Wardrobe bottom nav toggle.
 *
 * Locks the navigation contract behind the Facebook-style tab swap:
 *   - Home → Wardrobe is a plain navigate (push; Wardrobe animates 'none'),
 *   - Wardrobe → Home MUST use popTo, not navigate. Under React Navigation 7
 *     navigate() no longer pops back to a screen already in the stack — it
 *     pushes a SECOND Home, which slides in with Home's default animation and
 *     stacks duplicates, so the two directions stop feeling symmetric.
 *   - tapping the tab for the screen you're already on is a no-op.
 *
 * Patterns follow ContextualBottomSheet.render.test.tsx (react-test-renderer,
 * query host nodes by testID, navigation/i18n/analytics stubbed).
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';

const mockNavigate = jest.fn();
const mockPopTo = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: (...args: unknown[]) => mockNavigate(...args),
    popTo: (...args: unknown[]) => mockPopTo(...args),
  }),
  useIsFocused: () => true,
}));

jest.mock('react-i18next', () => {
  const translation = { t: (key: string) => key };
  return { useTranslation: () => translation };
});

const mockTrack = jest.fn();
jest.mock('../../../services/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

// Reduce-motion so MFloatingPill's thumb sets values synchronously — no
// Animated springs to flush.
jest.mock('../../../theme/motion', () => ({
  ...jest.requireActual('../../../theme/motion'),
  useReducedMotion: () => true,
}));

import { HomeWardrobeNavFooter } from '../HomeWardrobeNavFooter';

// Find the pressable tab by testID. Pressable does NOT forward `onPress` to
// its host view (it's translated into responder props), so match the composite
// node that still carries the handler instead of filtering to host elements.
const findPressableByTestID = (
  root: ReactTestInstance,
  id: string,
): ReactTestInstance => {
  const matches = root.findAll(
    n => n.props?.testID === id && typeof n.props?.onPress === 'function',
  );
  expect(matches.length).toBeGreaterThan(0);
  return matches[0];
};

const render = (el: React.ReactElement): TestRenderer.ReactTestRenderer => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
};

const press = (node: ReactTestInstance) => {
  act(() => {
    node.props.onPress();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('HomeWardrobeNavFooter navigation', () => {
  it('Home → Wardrobe: tapping the wardrobe tab pushes Wardrobe via navigate', () => {
    const r = render(<HomeWardrobeNavFooter active="home" />);
    press(findPressableByTestID(r.root, 'home-footer-nav-wardrobe'));
    expect(mockNavigate).toHaveBeenCalledWith('Wardrobe');
    expect(mockPopTo).not.toHaveBeenCalled();
    expect(mockTrack).toHaveBeenCalledWith('home_footer_nav_tapped', {
      destination: 'wardrobe',
    });
  });

  // Regression: Wardrobe → Home must pop back to the existing Home. A
  // navigate('Home') here pushes a duplicate Home under React Navigation 7,
  // sliding it in instead of the instant animation-less swap.
  it('Wardrobe → Home: tapping the home tab pops back via popTo, not navigate', () => {
    const r = render(<HomeWardrobeNavFooter active="wardrobe" />);
    press(findPressableByTestID(r.root, 'home-footer-nav-home'));
    expect(mockPopTo).toHaveBeenCalledWith('Home');
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockTrack).toHaveBeenCalledWith('home_footer_nav_tapped', {
      destination: 'home',
    });
  });

  it('tapping the already-active tab is a no-op', () => {
    const r = render(<HomeWardrobeNavFooter active="home" />);
    press(findPressableByTestID(r.root, 'home-footer-nav-home-active'));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockPopTo).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
