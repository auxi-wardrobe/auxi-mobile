/* eslint-env jest */
/**
 * StepBodyShape — See-on-me redesign (B2) Next-button gating.
 *
 * Locks the contract: tapping a tile opens the expand sheet; the sheet's
 * "Use this photo" only RECORDS the selection (`onSelectShape`) — it does NOT
 * fire the render. The bottom "Next" button is disabled until a shape is
 * selected and, once selected, `onConfirm` fires the actual submit.
 *
 * Also locks the two drift-bug fixes: no shape-name overlay on the collapsed
 * tiles, and the expand sheet renders actions before the opt-in row with no
 * per-page shape-name label.
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import { StepBodyShape } from '../StepBodyShape';
import type { GeneratedShape } from '../body-shapes';

const SHAPES: GeneratedShape[] = [
  { shape: 'slim', image_url: 'https://cdn.example/slim.jpg' },
  { shape: 'average', image_url: 'https://cdn.example/average.jpg' },
  { shape: 'fuller', image_url: 'https://cdn.example/fuller.jpg' },
] as GeneratedShape[];

const render = (el: React.ReactElement): TestRenderer.ReactTestRenderer => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
};

const pressByTestID = (root: ReactTestInstance, id: string) => {
  const node = root.find(
    n => n.props?.testID === id && typeof n.props?.onPress === 'function',
  );
  act(() => {
    node.props.onPress();
  });
};

const findByTestID = (root: ReactTestInstance, id: string) =>
  root.findAll(n => n.props?.testID === id);

describe('StepBodyShape — B2 Next-button gating', () => {
  const setup = (selectedShape: GeneratedShape['shape'] | null = null) => {
    const onSelectShape = jest.fn();
    const onConfirm = jest.fn();
    const onToggleOptIn = jest.fn();
    const r = render(
      <StepBodyShape
        shapes={SHAPES}
        selectedShape={selectedShape}
        onSelectShape={onSelectShape}
        onConfirm={onConfirm}
        optIn
        onToggleOptIn={onToggleOptIn}
      />,
    );
    return { r, onSelectShape, onConfirm, onToggleOptIn };
  };

  it('Next is disabled until a shape is selected', () => {
    const { r } = setup(null);
    const next = findByTestID(r.root, 'stom-shape-next')[0];
    expect(next.props.disabled).toBe(true);
  });

  it('Next is enabled once a shape is selected, and confirms on tap', () => {
    const { r, onConfirm } = setup('average');
    const next = findByTestID(r.root, 'stom-shape-next')[0];
    expect(next.props.disabled).toBeFalsy();
    act(() => next.props.onPress());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('tapping a tile opens the sheet; "Use this photo" only records the selection (no onConfirm)', () => {
    const { r, onSelectShape, onConfirm } = setup(null);
    pressByTestID(r.root, 'stom-shape-option-average');
    pressByTestID(r.root, 'stom-generate'); // carousel "Use this photo"
    expect(onSelectShape).toHaveBeenCalledWith('average');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('collapsed tiles carry no shape-name overlay (Figma drift fix)', () => {
    const { r } = setup(null);
    expect(findByTestID(r.root, 'stom-shape-option-label').length).toBe(0);
  });
});
