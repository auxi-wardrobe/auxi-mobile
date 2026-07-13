/* eslint-env jest */
/**
 * AiLimitSheet — the "out of AI for today" notification sheet.
 *
 * Locks the structural contract the gate depends on:
 *   - nothing mounts while hidden (visible=false → null),
 *   - when visible, the root `ai-limit-sheet` testID, the dismiss button
 *     `ai-limit-sheet-dismiss` testID, and the copy (title/body/button) render,
 *   - there is NO retry affordance — the whole point of the gate is to remove
 *     the retry-storm CTA. Asserted by the absence of any retry / try-again
 *     testID anywhere in the tree.
 *
 * Reduce Motion is forced so the overlay mounts/unmounts synchronously (no
 * Animated timers to flush), keeping these assertions deterministic. i18n is
 * stubbed to echo keys so the copy assertions are locale-independent.
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';

jest.mock('../../../theme/motion', () => ({
  ...jest.requireActual('../../../theme/motion'),
  useReducedMotion: () => true,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import { AiLimitSheet } from '../AiLimitSheet';

const findByTestID = (
  root: ReactTestInstance,
  id: string,
): ReactTestInstance[] =>
  root.findAll(n => typeof n.type === 'string' && n.props?.testID === id);

const render = (el: React.ReactElement): TestRenderer.ReactTestRenderer => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
};

describe('AiLimitSheet', () => {
  it('renders nothing while hidden', () => {
    const r = render(<AiLimitSheet visible={false} onDismiss={() => {}} />);
    expect(r.toJSON()).toBeNull();
    expect(findByTestID(r.root, 'ai-limit-sheet')).toHaveLength(0);
  });

  it('renders the sheet, the copy and the dismiss button when visible', () => {
    const r = render(<AiLimitSheet visible onDismiss={() => {}} />);
    expect(findByTestID(r.root, 'ai-limit-sheet').length).toBeGreaterThan(0);
    expect(
      findByTestID(r.root, 'ai-limit-sheet-dismiss').length,
    ).toBeGreaterThan(0);
    const json = JSON.stringify(r.toJSON());
    expect(json).toContain('aiLimit.title');
    expect(json).toContain('aiLimit.body');
    expect(json).toContain('aiLimit.dismiss');
  });

  it('exposes NO retry affordance', () => {
    const r = render(<AiLimitSheet visible onDismiss={() => {}} />);
    // No retry-flavoured testID anywhere in the tree.
    const retryish = r.root.findAll(
      n =>
        typeof n.type === 'string' &&
        typeof n.props?.testID === 'string' &&
        /retry|try-again|tryagain/i.test(n.props.testID),
    );
    expect(retryish).toHaveLength(0);
    // The only interactive element is the single dismiss button.
    expect(findByTestID(r.root, 'ai-limit-sheet-dismiss')).toHaveLength(1);
  });

  it('fires onDismiss when the button is pressed', () => {
    const onDismiss = jest.fn();
    const r = render(<AiLimitSheet visible onDismiss={onDismiss} />);
    // The dismiss button carries its testID + onPress on the same pressable
    // host; grab the node that has BOTH and invoke its handler.
    const [btn] = r.root.findAll(
      n =>
        n.props?.testID === 'ai-limit-sheet-dismiss' &&
        typeof n.props?.onPress === 'function',
    );
    act(() => {
      btn.props.onPress();
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
