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

// Bare stand-in for the sheet: exposes the three callbacks as pressables, and
// echoes `photoUri` onto the root node so the gate's photo choice is assertable.
jest.mock('../StepReuseConfirm', () => {
  const React2 = require('react');
  return {
    StepReuseConfirm: (props: {
      photoUri: string;
      onConfirm: () => void;
      onRetake: () => void;
      onDismiss: () => void;
    }) =>
      React2.createElement(
        'View',
        { testID: 'mock-reuse-sheet', photoUri: props.photoUri },
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
  // A profile as `POST /api/body-shape/select` returns it: it carries the
  // picked `body_shape`, `image_url` is that AI body photo, and
  // `full_body_url` is the raw capture that fed the generation (the SELFIE
  // when the optional full-body step was skipped).
  const SHAPE_PROFILE = {
    id: 'prof-1',
    image_url: 'https://cdn.example/picked-shape.jpg',
    full_body_url: 'https://cdn.example/raw-selfie.jpg',
    body_shape: 'average',
  };

  // A pre-AU-358 profile: never went through `select`, so no `body_shape` —
  // `image_url` is the selfie and `full_body_url` the full-body photo.
  const LEGACY_PROFILE = {
    id: 'prof-legacy',
    image_url: 'https://cdn.example/selfie.jpg',
    full_body_url: 'https://cdn.example/full-body.jpg',
  };

  const photoUriOf = (r: TestRenderer.ReactTestRenderer) =>
    r.root.find(n => n.props?.testID === 'mock-reuse-sheet').props.photoUri;

  describe('saved body shape → no confirm step', () => {
    it('skips the sheet and goes straight to the render loading screen', () => {
      mockQueryResult = { data: SHAPE_PROFILE, isLoading: false };
      const r = render();
      expect(has(r, 'mock-reuse-sheet')).toBe(false);
      expect(mockReplace).toHaveBeenCalledWith('SeeThisOnMe', {
        outfit: mockRouteParams.outfit,
        reuseAction: 'render',
        reuseBodyId: 'prof-1',
        reuseShape: 'average',
      });
    });

    it('records the reuse as automatic in the funnel', () => {
      mockQueryResult = { data: SHAPE_PROFILE, isLoading: false };
      render();
      expect(mockTrack).toHaveBeenCalledWith('body_photo_reuse_confirmed', {
        outfit_hash: 'hash-1',
        auto: true,
      });
    });

    it('hands off exactly once across re-renders', () => {
      mockQueryResult = { data: SHAPE_PROFILE, isLoading: false };
      const r = render();
      act(() => {
        r.update(<SeeThisOnMeConfirmScreen />);
      });
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });

    it('waits for the profile before deciding — no premature capture hand-off', () => {
      mockQueryResult = { data: undefined, isLoading: true };
      const r = render();
      expect(has(r, 'mock-reuse-sheet')).toBe(false);
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('no saved body shape → confirm step still shown', () => {
    it('shows the sheet for a legacy profile with a photo but no shape', () => {
      mockQueryResult = { data: LEGACY_PROFILE, isLoading: false };
      const r = render();
      expect(has(r, 'mock-reuse-sheet')).toBe(true);
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('shows the full-body photo, not the selfie', () => {
      mockQueryResult = { data: LEGACY_PROFILE, isLoading: false };
      const r = render();
      expect(photoUriOf(r)).toBe('https://cdn.example/full-body.jpg');
    });

    it('confirm → replace into SeeThisOnMe in render mode with the saved body', () => {
      mockQueryResult = { data: LEGACY_PROFILE, isLoading: false };
      const r = render();
      press(r.root, 'confirm');
      expect(mockTrack).toHaveBeenCalledWith('body_photo_reuse_confirmed', {
        outfit_hash: 'hash-1',
        auto: false,
      });
      expect(mockReplace).toHaveBeenCalledWith('SeeThisOnMe', {
        outfit: mockRouteParams.outfit,
        reuseAction: 'render',
        reuseBodyId: 'prof-legacy',
        reuseShape: null,
      });
    });

    it('retake → replace into SeeThisOnMe in capture mode', () => {
      mockQueryResult = { data: LEGACY_PROFILE, isLoading: false };
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
      mockQueryResult = { data: LEGACY_PROFILE, isLoading: false };
      const r = render();
      press(r.root, 'dismiss');
      expect(mockTrack).toHaveBeenCalledWith('body_photo_reuse_dismissed', {
        outfit_hash: 'hash-1',
      });
      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockReplace).not.toHaveBeenCalled();
    });
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

  it('cached result for this outfit → plain hand-off, no auto-render', () => {
    mockQueryResult = { data: SHAPE_PROFILE, isLoading: false };
    mockCachedResult = 'https://cdn.example/cached.jpg';
    const r = render();
    expect(has(r, 'mock-reuse-sheet')).toBe(false);
    expect(mockReplace).toHaveBeenCalledWith('SeeThisOnMe', {
      outfit: mockRouteParams.outfit,
    });
  });

  it('in-flight job for this outfit → plain hand-off, no auto-render', () => {
    mockQueryResult = { data: SHAPE_PROFILE, isLoading: false };
    mockStoreState = { outfit: { outfitHash: 'hash-1' }, status: 'pending' };
    const r = render();
    expect(has(r, 'mock-reuse-sheet')).toBe(false);
    expect(mockReplace).toHaveBeenCalledWith('SeeThisOnMe', {
      outfit: mockRouteParams.outfit,
    });
  });

  // Regression: this gate is a TRANSPARENT modal, so rendering null while the
  // profile query resolves is indistinguishable from "the button did nothing".
  // With retry:1 and a 30s request timeout a stalled GET /body/active left the
  // user on the untouched origin page for up to ~60s with no feedback.
  describe('profile still loading', () => {
    it('shows the loader instead of rendering nothing', () => {
      mockQueryResult = { data: undefined, isLoading: true };
      const r = render();
      expect(has(r, 'stom-gate-loading')).toBe(true);
      expect(has(r, 'mock-reuse-sheet')).toBe(false);
      // Still loading → no routing decision made yet.
      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('stays silent while a synchronous hand-off is already in flight', () => {
      // A cached result bypasses the sheet and replaces immediately — showing a
      // loader for that frame would flash over the origin page for no reason.
      mockQueryResult = { data: undefined, isLoading: true };
      mockCachedResult = 'https://cdn.example/cached.jpg';
      const r = render();
      expect(has(r, 'stom-gate-loading')).toBe(false);
      expect(mockReplace).toHaveBeenCalledWith('SeeThisOnMe', {
        outfit: mockRouteParams.outfit,
      });
    });
  });
});
