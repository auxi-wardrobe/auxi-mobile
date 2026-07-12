/* eslint-env jest */
/**
 * StepReuseConfirm — the "Your body photo" reuse bottom sheet shown when the
 * user re-enters See-this-on-me with a saved body profile. Locks the contract
 * SeeThisOnMeScreen + Maestro rely on:
 *   - title + saved photo + the two actions render with stable testIDs,
 *   - "Use this photo" fires onConfirm (→ render), "Retake" fires onRetake
 *     (→ restart capture), backdrop fires onDismiss (→ leave the flow).
 *
 * Reduce motion is forced so the ContextualBottomSheet shell mounts
 * synchronously — no Animated timers to flush.
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

jest.mock('../../../theme/motion', () => ({
  ...jest.requireActual('../../../theme/motion'),
  useReducedMotion: () => true,
}));

import { StepReuseConfirm } from '../StepReuseConfirm';

const pressByTestID = (root: ReactTestInstance, id: string) => {
  const node = root.find(
    n => n.props?.testID === id && typeof n.props?.onPress === 'function',
  );
  act(() => {
    node.props.onPress();
  });
};

const render = (el: React.ReactElement): TestRenderer.ReactTestRenderer => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
};

describe('StepReuseConfirm', () => {
  const setup = () => {
    const onConfirm = jest.fn();
    const onRetake = jest.fn();
    const onDismiss = jest.fn();
    const r = render(
      <StepReuseConfirm
        photoUri="https://cdn.example/body.jpg"
        onConfirm={onConfirm}
        onRetake={onRetake}
        onDismiss={onDismiss}
      />,
    );
    return { r, onConfirm, onRetake, onDismiss };
  };

  it('renders the sheet, title and saved photo', () => {
    const { r } = setup();
    const has = (id: string) =>
      r.root.findAll(n => n.props?.testID === id).length > 0;
    expect(has('stom-reuse-confirm')).toBe(true);
    expect(has('stom-reuse-confirm-title')).toBe(true);
    expect(has('stom-reuse-confirm-thumb')).toBe(true);
    expect(has('stom-reuse-confirm-use')).toBe(true);
    expect(has('stom-reuse-confirm-retake')).toBe(true);
  });

  it('fires onConfirm from "Use this photo"', () => {
    const { r, onConfirm, onRetake } = setup();
    pressByTestID(r.root, 'stom-reuse-confirm-use');
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onRetake).not.toHaveBeenCalled();
  });

  it('fires onRetake from "Retake"', () => {
    const { r, onRetake, onConfirm } = setup();
    pressByTestID(r.root, 'stom-reuse-confirm-retake');
    expect(onRetake).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('fires onDismiss from the backdrop', () => {
    const { r, onDismiss } = setup();
    pressByTestID(r.root, 'stom-reuse-confirm-backdrop');
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
