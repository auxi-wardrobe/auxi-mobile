/* eslint-env jest */
// resolveNotificationData — FCM tap payload → navigation/open side-effect.
// Curated route allowlist (incl. the Creations→MyCreations route mapping),
// external-URL opening, and the unknown/missing → fallback-Home guarantee.
//
// Also covers dispatchDeepLink / replayPendingDeepLink — the cold-start race
// fix: a deep link that arrives before the nav tree is ready must be stashed
// and replayed once nav becomes ready, not silently dropped. Those tests
// re-require the module (jest.resetModules) for a clean module-scope pending
// slot per test.

import { Linking } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { resolveNotificationData } from '../deepLinkHandler';

// verify-email dispatch fires a real API call (verifyEmailCall) as a
// fire-and-forget side effect; stub it so the regression test doesn't hit
// the network (no backend running in the test environment).
jest.mock('../auth', () => ({
  verifyEmail: jest.fn().mockResolvedValue({
    verified: true,
    already_verified: false,
    user: {},
  }),
}));

const makeNavRef = (ready = true) => ({
  isReady: () => ready,
  navigate: jest.fn(),
  dispatch: jest.fn(),
});

let openUrlSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
});

afterEach(() => openUrlSpy.mockRestore());

describe('resolveNotificationData — route kind', () => {
  it('navigates to an allowlisted curated screen', () => {
    const nav = makeNavRef();
    resolveNotificationData({ kind: 'route', screen: 'Schedule' }, nav as any);
    expect(nav.navigate).toHaveBeenCalledWith('Schedule');
    expect(openUrlSpy).not.toHaveBeenCalled();
  });

  it('maps the registry name Creations → the RN route MyCreations', () => {
    const nav = makeNavRef();
    resolveNotificationData({ kind: 'route', screen: 'Creations' }, nav as any);
    expect(nav.navigate).toHaveBeenCalledWith('MyCreations');
  });

  it('falls back to Home for a screen not in the allowlist', () => {
    const nav = makeNavRef();
    resolveNotificationData(
      { kind: 'route', screen: 'ItemDetail' },
      nav as any,
    );
    expect(nav.navigate).toHaveBeenCalledWith('Home');
  });
});

describe('resolveNotificationData — try-on render result', () => {
  it('navigates to TryOnResult with the composite url on completed', () => {
    const nav = makeNavRef();
    resolveNotificationData(
      {
        kind: 'route',
        screen: 'Creations',
        type: 'tryon_render',
        action: 'tryon_result',
        status: 'completed',
        composite_url: 'https://cdn.auxi.app/tryon/highres/u1/j1.png',
      },
      nav as any,
    );
    expect(nav.navigate).toHaveBeenCalledWith('TryOnResult', {
      compositeUrl: 'https://cdn.auxi.app/tryon/highres/u1/j1.png',
    });
  });

  it('falls back to Home on a failed render (no composite url)', () => {
    const nav = makeNavRef();
    resolveNotificationData(
      {
        kind: 'route',
        screen: 'Creations',
        type: 'tryon_render',
        action: 'tryon_result',
        status: 'failed',
      },
      nav as any,
    );
    expect(nav.navigate).toHaveBeenCalledWith('Home');
  });

  it('falls back to Home when completed but composite_url is missing', () => {
    const nav = makeNavRef();
    resolveNotificationData(
      {
        kind: 'route',
        screen: 'Creations',
        type: 'tryon_render',
        action: 'tryon_result',
        status: 'completed',
      },
      nav as any,
    );
    expect(nav.navigate).toHaveBeenCalledWith('Home');
  });
});

describe('resolveNotificationData — external kind', () => {
  it('opens a valid https url', () => {
    const nav = makeNavRef();
    resolveNotificationData(
      { kind: 'external', url: 'https://auxi.app/promo' },
      nav as any,
    );
    expect(openUrlSpy).toHaveBeenCalledWith('https://auxi.app/promo');
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  it('falls back to Home for a non-http(s) url', () => {
    const nav = makeNavRef();
    resolveNotificationData(
      { kind: 'external', url: 'javascript:alert(1)' },
      nav as any,
    );
    expect(openUrlSpy).not.toHaveBeenCalled();
    expect(nav.navigate).toHaveBeenCalledWith('Home');
  });
});

describe('resolveNotificationData — defensive', () => {
  it('falls back to Home on unknown kind', () => {
    const nav = makeNavRef();
    resolveNotificationData({ kind: 'mystery' }, nav as any);
    expect(nav.navigate).toHaveBeenCalledWith('Home');
  });

  it('falls back to Home on missing/empty data', () => {
    const nav = makeNavRef();
    resolveNotificationData(undefined, nav as any);
    expect(nav.navigate).toHaveBeenCalledWith('Home');
  });

  it('does nothing (no throw) when the nav ref is not ready', () => {
    const nav = makeNavRef(false);
    expect(() =>
      resolveNotificationData({ kind: 'route', screen: 'Home' }, nav as any),
    ).not.toThrow();
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  it('does nothing (no throw) when the nav ref is null', () => {
    expect(() =>
      resolveNotificationData({ kind: 'route', screen: 'Home' }, null),
    ).not.toThrow();
  });
});

describe('dispatchDeepLink / replayPendingDeepLink — cold-start race', () => {
  type DeepLinkModule = typeof import('../deepLinkHandler');
  const loadModule = (): DeepLinkModule => require('../deepLinkHandler');

  beforeEach(() => {
    jest.resetModules();
  });

  it('does not navigate and does not throw when nav is not ready', async () => {
    const { dispatchDeepLink } = loadModule();
    const notReady = makeNavRef(false);
    await dispatchDeepLink(
      { kind: 'reset-password', token: 't1' },
      { navRef: notReady as any },
    );
    expect(notReady.navigate).not.toHaveBeenCalled();
  });

  it('replays a stored link once nav becomes ready', async () => {
    const { dispatchDeepLink, replayPendingDeepLink } = loadModule();
    const notReady = makeNavRef(false);
    await dispatchDeepLink(
      { kind: 'reset-password', token: 't1', email: 'a@b.com' },
      { navRef: notReady as any },
    );
    expect(notReady.navigate).not.toHaveBeenCalled();
    expect(notReady.dispatch).not.toHaveBeenCalled();

    const ready = makeNavRef(true);
    await replayPendingDeepLink(ready as any);

    // reset-password now resets the Auth stack (dispatch), not a plain
    // navigate — see the "reset-password stack reset" describe block below
    // for the full shape assertion.
    expect(ready.navigate).not.toHaveBeenCalled();
    expect(ready.dispatch).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when there is no pending link', async () => {
    const { replayPendingDeepLink } = loadModule();
    const ready = makeNavRef(true);
    await replayPendingDeepLink(ready as any);
    expect(ready.navigate).not.toHaveBeenCalled();
    expect(ready.dispatch).not.toHaveBeenCalled();
  });

  it('clears the pending link after a successful replay (no double-fire)', async () => {
    const { dispatchDeepLink, replayPendingDeepLink } = loadModule();
    const notReady = makeNavRef(false);
    await dispatchDeepLink(
      { kind: 'reset-password', token: 't1' },
      { navRef: notReady as any },
    );

    const readyA = makeNavRef(true);
    await replayPendingDeepLink(readyA as any);
    expect(readyA.dispatch).toHaveBeenCalledTimes(1);

    const readyB = makeNavRef(true);
    await replayPendingDeepLink(readyB as any);
    expect(readyB.dispatch).not.toHaveBeenCalled();
  });
});

describe('dispatchDeepLink — reset-password resets the Auth stack', () => {
  type DeepLinkModule = typeof import('../deepLinkHandler');
  const loadModule = (): DeepLinkModule => require('../deepLinkHandler');

  beforeEach(() => {
    jest.resetModules();
  });

  it('dispatches a CommonActions.reset with a 2-route Auth stack (email present)', async () => {
    const { dispatchDeepLink } = loadModule();
    const nav = makeNavRef(true);

    await dispatchDeepLink(
      { kind: 'reset-password', token: 't1', email: 'a@b.com' },
      { navRef: nav as any },
    );

    expect(nav.navigate).not.toHaveBeenCalled();
    expect(nav.dispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Auth',
            state: {
              index: 1,
              routes: [
                {
                  name: 'ForgotPasswordRequest',
                  params: { email: 'a@b.com' },
                },
                {
                  name: 'ResetNewPassword',
                  params: { token: 't1', email: 'a@b.com' },
                },
              ],
            },
          },
        ],
      }),
    );
  });

  it('dispatches with an empty-string ForgotPasswordRequest email when the link has none', async () => {
    const { dispatchDeepLink } = loadModule();
    const nav = makeNavRef(true);

    await dispatchDeepLink(
      { kind: 'reset-password', token: 't2' },
      { navRef: nav as any },
    );

    expect(nav.dispatch).toHaveBeenCalledWith(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Auth',
            state: {
              index: 1,
              routes: [
                { name: 'ForgotPasswordRequest', params: { email: '' } },
                {
                  name: 'ResetNewPassword',
                  params: { token: 't2', email: undefined },
                },
              ],
            },
          },
        ],
      }),
    );
  });

  it('regression: verify-email still uses a plain navigate, not dispatch/reset', async () => {
    const { dispatchDeepLink } = loadModule();
    const nav = makeNavRef(true);

    await dispatchDeepLink(
      { kind: 'verify-email', token: 't3' },
      { navRef: nav as any },
    );

    expect(nav.navigate).toHaveBeenCalledWith('Auth', {
      screen: 'Verified',
      params: { source: 'signup' },
    });
    expect(nav.dispatch).not.toHaveBeenCalled();
  });
});
