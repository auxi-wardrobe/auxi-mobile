/* eslint-env jest */
/**
 * SeeThisOnMeConfirmScreen — the reuse-confirm GATE.
 *
 * The gate's whole job is routing: it decides whether to show the confirm sheet
 * (over the originating page) or hand straight off to `SeeThisOnMe`. These tests
 * lock that decision table:
 *   - saved profile + photo → renders the sheet; its actions replace() into
 *     SeeThisOnMe with the right `reuseAction` (or goBack on dismiss),
 *   - no saved profile → no sheet, hands off in 'capture' mode,
 *   - a cached result or an in-flight job for this outfit → bypass the sheet and
 *     hand off (SeeThisOnMe rehydrates / shows the cached result itself).
 *
 * StepReuseConfirm is mocked to a bare row of buttons — its own presentation is
 * covered in StepReuseConfirm.test.tsx; here we only care about the wiring.
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';

const mockReplace = jest.fn();
const mockGoBack = jest.fn();
const mockRouteParams = { outfit: { outfitHash: 'hash-1', itemIds: [], itemImageUrls: [], stylingNote: '' } };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    replace: (...a: unknown[]) => mockReplace(...a),
    goBack: (...a: unknown[]) => mockGoBack(...a),
  }),
  useRoute: () => ({ params: mockRouteParams }),
}));

const mockTrack = jest.fn();
jest.mock('../../../services/analytics', () => ({
  track: (...a: unknown[]) => mockTrack(...a),
}));

// Controllable per-test.
let mockQueryResult: { data: unknown; isLoading: boolean } = {
  data: null,
  isLoading: false,
};
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => mockQueryResult,
}));

let mockStoreState: { outfit?: { outfitHash: string }; status: string } = {
  status: 'idle',
};
jest.mock('../try-on-generation-store', () => ({
  tryOnGenerationStore: { getState: () => mockStoreState },
}));

let mockCachedResult: string | null = null;
jest.mock('../../../services/tryOnResultStore', () => ({
  getTryOnResult: () => mockCachedResult,
}));

// Bare stand-in for the sheet: exposes the three callbacks as pressables.
jest.mock('../StepReuseConfirm', () => {
  const React2 = require('react');
  return {
    StepReuseConfirm: (props: {
      onConfirm: () => void;
      onRetake: () => void;
      onDismiss: () => void;
    }) =>
      React2.createElement(
        'View',
        { testID: 'mock-reuse-sheet' },
        React2.createElement('Pressable', {
          testID: 'confirm',
          onPress: props.onConfirm,
        }),
        React2.createElement('Pressable', {
          testID: 'retake',
          onPress: props.onRetake,
        }),
        React2.createElement('Pressable', {
          testID: 'dismiss',
          onPress: props.onDismiss,
        }),
      ),
  };
});

import { SeeThisOnMeConfirmScreen } from '../SeeThisOnMeConfirmScreen';

const render = (): TestRenderer.ReactTestRenderer => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(<SeeThisOnMeConfirmScreen />);
  });
  return r;
};

const press = (root: ReactTestInstance, id: string) => {
  const node = root.find(
    n => n.props?.testID === id && typeof n.props?.onPress === 'function',
  );
  act(() => node.props.onPress());
};

const has = (r: TestRenderer.ReactTestRenderer, id: string) =>
  r.root.findAll(n => n.props?.testID === id).length > 0;

beforeEach(() => {
  mockReplace.mockClear();
  mockGoBack.mockClear();
  mockTrack.mockClear();
  mockQueryResult = { data: null, isLoading: false };
  mockStoreState = { status: 'idle' };
  mockCachedResult = null;
});

describe('SeeThisOnMeConfirmScreen (reuse-confirm gate)', () => {
  const REUSE_PROFILE = {
    id: 'prof-1',
    full_body_url: 'https://cdn.example/body.jpg',
    body_shape: 'average',
  };

  it('shows the confirm sheet when a saved profile with a photo exists', () => {
    mockQueryResult = { data: REUSE_PROFILE, isLoading: false };
    const r = render();
    expect(has(r, 'mock-reuse-sheet')).toBe(true);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not show the sheet while the profile is still loading', () => {
    mockQueryResult = { data: undefined, isLoading: true };
    const r = render();
    expect(has(r, 'mock-reuse-sheet')).toBe(false);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('confirm → replace into SeeThisOnMe in render mode with the saved body', () => {
    mockQueryResult = { data: REUSE_PROFILE, isLoading: false };
    const r = render();
    press(r.root, 'confirm');
    expect(mockTrack).toHaveBeenCalledWith('body_photo_reuse_confirmed', {
      outfit_hash: 'hash-1',
    });
    expect(mockReplace).toHaveBeenCalledWith('SeeThisOnMe', {
      outfit: mockRouteParams.outfit,
      reuseAction: 'render',
      reuseBodyId: 'prof-1',
      reuseShape: 'average',
    });
  });

  it('retake → replace into SeeThisOnMe in capture mode', () => {
    mockQueryResult = { data: REUSE_PROFILE, isLoading: false };
    const r = render();
    press(r.root, 'retake');
    expect(mockTrack).toHaveBeenCalledWith('body_photo_retake_selected', {
      outfit_hash: 'hash-1',
    });
    expect(mockReplace).toHaveBeenCalledWith('SeeThisOnMe', {
      outfit: mockRouteParams.outfit,
      reuseAction: 'capture',
    });
  });

  it('dismiss → goBack to the originating page (no hand-off)', () => {
    mockQueryResult = { data: REUSE_PROFILE, isLoading: false };
    const r = render();
    press(r.root, 'dismiss');
    expect(mockTrack).toHaveBeenCalledWith('body_photo_reuse_dismissed', {
      outfit_hash: 'hash-1',
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('no saved profile → hands off to capture, no sheet', () => {
    mockQueryResult = { data: null, isLoading: false };
    const r = render();
    expect(has(r, 'mock-reuse-sheet')).toBe(false);
    expect(mockReplace).toHaveBeenCalledWith('SeeThisOnMe', {
      outfit: mockRouteParams.outfit,
      reuseAction: 'capture',
    });
  });

  it('cached result for this outfit → bypass the sheet, plain hand-off', () => {
    mockQueryResult = { data: REUSE_PROFILE, isLoading: false };
    mockCachedResult = 'https://cdn.example/cached.jpg';
    const r = render();
    expect(has(r, 'mock-reuse-sheet')).toBe(false);
    expect(mockReplace).toHaveBeenCalledWith('SeeThisOnMe', {
      outfit: mockRouteParams.outfit,
    });
  });

  it('in-flight job for this outfit → bypass the sheet, plain hand-off', () => {
    mockQueryResult = { data: REUSE_PROFILE, isLoading: false };
    mockStoreState = { outfit: { outfitHash: 'hash-1' }, status: 'pending' };
    const r = render();
    expect(has(r, 'mock-reuse-sheet')).toBe(false);
    expect(mockReplace).toHaveBeenCalledWith('SeeThisOnMe', {
      outfit: mockRouteParams.outfit,
    });
  });
});
