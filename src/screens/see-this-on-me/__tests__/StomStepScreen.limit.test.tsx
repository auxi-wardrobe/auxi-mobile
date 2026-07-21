/* eslint-env jest */
/**
 * renderStomStepScreen — daily-limit (`ai_daily_limit_reached` 429) backdrop.
 *
 * Regression lock for the bug where the AiLimitSheet ("out of AI for today,
 * come back tomorrow") was overlaid on top of the still-animating
 * `StomLoadingScreen`: the spinner + revealing rows kept running behind the
 * sheet's 0.45 scrim, reading as "still working" while the copy said to leave.
 *
 * Contract: while `limitReached` is set, the loading steps (`generating` /
 * `generatingShapes`) render the quiet static `stom-limit-backdrop` instead of
 * the animated loader — and the loader (`stom-loading-*`) must NOT be in the
 * tree. With `limitReached` false the animated loader still renders (control).
 *
 * Reduce motion is forced so the shell + loader mount synchronously.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// Native bridge pulled in transitively (components.tsx → use-save-image) and
// never exercised on these paths — stub it so the module tree loads under Jest.
jest.mock('@react-native-camera-roll/camera-roll', () => ({
  CameraRoll: { save: jest.fn(), saveAsset: jest.fn() },
}));

// Stub the animated loader to a static view carrying its `testID`. We assert
// which SHELL `renderStomStepScreen` picks (backdrop vs. loader) — not the
// loader's internals — and the real loader's Animated.loop timers otherwise
// outlive the test and throw "environment torn down".
jest.mock('../StomLoadingScreen', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    StomLoadingScreen: ({ testID }: { testID?: string }) =>
      ReactLocal.createElement(View, { testID }),
  };
});

jest.mock('../../../theme/motion', () => ({
  ...jest.requireActual('../../../theme/motion'),
  useReducedMotion: () => true,
}));

import { renderStomStepScreen } from '../StomStepScreen';
import { Step } from '../stom-steps';

const render = (el: React.ReactElement): TestRenderer.ReactTestRenderer => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
};

const has = (r: TestRenderer.ReactTestRenderer, id: string): boolean =>
  r.root.findAll(n => n.props?.testID === id).length > 0;

// Renders the non-errored loading state for the given phase step, with the
// limit gate either engaged or not. Every callback is a no-op — these paths
// don't fire any of them.
const renderStep = (step: Step, limitReached: boolean) =>
  render(
    renderStomStepScreen({
      t: ((k: string) => k) as never,
      step,
      profileLoading: false,
      handleBack: jest.fn(),
      handleQuitGeneration: jest.fn(),
      handleBackDuringGeneration: jest.fn(),
      shapesErrored: false,
      regenerateShapes: jest.fn(),
      errored: false,
      renderBodyId: null,
      renderShape: null,
      runRender: jest.fn(),
      resultUrl: null,
      goHome: jest.fn(),
      restartCapture: jest.fn(),
      isCachedResult: false,
      handleCachedRetake: jest.fn(),
      limitReached,
      outfitHash: 'hash',
    })!,
  );

describe('renderStomStepScreen — daily-limit backdrop', () => {
  it('render phase: shows the static backdrop, NOT the animated loader', () => {
    const r = renderStep('generating', true);
    expect(has(r, 'stom-limit-backdrop')).toBe(true);
    expect(has(r, 'stom-loading-result')).toBe(false);
  });

  it('shapes phase: shows the static backdrop, NOT the animated loader', () => {
    const r = renderStep('generatingShapes', true);
    expect(has(r, 'stom-limit-backdrop')).toBe(true);
    expect(has(r, 'stom-loading-shapes')).toBe(false);
  });

  it('entry gate: shows the backdrop even on the initial selfie step', () => {
    // The proactive entry gate opens the sheet while `step` is still 'selfie'
    // (before any job starts), so the backdrop must win over the capture UI too.
    const r = renderStep('selfie', true);
    expect(has(r, 'stom-limit-backdrop')).toBe(true);
  });

  it('control: without the limit gate the animated loader still renders', () => {
    const r = renderStep('generating', false);
    expect(has(r, 'stom-loading-result')).toBe(true);
    expect(has(r, 'stom-limit-backdrop')).toBe(false);
  });
});
