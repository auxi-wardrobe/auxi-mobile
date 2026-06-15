/* eslint-env jest */
/**
 * AU-348 — PillButton loading/press states.
 *
 * Verifies the loading-state contract that QA/Maestro rely on:
 *  - the `${testID}-loading` indicator is present ONLY while loading,
 *  - `loading` (like `disabled`) blocks interaction (disabled prop true),
 *  - the title renders when not loading.
 * The motion itself (cross-fade / press scale) is driven by motion tokens and
 * isn't asserted here — these are the structural guarantees tests/QA select on.
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { PillButton } from '../FigmaPrimitives';

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

describe('PillButton', () => {
  it('renders the title and no loading indicator by default', () => {
    const r = render(
      <PillButton testID="pb" title="Wear this" onPress={() => {}} />,
    );
    expect(JSON.stringify(r.toJSON())).toContain('Wear this');
    expect(findByTestID(r.root, 'pb-loading')).toHaveLength(0);
    expect(findByTestID(r.root, 'pb')[0].props.disabled).toBeFalsy();
  });

  it('shows the loading indicator and disables interaction while loading', () => {
    const r = render(
      <PillButton testID="pb" title="Wear this" loading onPress={() => {}} />,
    );
    // ActivityIndicator surfaces the testID on both the composite and its host
    // node, so assert presence rather than an exact count.
    expect(findByTestID(r.root, 'pb-loading').length).toBeGreaterThan(0);
    // `disabled || loading` disables the touchable; assert across matching
    // nodes (composite + host) rather than relying on positional order.
    expect(
      findByTestID(r.root, 'pb').some(n => n.props.disabled === true),
    ).toBe(true);
  });

  it('disables interaction when disabled', () => {
    const r = render(
      <PillButton testID="pb" title="Wear this" disabled onPress={() => {}} />,
    );
    expect(findByTestID(r.root, 'pb')[0].props.disabled).toBe(true);
  });
});
