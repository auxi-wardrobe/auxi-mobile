/* eslint-env jest */
/**
 * UpgradeScreen — the Macgie+ paywall reached from the Settings upgrade pill.
 *
 * Smoke-locks the structural contract:
 *   - the screen mounts (brand hero, feature grid, both plan cards, the
 *     Subscribe CTA and the legal links all render),
 *   - Yearly is the default-selected plan (its radio carries the `-selected`
 *     testID; Monthly's does not),
 *   - tapping the Monthly card flips the selection,
 *   - Subscribe / Restore are wired (pressing them doesn't throw).
 *
 * Reduce Motion is forced so PressScale mounts synchronously. i18n is stubbed
 * to echo keys, so copy assertions are locale-independent. Navigation is
 * stubbed to a spy so back / legal navigation can be asserted without a real
 * navigator.
 */
import React from 'react';
import TestRenderer, { act, ReactTestInstance } from 'react-test-renderer';

jest.mock('../../theme/motion', () => ({
  ...jest.requireActual('../../theme/motion'),
  useReducedMotion: () => true,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
// useFocusEffect runs its callback immediately (mirrors focus on mount) so the
// `paywall_viewed` view event fires; useRoute returns no params so `source`
// falls back to its 'settings' default.
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: undefined }),
  useFocusEffect: (cb: () => void) => cb(),
}));

const mockTrack = jest.fn();
jest.mock('../../services/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

const mockToastShow = jest.fn();
jest.mock('../../components/design-system/lib', () => ({
  toast: { show: (...args: unknown[]) => mockToastShow(...args) },
}));

import { UpgradeScreen } from '../UpgradeScreen';

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

describe('UpgradeScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockToastShow.mockClear();
    mockTrack.mockClear();
  });

  it('fires paywall_viewed on focus with source + default_plan', () => {
    render(<UpgradeScreen />);
    expect(mockTrack).toHaveBeenCalledWith('paywall_viewed', {
      source: 'settings',
      default_plan: 'yearly',
    });
  });

  it('mounts the hero, features, both plans and the subscribe CTA', () => {
    const r = render(<UpgradeScreen />);
    expect(findByTestID(r.root, 'upgrade-feature-wardrobe').length).toBe(1);
    expect(findByTestID(r.root, 'upgrade-feature-canvas').length).toBe(1);
    expect(findByTestID(r.root, 'upgrade-plan-yearly').length).toBe(1);
    expect(findByTestID(r.root, 'upgrade-plan-monthly').length).toBe(1);
    expect(
      findByTestID(r.root, 'upgrade-subscribe-button').length,
    ).toBeGreaterThan(0);
  });

  it('defaults to the Yearly plan selected', () => {
    const r = render(<UpgradeScreen />);
    expect(
      findByTestID(r.root, 'upgrade-plan-yearly-radio-selected').length,
    ).toBe(1);
    expect(findByTestID(r.root, 'upgrade-plan-monthly-radio').length).toBe(1);
    expect(
      findByTestID(r.root, 'upgrade-plan-monthly-radio-selected').length,
    ).toBe(0);
  });

  it('flips the selection to Monthly on tap', () => {
    const r = render(<UpgradeScreen />);
    act(() => {
      pressableWith(r.root, 'upgrade-plan-monthly').props.onPress();
    });
    expect(
      findByTestID(r.root, 'upgrade-plan-monthly-radio-selected').length,
    ).toBe(1);
    expect(
      findByTestID(r.root, 'upgrade-plan-yearly-radio-selected').length,
    ).toBe(0);
  });

  it('shows a placeholder toast on Subscribe (no billing backend yet)', () => {
    const r = render(<UpgradeScreen />);
    act(() => {
      pressableWith(r.root, 'upgrade-subscribe-button').props.onPress();
    });
    expect(mockToastShow).toHaveBeenCalledTimes(1);
  });

  it('opens the Terms document from the legal footer', () => {
    const r = render(<UpgradeScreen />);
    act(() => {
      pressableWith(r.root, 'upgrade-terms-link').props.onPress();
    });
    expect(mockNavigate).toHaveBeenCalledWith(
      'LegalDocument',
      expect.objectContaining({ documentType: 'terms' }),
    );
  });

  it('goes back from the header and tracks paywall_dismissed', () => {
    const r = render(<UpgradeScreen />);
    act(() => {
      pressableWith(r.root, 'upgrade-back-button').props.onPress();
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('paywall_dismissed', {
      source: 'settings',
    });
  });
});
