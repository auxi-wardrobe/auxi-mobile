/* eslint-env jest */
/**
 * DiscardGenerationDialog — the confirm sheet shown when the user taps back
 * while a See-this-on-me AI job (body shapes / render) is still generating.
 * Locks the contract SeeThisOnMeScreen relies on:
 *   - title, body and the two actions render with stable testIDs,
 *   - "Notify me when ready" fires onNotify (→ background + notify on done),
 *   - "Discard" fires onDiscard (→ cancel the job + leave),
 *   - backdrop fires onCancel (→ stay on the loading screen).
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

import { DiscardGenerationDialog } from '../DiscardGenerationDialog';

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

describe('DiscardGenerationDialog', () => {
  const setup = () => {
    const onCancel = jest.fn();
    const onNotify = jest.fn();
    const onDiscard = jest.fn();
    const r = render(
      <DiscardGenerationDialog
        visible
        onCancel={onCancel}
        onNotify={onNotify}
        onDiscard={onDiscard}
      />,
    );
    return { r, onCancel, onNotify, onDiscard };
  };

  it('renders the sheet and both actions', () => {
    const { r } = setup();
    const has = (id: string) =>
      r.root.findAll(n => n.props?.testID === id).length > 0;
    expect(has('stom-quit-dialog')).toBe(true);
    expect(has('stom-quit-notify')).toBe(true);
    expect(has('stom-quit-discard')).toBe(true);
  });

  it('fires onNotify from "Notify me when ready"', () => {
    const { r, onNotify, onDiscard } = setup();
    pressByTestID(r.root, 'stom-quit-notify');
    expect(onNotify).toHaveBeenCalledTimes(1);
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it('fires onDiscard from "Discard"', () => {
    const { r, onDiscard, onNotify } = setup();
    pressByTestID(r.root, 'stom-quit-discard');
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onNotify).not.toHaveBeenCalled();
  });

  it('fires onCancel from the backdrop', () => {
    const { r, onCancel } = setup();
    pressByTestID(r.root, 'stom-quit-dialog-backdrop');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
