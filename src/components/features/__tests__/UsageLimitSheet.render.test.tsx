/* eslint-env jest */
/**
 * UsageLimitSheet — the AU-442 soft-paywall "you've reached the free limit"
 * sheet.
 *
 * Locks the structural contract:
 *   - nothing mounts while hidden (visible=false → null),
 *   - each of the 3 `feature` keys renders its own i18n-keyed title/body copy,
 *   - both CTAs render with distinct testIDs,
 *   - `onUpgrade` fires exactly once per tap (no double-navigate),
 *   - `onDismiss` fires on the secondary CTA tap.
 *
 * Reduce Motion is forced so the overlay mounts/unmounts synchronously. i18n
 * is stubbed to echo keys so copy assertions are locale-independent.
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

import { UsageLimitSheet } from '../UsageLimitSheet';
import type { UsageLimitFeature } from '../../../hooks/useUsageLimitGate';

const findByTestID = (
  root: ReactTestInstance,
  id: string,
): ReactTestInstance[] =>
  root.findAll(n => typeof n.type === 'string' && n.props?.testID === id);

const pressableWith = (root: ReactTestInstance, id: string): ReactTestInstance =>
  root.findAll(
    n => n.props?.testID === id && typeof n.props?.onPress === 'function',
  )[0];

const render = (el: React.ReactElement): TestRenderer.ReactTestRenderer => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
};

const FEATURES: UsageLimitFeature[] = [
  'see_on_me',
  'wardrobe_items',
  'enhance_photo',
];

describe('UsageLimitSheet', () => {
  it('renders nothing while hidden', () => {
    const r = render(
      <UsageLimitSheet
        visible={false}
        onDismiss={() => {}}
        onUpgrade={() => {}}
        feature="see_on_me"
      />,
    );
    expect(r.toJSON()).toBeNull();
    expect(findByTestID(r.root, 'usage-limit-sheet')).toHaveLength(0);
  });

  it.each(FEATURES)(
    'renders the %s copy variant with both CTAs when visible',
    feature => {
      const r = render(
        <UsageLimitSheet
          visible
          onDismiss={() => {}}
          onUpgrade={() => {}}
          feature={feature}
        />,
      );
      expect(findByTestID(r.root, 'usage-limit-sheet').length).toBeGreaterThan(
        0,
      );
      const json = JSON.stringify(r.toJSON());
      expect(json).toContain(`usageLimit.${feature}_title`);
      expect(json).toContain(`usageLimit.${feature}_body`);
      expect(json).toContain('usageLimit.upgrade_cta');
      expect(json).toContain('usageLimit.maybe_later');
      expect(
        findByTestID(r.root, 'usage-limit-sheet-upgrade').length,
      ).toBeGreaterThan(0);
      expect(
        findByTestID(r.root, 'usage-limit-sheet-dismiss').length,
      ).toBeGreaterThan(0);
    },
  );

  it('fires onUpgrade exactly once per tap', () => {
    const onUpgrade = jest.fn();
    const r = render(
      <UsageLimitSheet
        visible
        onDismiss={() => {}}
        onUpgrade={onUpgrade}
        feature="see_on_me"
      />,
    );
    act(() => {
      pressableWith(r.root, 'usage-limit-sheet-upgrade').props.onPress();
    });
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it('fires onDismiss when "Maybe later" is tapped', () => {
    const onDismiss = jest.fn();
    const r = render(
      <UsageLimitSheet
        visible
        onDismiss={onDismiss}
        onUpgrade={() => {}}
        feature="wardrobe_items"
      />,
    );
    act(() => {
      pressableWith(r.root, 'usage-limit-sheet-dismiss').props.onPress();
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
