/* eslint-env jest */
/**
 * MacgieLoader smoke tests. We exercise the Reduce-Motion path (no Animated
 * loops) so the render is deterministic and free of open timers: the loader
 * must still mount, expose its testID, and render the caption.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { MacgieLoader } from '../MacgieLoader';

// Force the static (Reduce Motion) branch — no loops, no timers.
jest.mock('../../../theme/motion', () => {
  const actual = jest.requireActual('../../../theme/motion');
  return { ...actual, useReducedMotion: () => true };
});

const render = (element: React.ReactElement) => {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(element);
  });
  return tree;
};

describe('MacgieLoader', () => {
  it('renders with the default testID and shows the label', () => {
    const tree = render(<MacgieLoader label="Building your next looks" />);
    const root = tree.root;

    expect(root.findByProps({ testID: 'macgie-loader' })).toBeTruthy();

    const labels = root
      .findAllByType(Text)
      .map(node => node.props.children)
      .filter(Boolean);
    expect(labels).toContain('Building your next looks');

    act(() => tree.unmount());
  });

  it('honours a custom testID and renders without a label', () => {
    const tree = render(<MacgieLoader testID="stom-generating-macgie" />);
    const root = tree.root;

    expect(root.findByProps({ testID: 'stom-generating-macgie' })).toBeTruthy();
    expect(root.findAllByType(Text)).toHaveLength(0);

    act(() => tree.unmount());
  });
});
