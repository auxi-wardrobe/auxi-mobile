/* eslint-env jest */
/**
 * AppNavFooter — the shared 4-tab bottom nav (Home · See my outfits ·
 * Discovery · Wardrobe). Replaces the 2-tab HomeWardrobeNavFooter.
 *
 * Locks the navigation contract behind the Facebook-style tab swap:
 *   - a tab NOT in the stack is pushed with navigate,
 *   - a tab already in the stack MUST be reached with popTo. Under React
 *     Navigation 7 navigate() no longer pops back to an existing screen — it
 *     pushes a SECOND copy, which remounts the recommender (dropping its live
 *     deck) and stacks duplicates,
 *   - tapping the tab for the screen you're already on is a no-op.
 *
 * Patterns follow the test this replaces (react-test-renderer, query host
 * nodes by testID, navigation/i18n/analytics stubbed).
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';

const mockNavigate = jest.fn();
const mockPopTo = jest.fn();
// Routes currently on the stack — the thing that decides popTo vs navigate.
let mockStackRoutes: Array<{ name: string }> = [];

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: (...args: unknown[]) => mockNavigate(...args),
    popTo: (...args: unknown[]) => mockPopTo(...args),
    getState: () => ({ routes: mockStackRoutes }),
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

import { AppNavFooter } from '../AppNavFooter';

// Pressable does NOT forward `onPress` to its host view (it becomes responder
// props), so match the composite node that still carries the handler.
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
  mockStackRoutes = [{ name: 'HomeLanding' }];
});

describe('AppNavFooter navigation', () => {
  it('pushes a tab that is not on the stack yet', () => {
    const r = render(<AppNavFooter active="home" />);
    press(findPressableByTestID(r.root, 'app-nav-wardrobe'));
    expect(mockNavigate).toHaveBeenCalledWith('Wardrobe');
    expect(mockPopTo).not.toHaveBeenCalled();
    expect(mockTrack).toHaveBeenCalledWith('app_nav_tapped', {
      destination: 'Wardrobe',
      from: 'HomeLanding',
    });
  });

  // Regression: going back to a tab already in the stack must POP to it. A
  // navigate() here pushes a duplicate under React Navigation 7 — for the
  // recommender that also remounts it and discards the deck.
  it('pops back to a tab that is already on the stack', () => {
    mockStackRoutes = [{ name: 'HomeLanding' }, { name: 'Wardrobe' }];
    const r = render(<AppNavFooter active="wardrobe" />);
    press(findPressableByTestID(r.root, 'app-nav-home'));
    expect(mockPopTo).toHaveBeenCalledWith('HomeLanding');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('routes the outfit tab to the recommender (Home), not the landing page', () => {
    const r = render(<AppNavFooter active="home" />);
    press(findPressableByTestID(r.root, 'app-nav-outfit'));
    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });

  it('routes the discovery tab to Discovery', () => {
    const r = render(<AppNavFooter active="home" />);
    press(findPressableByTestID(r.root, 'app-nav-discovery'));
    expect(mockNavigate).toHaveBeenCalledWith('Discovery');
  });

  it('tapping the already-active tab is a no-op', () => {
    const r = render(<AppNavFooter active="home" />);
    press(findPressableByTestID(r.root, 'app-nav-home-active'));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockPopTo).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('renders every tab with an always-defined testID in both states', () => {
    const r = render(<AppNavFooter active="discovery" />);
    ['app-nav-home', 'app-nav-outfit', 'app-nav-wardrobe'].forEach(id => {
      expect(findPressableByTestID(r.root, id)).toBeTruthy();
    });
    expect(findPressableByTestID(r.root, 'app-nav-discovery-active')).toBeTruthy();
  });
});
