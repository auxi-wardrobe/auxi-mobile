/* eslint-env jest */
/**
 * MacgieLogo smoke test. Runs the Reduce-Motion branch (no loops/timers) and
 * asserts the brand-mark a11y contract: it is an *image* labelled "Macgie" and
 * must NOT carry the loader's busy/Loading semantics.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MacgieLogo } from '../MacgieLogo';

jest.mock('../../../theme/motion', () => {
  const actual = jest.requireActual('../../../theme/motion');
  return { ...actual, useReducedMotion: () => true };
});

describe('MacgieLogo', () => {
  it('renders the brand mark with image a11y (not a loader)', () => {
    let tree!: TestRenderer.ReactTestRenderer;
    act(() => {
      tree = TestRenderer.create(<MacgieLogo testID="welcome-logo" />);
    });

    // Query by the a11y label (only the host View carries it) — the composite
    // element also has the forwarded testID, so a testID query is ambiguous.
    const node = tree.root.findByProps({ accessibilityLabel: 'Macgie' });
    expect(node.props.accessibilityRole).toBe('image');
    expect(node.props.testID).toBe('welcome-logo');
    // Must NOT inherit the loader's busy semantics.
    expect(node.props.accessibilityState).toBeUndefined();

    act(() => tree.unmount());
  });
});
