/* eslint-env jest */
/**
 * DefaultItemsUnlockedSheet — the "you can now remove Macgie's default items"
 * milestone sheet.
 *
 * Locks the structural contract:
 *   - nothing mounts while hidden (visible=false → null),
 *   - title + body render from i18n keys, with the milestone numbers passed
 *     as interpolation values (NOT i18next's reserved `count`),
 *   - the primary CTA is optional — dismiss-only when `onManageWardrobe` is
 *     omitted, which is how the wardrobe grid renders it,
 *   - each CTA fires its callback exactly once per tap.
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

const mockT = jest.fn((key: string, _opts?: Record<string, unknown>) => key);
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (...a: any[]) => (mockT as any)(...a) }),
}));

import { DefaultItemsUnlockedSheet } from '../DefaultItemsUnlockedSheet';

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

const TESTID = 'default-items-unlocked-sheet';

beforeEach(() => {
  mockT.mockClear();
});

describe('DefaultItemsUnlockedSheet', () => {
  it('renders nothing while hidden', () => {
    const r = render(
      <DefaultItemsUnlockedSheet
        visible={false}
        onDismiss={() => {}}
        ownItemCount={12}
        threshold={12}
      />,
    );

    expect(r.toJSON()).toBeNull();
    expect(findByTestID(r.root, TESTID)).toHaveLength(0);
  });

  it('renders title + body when visible', () => {
    const r = render(
      <DefaultItemsUnlockedSheet
        visible
        onDismiss={() => {}}
        ownItemCount={12}
        threshold={12}
      />,
    );

    expect(findByTestID(r.root, `${TESTID}-title`)).toHaveLength(1);
    expect(findByTestID(r.root, `${TESTID}-body`)).toHaveLength(1);
    expect(mockT).toHaveBeenCalledWith('defaultItemsUnlocked.title');
  });

  it('interpolates the milestone numbers without i18next reserved keys', () => {
    render(
      <DefaultItemsUnlockedSheet
        visible
        onDismiss={() => {}}
        ownItemCount={14}
        threshold={12}
      />,
    );

    const bodyCall = mockT.mock.calls.find(
      c => c[0] === 'defaultItemsUnlocked.body',
    );
    expect(bodyCall?.[1]).toEqual({ itemCount: 14, threshold: 12 });
    // `count` would silently switch i18next into plural resolution and demand
    // `_one`/`_other` variants we don't ship.
    expect(bodyCall?.[1]).not.toHaveProperty('count');
  });

  it('renders dismiss-only when no primary CTA is supplied', () => {
    const r = render(
      <DefaultItemsUnlockedSheet
        visible
        onDismiss={() => {}}
        ownItemCount={12}
        threshold={12}
      />,
    );

    expect(findByTestID(r.root, `${TESTID}-manage`)).toHaveLength(0);
    expect(pressableWith(r.root, `${TESTID}-dismiss`)).toBeDefined();
  });

  it('renders both CTAs when a primary CTA is supplied', () => {
    const r = render(
      <DefaultItemsUnlockedSheet
        visible
        onDismiss={() => {}}
        onManageWardrobe={() => {}}
        ownItemCount={12}
        threshold={12}
      />,
    );

    expect(pressableWith(r.root, `${TESTID}-manage`)).toBeDefined();
    expect(pressableWith(r.root, `${TESTID}-dismiss`)).toBeDefined();
  });

  it('fires each CTA exactly once per tap', () => {
    const onDismiss = jest.fn();
    const onManageWardrobe = jest.fn();
    const r = render(
      <DefaultItemsUnlockedSheet
        visible
        onDismiss={onDismiss}
        onManageWardrobe={onManageWardrobe}
        ownItemCount={12}
        threshold={12}
      />,
    );

    act(() => pressableWith(r.root, `${TESTID}-manage`).props.onPress());
    expect(onManageWardrobe).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => pressableWith(r.root, `${TESTID}-dismiss`).props.onPress());
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
