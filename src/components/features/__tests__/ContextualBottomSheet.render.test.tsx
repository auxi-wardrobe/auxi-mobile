/* eslint-env jest */
/**
 * ContextualBottomSheet — the shared full-width bottom-sheet shell (single
 * source of truth for the confirm dialogs + Add-to-Schedule / Wardrobe add
 * sheets). Locks the structural contract QA/Maestro rely on:
 *   - nothing mounts while hidden (visible=false → null),
 *   - when visible, the panel `testID`, the `${testID}-backdrop` scrim and the
 *     children all render,
 *   - under Reduce Motion, hiding unmounts immediately (no lingering overlay).
 *
 * The reduce-motion branch is forced so mount/unmount is synchronous — no
 * Animated timers to flush — which keeps these structural assertions
 * deterministic. The slide/scale motion itself is token-driven and asserted by
 * the motion-token tests, not here.
 */
import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';

jest.mock('../../../theme/motion', () => ({
  ...jest.requireActual('../../../theme/motion'),
  useReducedMotion: () => true,
}));

import { ContextualBottomSheet } from '../ContextualBottomSheet';

const findByTestID = (
  root: ReactTestInstance,
  id: string,
): ReactTestInstance[] => root.findAll(n => n.props?.testID === id);

const render = (el: React.ReactElement): TestRenderer.ReactTestRenderer => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
};

describe('ContextualBottomSheet', () => {
  it('renders nothing while hidden', () => {
    const r = render(
      <ContextualBottomSheet visible={false} onDismiss={() => {}} testID="sheet">
        <Text>body</Text>
      </ContextualBottomSheet>,
    );
    expect(r.toJSON()).toBeNull();
    expect(findByTestID(r.root, 'sheet')).toHaveLength(0);
  });

  it('renders the panel, backdrop and children when visible', () => {
    const r = render(
      <ContextualBottomSheet visible onDismiss={() => {}} testID="sheet">
        <Text>hello sheet</Text>
      </ContextualBottomSheet>,
    );
    expect(findByTestID(r.root, 'sheet').length).toBeGreaterThan(0);
    expect(findByTestID(r.root, 'sheet-backdrop').length).toBeGreaterThan(0);
    expect(JSON.stringify(r.toJSON())).toContain('hello sheet');
  });

  it('unmounts immediately when hidden under reduce motion', () => {
    const r = render(
      <ContextualBottomSheet visible onDismiss={() => {}} testID="sheet">
        <Text>body</Text>
      </ContextualBottomSheet>,
    );
    expect(findByTestID(r.root, 'sheet').length).toBeGreaterThan(0);

    act(() => {
      r.update(
        <ContextualBottomSheet
          visible={false}
          onDismiss={() => {}}
          testID="sheet"
        >
          <Text>body</Text>
        </ContextualBottomSheet>,
      );
    });

    expect(r.toJSON()).toBeNull();
  });
});
