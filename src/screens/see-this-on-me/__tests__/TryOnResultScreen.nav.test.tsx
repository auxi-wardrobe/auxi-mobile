/* eslint-env jest */
/**
 * TryOnResultScreen — the two navigation affordances on the See-on-me result.
 *
 * The screen is a standalone viewer for a finished try-on (opened from the
 * HomeLanding notification list, or from a tapped push). Its two exits mean
 * different things and must not collapse into one:
 *   - "Back to home" (the preview pill) → the app's LANDING page
 *     (`HomeLanding`), never the `Home` recommender, and never a duplicate
 *     landing pushed on top of the one already in the stack.
 *   - the header chevron → the page that OPENED the result, i.e. a plain
 *     goBack(); only a cold-start push tap (nothing beneath us) falls back
 *     to the landing page.
 *
 * `OutfitPreview` / `StomHeader` are stubbed to bare pressables — their own
 * presentation is covered elsewhere; here only the wiring is under test.
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';

const mockPopTo = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
// Per-test: what the stack holds below us, and whether there IS a page below.
let mockRoutes: Array<{ name: string }> = [];
let mockCanGoBack = true;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    popTo: (...a: unknown[]) => mockPopTo(...a),
    navigate: (...a: unknown[]) => mockNavigate(...a),
    goBack: (...a: unknown[]) => mockGoBack(...a),
    canGoBack: () => mockCanGoBack,
    getState: () => ({ routes: mockRoutes }),
  }),
  useRoute: () => ({ params: { compositeUrl: 'https://cdn.example/look.jpg' } }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../components', () => {
  const React2 = require('react');
  return {
    StomHeader: (props: { onBack: () => void }) =>
      React2.createElement('Pressable', {
        testID: 'header-back',
        onPress: props.onBack,
      }),
    StomDownloadButton: () => null,
  };
});

jest.mock('../OutfitPreview', () => {
  const React2 = require('react');
  return {
    OutfitPreview: (props: { onBackHome: () => void }) =>
      React2.createElement('Pressable', {
        testID: 'stom-back-home',
        onPress: props.onBackHome,
      }),
  };
});

import { TryOnResultScreen } from '../TryOnResultScreen';

const render = (): ReactTestInstance => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(<TryOnResultScreen />);
  });
  return r.root;
};

const press = (root: ReactTestInstance, id: string) => {
  const node = root.find(
    n => n.props?.testID === id && typeof n.props?.onPress === 'function',
  );
  act(() => node.props.onPress());
};

beforeEach(() => {
  mockPopTo.mockClear();
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  mockRoutes = [{ name: 'HomeLanding' }, { name: 'TryOnResult' }];
  mockCanGoBack = true;
});

describe('TryOnResultScreen — "Back to home"', () => {
  it('pops back to the landing page already in the stack', () => {
    press(render(), 'stom-back-home');
    expect(mockPopTo).toHaveBeenCalledWith('HomeLanding');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('never targets the `Home` recommender', () => {
    press(render(), 'stom-back-home');
    expect(mockPopTo).not.toHaveBeenCalledWith('Home');
    expect(mockNavigate).not.toHaveBeenCalledWith('Home');
  });

  // Cold-start push tap: the result is the only screen in the stack, so there
  // is no landing instance to pop back to — push one.
  it('pushes the landing page when the stack has none', () => {
    mockRoutes = [{ name: 'TryOnResult' }];
    press(render(), 'stom-back-home');
    expect(mockNavigate).toHaveBeenCalledWith('HomeLanding');
    expect(mockPopTo).not.toHaveBeenCalled();
  });
});

describe('TryOnResultScreen — header back', () => {
  it('returns to the page that opened the result, not home', () => {
    press(render(), 'header-back');
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockPopTo).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('falls back to the landing page when nothing is beneath it', () => {
    mockCanGoBack = false;
    mockRoutes = [{ name: 'TryOnResult' }];
    press(render(), 'header-back');
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('HomeLanding');
  });
});
