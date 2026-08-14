/* eslint-env jest */
/**
 * NotifyMeScreen — the AU-442 "Macgie+ is coming soon" follow-up screen.
 *
 * Locks the structural contract:
 *   - the screen mounts (hero, all 6 feature rows, the Notify me CTA),
 *   - the close button goes back,
 *   - tapping "Notify me" swaps the label + testID to the confirmed state
 *     and the button goes inert (a second tap doesn't re-fire the handler).
 *
 * Reduce Motion is forced so PressScale mounts synchronously. i18n is stubbed
 * to echo keys. Navigation is stubbed to a spy so `goBack` can be asserted
 * without a real navigator.
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

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: { feature: 'see_on_me' } }),
}));

const mockTrack = jest.fn();
jest.mock('../../services/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}));

import { NotifyMeScreen } from '../NotifyMeScreen';

const findByTestID = (
  root: ReactTestInstance,
  id: string,
): ReactTestInstance[] =>
  root.findAll(n => typeof n.type === 'string' && n.props?.testID === id);

const pressableWith = (root: ReactTestInstance, id: string): ReactTestInstance =>
  root.findAll(
    n => n.props?.testID === id && typeof n.props?.onPress === 'function',
  )[0];

// Unlike `findByTestID` (host nodes only), this matches ANY node — needed to
// read `disabled` off the composite PressScale/Pressable, which carries the
// prop even though it isn't forwarded to every host descendant.
const oneByTestID = (root: ReactTestInstance, id: string): ReactTestInstance =>
  root.findAll(n => n.props?.testID === id)[0];

const render = (el: React.ReactElement): TestRenderer.ReactTestRenderer => {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(el);
  });
  return r;
};

describe('NotifyMeScreen', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    mockTrack.mockClear();
  });

  it('fires notify_me_viewed on mount with the routed feature (AU-442)', () => {
    render(<NotifyMeScreen />);
    expect(mockTrack).toHaveBeenCalledWith('notify_me_viewed', {
      feature: 'see_on_me',
    });
  });

  it('fires notify_me_tapped exactly once on "Notify me" (AU-442)', () => {
    const r = render(<NotifyMeScreen />);
    mockTrack.mockClear();
    act(() => {
      pressableWith(r.root, 'notify-me-cta').props.onPress();
    });
    expect(mockTrack).toHaveBeenCalledWith('notify_me_tapped', {
      feature: 'see_on_me',
    });
    expect(mockTrack).toHaveBeenCalledTimes(1);

    // Second tap while inert must NOT re-fire the event.
    act(() => {
      oneByTestID(r.root, 'notify-me-cta-confirmed').props.onPress?.();
    });
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it('mounts the header, all 6 feature rows and the Notify me CTA', () => {
    const r = render(<NotifyMeScreen />);
    expect(findByTestID(r.root, 'notify-me-feature-wardrobe').length).toBe(1);
    expect(findByTestID(r.root, 'notify-me-feature-see_on_me').length).toBe(1);
    expect(findByTestID(r.root, 'notify-me-feature-suggestions').length).toBe(
      1,
    );
    expect(findByTestID(r.root, 'notify-me-feature-enhance').length).toBe(1);
    expect(findByTestID(r.root, 'notify-me-feature-schedule').length).toBe(1);
    expect(findByTestID(r.root, 'notify-me-feature-canvas').length).toBe(1);
    // The 2 dropped Figma rows (locked decision #2) must NOT render.
    expect(findByTestID(r.root, 'notify-me-feature-capsule')).toHaveLength(0);
    expect(findByTestID(r.root, 'notify-me-feature-analysis')).toHaveLength(
      0,
    );
    expect(findByTestID(r.root, 'notify-me-cta').length).toBeGreaterThan(0);
  });

  it('goes back when the close button is pressed', () => {
    const r = render(<NotifyMeScreen />);
    act(() => {
      pressableWith(r.root, 'notify-me-close-button').props.onPress();
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('switches to the confirmed state on "Notify me" tap and goes inert', () => {
    const r = render(<NotifyMeScreen />);
    act(() => {
      pressableWith(r.root, 'notify-me-cta').props.onPress();
    });
    // testID flips (never undefined) per the stateful-testID convention.
    expect(findByTestID(r.root, 'notify-me-cta')).toHaveLength(0);
    const confirmed = findByTestID(r.root, 'notify-me-cta-confirmed');
    expect(confirmed.length).toBeGreaterThan(0);
    const json = JSON.stringify(r.toJSON());
    expect(json).toContain('notifyMe.notify_confirmed');
    expect(json).not.toContain('notifyMe.notify_cta');

    // The button is now disabled (PressScale/Pressable `disabled` prop) — a
    // second tap is a guarded no-op (`handleNotify` early-returns) so the
    // confirmed state holds and the handler doesn't re-fire.
    expect(oneByTestID(r.root, 'notify-me-cta-confirmed').props.disabled).toBe(
      true,
    );
    act(() => {
      oneByTestID(r.root, 'notify-me-cta-confirmed').props.onPress?.();
    });
    expect(findByTestID(r.root, 'notify-me-cta-confirmed').length).toBe(1);
    expect(findByTestID(r.root, 'notify-me-cta')).toHaveLength(0);
  });
});
