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
import { parseDeepLink, resolveNotificationData } from '../deepLinkHandler';

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

// Route-name sets mirroring AppNavigator's three mutually-exclusive root
// `Stack.Navigator` branches (see AppNavigator.tsx): logged-out (`Auth`
// only), first-login onboarding (Welcome…OnboardingOutro, no Discovery
// routes), and the post-onboarding authed tree (Home, Discovery routes,
// etc). `isDiscoveryRouteMounted` checks `routeNames` (the full screen set
// on the CURRENT branch), not just the active route — these constants let
// tests simulate each branch precisely.
const AUTH_ROUTE_NAMES = ['Auth'];
const ONBOARDING_ROUTE_NAMES = [
  'Welcome',
  'LocationPermission',
  'OnboardingWardrobe',
  'OnboardingFit',
  'OnboardingStyles',
  'OnboardingLoading',
  'OnboardingCompleted',
  'OnboardingOutro',
];
const AUTHED_ROUTE_NAMES = [
  'Home',
  'Settings',
  'Discovery',
  'DiscoveryOutfitDetail',
];

// `routeNames` defaults to the authed-tree set — pass `AUTH_ROUTE_NAMES` or
// `ONBOARDING_ROUTE_NAMES` to simulate the other two root-stack shapes for
// the discovery-outfit stash/replay tests. `rootRouteName` (first entry of
// `routes`) defaults to the first configured route name.
const makeNavRef = (
  ready = true,
  routeNames: string[] = AUTHED_ROUTE_NAMES,
) => ({
  isReady: () => ready,
  navigate: jest.fn(),
  dispatch: jest.fn(),
  getState: () => ({
    routeNames,
    routes: [{ name: routeNames[0] }],
  }),
  // `isDiscoveryRouteMounted` reads this, not `getState()` (see the AU-457
  // review-fix round-2 comment in deepLinkHandler.ts) — keep in sync with
  // `getState()`'s `routes[0]` above, same "current root route" semantics.
  getCurrentRoute: () => ({ name: routeNames[0] }),
});

let openUrlSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
});

afterEach(() => openUrlSpy.mockRestore());

// AU-457 phase 09 — the parser must stay kind-aware: the two auth kinds
// still require `token`, the new `discovery-outfit` kind requires `id`
// instead. Regression coverage for both auth kinds is included so a future
// change to the discovery branch can't silently break them.
describe('parseDeepLink — kind-aware validation (AU-457)', () => {
  it('parses a discovery-outfit custom-scheme link', () => {
    expect(parseDeepLink('auxi://discovery-outfit?id=outfit-1')).toEqual({
      kind: 'discovery-outfit',
      id: 'outfit-1',
    });
  });

  it('parses a discovery-outfit universal link', () => {
    expect(
      parseDeepLink('https://macgie.com/discovery-outfit?id=outfit-2'),
    ).toEqual({ kind: 'discovery-outfit', id: 'outfit-2' });
  });

  it('returns null for a discovery-outfit link missing id', () => {
    expect(parseDeepLink('auxi://discovery-outfit')).toBeNull();
    expect(parseDeepLink('auxi://discovery-outfit?token=t1')).toBeNull();
  });

  it('regression: verify-email still requires and parses token', () => {
    expect(parseDeepLink('auxi://verify-email?token=t1')).toEqual({
      kind: 'verify-email',
      token: 't1',
      email: undefined,
    });
    expect(parseDeepLink('auxi://verify-email')).toBeNull();
  });

  it('regression: reset-password still requires and parses token', () => {
    expect(
      parseDeepLink('auxi://reset-password?token=t2&email=a@b.com'),
    ).toEqual({ kind: 'reset-password', token: 't2', email: 'a@b.com' });
    expect(parseDeepLink('auxi://reset-password')).toBeNull();
  });

  it('returns null for an unknown slug', () => {
    expect(parseDeepLink('auxi://some-unknown?id=1')).toBeNull();
  });

  it('returns null for a non-auxi, non-macgie.com URL', () => {
    expect(parseDeepLink('https://example.com/discovery-outfit?id=1')).toBeNull();
  });
});

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

describe('resolveNotificationData — beautify result', () => {
  it('navigates to the Enhance result screen with itemId when ready', () => {
    const nav = makeNavRef();
    resolveNotificationData(
      {
        kind: 'route',
        screen: 'Home',
        type: 'beautify_result',
        action: 'beautify_result',
        status: 'ready',
        item_id: 'item-1',
      },
      nav as any,
    );
    expect(nav.navigate).toHaveBeenCalledWith('EnhanceImage', {
      itemId: 'item-1',
      displayUri: '',
      origin: 'wardrobe',
    });
  });

  it('falls back to Home on a failed beautify job', () => {
    const nav = makeNavRef();
    resolveNotificationData(
      {
        kind: 'route',
        screen: 'Home',
        type: 'beautify_result',
        action: 'beautify_result',
        status: 'failed',
        item_id: 'item-1',
      },
      nav as any,
    );
    expect(nav.navigate).toHaveBeenCalledWith('Home');
  });

  it('falls back to Home when ready but item_id is missing', () => {
    const nav = makeNavRef();
    resolveNotificationData(
      {
        kind: 'route',
        screen: 'Home',
        type: 'beautify_result',
        action: 'beautify_result',
        status: 'ready',
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

// AU-457 phase 09 — discovery-outfit dispatch: route-then-resolve (navigate
// with just the id, the detail screen owns the fetch), plus the logged-out
// stash/replay-after-login path (`isAuthedTreeMounted`).
describe('dispatchDeepLink — discovery-outfit (AU-457)', () => {
  type DeepLinkModule = typeof import('../deepLinkHandler');
  const loadModule = (): DeepLinkModule => require('../deepLinkHandler');

  beforeEach(() => {
    jest.resetModules();
  });

  it('navigates straight to DiscoveryOutfitDetail with source: deep_link when the authed tree is mounted', async () => {
    const { dispatchDeepLink } = loadModule();
    const nav = makeNavRef(true, AUTHED_ROUTE_NAMES);

    await dispatchDeepLink(
      { kind: 'discovery-outfit', id: 'outfit-1' },
      { navRef: nav as any },
    );

    expect(nav.navigate).toHaveBeenCalledWith('DiscoveryOutfitDetail', {
      outfitId: 'outfit-1',
      source: 'deep_link',
    });
  });

  it('stashes instead of navigating when the root stack is still Auth (logged out)', async () => {
    const { dispatchDeepLink } = loadModule();
    const loggedOut = makeNavRef(true, AUTH_ROUTE_NAMES);

    await dispatchDeepLink(
      { kind: 'discovery-outfit', id: 'outfit-2' },
      { navRef: loggedOut as any },
    );

    expect(loggedOut.navigate).not.toHaveBeenCalled();
  });

  it('replays the stashed link once the authed tree is mounted (post-login)', async () => {
    const { dispatchDeepLink, replayPendingDeepLink } = loadModule();
    const loggedOut = makeNavRef(true, AUTH_ROUTE_NAMES);

    await dispatchDeepLink(
      { kind: 'discovery-outfit', id: 'outfit-3' },
      { navRef: loggedOut as any },
    );
    expect(loggedOut.navigate).not.toHaveBeenCalled();

    const loggedIn = makeNavRef(true, AUTHED_ROUTE_NAMES);
    await replayPendingDeepLink(loggedIn as any);

    expect(loggedIn.navigate).toHaveBeenCalledWith('DiscoveryOutfitDetail', {
      outfitId: 'outfit-3',
      source: 'deep_link',
    });
  });

  // Code-review High #2 regression: a first-login user (root stack is the
  // onboarding branch — Welcome…OnboardingOutro, no Discovery routes) taps a
  // Discovery social link mid-onboarding. The link must stay stashed (not
  // silently dropped by navigating into a tree without the route) and must
  // replay once onboarding completes and the authed tree (with
  // DiscoveryOutfitDetail) mounts — however long that takes, not just the
  // one post-login replay attempt.
  it('stashes instead of navigating when the root stack is the first-login onboarding branch', async () => {
    const { dispatchDeepLink } = loadModule();
    const onboarding = makeNavRef(true, ONBOARDING_ROUTE_NAMES);

    await dispatchDeepLink(
      { kind: 'discovery-outfit', id: 'outfit-4' },
      { navRef: onboarding as any },
    );

    expect(onboarding.navigate).not.toHaveBeenCalled();
  });

  it('replays the stashed link once onboarding completes and the authed tree mounts (not lost)', async () => {
    const { dispatchDeepLink, replayPendingDeepLink } = loadModule();
    const onboarding = makeNavRef(true, ONBOARDING_ROUTE_NAMES);

    // Link opens while the user is still mid-onboarding — must stash.
    await dispatchDeepLink(
      { kind: 'discovery-outfit', id: 'outfit-5' },
      { navRef: onboarding as any },
    );
    expect(onboarding.navigate).not.toHaveBeenCalled();

    // A replay attempt while still mid-onboarding (mirrors AppNavigator's
    // `[user]`-keyed effect firing the moment `user` first becomes truthy,
    // before onboarding finishes) must re-stash, not drop the link.
    const stillOnboarding = makeNavRef(true, ONBOARDING_ROUTE_NAMES);
    await replayPendingDeepLink(stillOnboarding as any);
    expect(stillOnboarding.navigate).not.toHaveBeenCalled();

    // Onboarding finishes — the authed tree (with Discovery routes) mounts.
    // The link must still be there to replay, not lost.
    const authedAfterOnboarding = makeNavRef(true, AUTHED_ROUTE_NAMES);
    await replayPendingDeepLink(authedAfterOnboarding as any);

    expect(authedAfterOnboarding.navigate).toHaveBeenCalledWith(
      'DiscoveryOutfitDetail',
      { outfitId: 'outfit-5', source: 'deep_link' },
    );
  });
});

// AU-457 phase 09 — `markAuthDeepLinkSeen` must stay scoped to the two
// auth-recovery kinds; a discovery-outfit link is not an auth-recovery
// context and must NOT suppress a real session-expired toast.
describe('registerDeepLinkListeners — does not mark the auth window for discovery-outfit', () => {
  type DeepLinkModule = typeof import('../deepLinkHandler');
  const loadModule = (): DeepLinkModule => require('../deepLinkHandler');

  let getInitialURLSpy: jest.SpyInstance;
  let addEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    getInitialURLSpy = jest
      .spyOn(Linking, 'getInitialURL')
      .mockResolvedValue(null);
    addEventListenerSpy = jest
      .spyOn(Linking, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as any);
  });

  afterEach(() => {
    getInitialURLSpy.mockRestore();
    addEventListenerSpy.mockRestore();
  });

  const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };

  it('does not mark the window on a cold-start discovery-outfit link', async () => {
    getInitialURLSpy.mockResolvedValue('auxi://discovery-outfit?id=outfit-1');
    const { registerDeepLinkListeners, wasAuthDeepLinkRecentlySeen } =
      loadModule();
    registerDeepLinkListeners(() => null);
    await flush();
    expect(wasAuthDeepLinkRecentlySeen()).toBe(false);
  });

  it('does not mark the window on a warm-start discovery-outfit link', async () => {
    const { registerDeepLinkListeners, wasAuthDeepLinkRecentlySeen } =
      loadModule();
    registerDeepLinkListeners(() => null);
    await flush();

    const urlHandler = addEventListenerSpy.mock.calls[0][1] as (event: {
      url: string;
    }) => void;
    urlHandler({ url: 'auxi://discovery-outfit?id=outfit-2' });
    await flush();

    expect(wasAuthDeepLinkRecentlySeen()).toBe(false);
  });
});

// Session-expired UX guard (see deepLinkHandler.ts comment above
// markAuthDeepLinkSeen): AuthContext checks this marker so a cold-start
// "session expired" toast doesn't fire on top of a reset-password /
// verify-email deep link landing.
describe('markAuthDeepLinkSeen / wasAuthDeepLinkRecentlySeen', () => {
  type DeepLinkModule = typeof import('../deepLinkHandler');
  const loadModule = (): DeepLinkModule => require('../deepLinkHandler');

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns false when nothing has been marked', () => {
    const { wasAuthDeepLinkRecentlySeen } = loadModule();
    expect(wasAuthDeepLinkRecentlySeen()).toBe(false);
  });

  it('returns true immediately after marking', () => {
    const { markAuthDeepLinkSeen, wasAuthDeepLinkRecentlySeen } =
      loadModule();
    markAuthDeepLinkSeen();
    expect(wasAuthDeepLinkRecentlySeen()).toBe(true);
  });

  it('returns false once the grace window has elapsed', () => {
    const { markAuthDeepLinkSeen, wasAuthDeepLinkRecentlySeen } =
      loadModule();
    markAuthDeepLinkSeen();
    jest.advanceTimersByTime(10_001);
    expect(wasAuthDeepLinkRecentlySeen()).toBe(false);
  });
});

describe('registerDeepLinkListeners — marks the auth deep-link window', () => {
  type DeepLinkModule = typeof import('../deepLinkHandler');
  const loadModule = (): DeepLinkModule => require('../deepLinkHandler');

  let getInitialURLSpy: jest.SpyInstance;
  let addEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    getInitialURLSpy = jest
      .spyOn(Linking, 'getInitialURL')
      .mockResolvedValue(null);
    addEventListenerSpy = jest
      .spyOn(Linking, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as any);
  });

  afterEach(() => {
    getInitialURLSpy.mockRestore();
    addEventListenerSpy.mockRestore();
  });

  const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };

  it('marks the window on a cold-start reset-password link', async () => {
    getInitialURLSpy.mockResolvedValue(
      'auxi://reset-password?token=t1&email=a@b.com',
    );
    const { registerDeepLinkListeners, wasAuthDeepLinkRecentlySeen } =
      loadModule();
    registerDeepLinkListeners(() => null);
    await flush();
    expect(wasAuthDeepLinkRecentlySeen()).toBe(true);
  });

  it('marks the window on a cold-start verify-email link', async () => {
    getInitialURLSpy.mockResolvedValue('auxi://verify-email?token=t1');
    const { registerDeepLinkListeners, wasAuthDeepLinkRecentlySeen } =
      loadModule();
    registerDeepLinkListeners(() => null);
    await flush();
    expect(wasAuthDeepLinkRecentlySeen()).toBe(true);
  });

  it('does not mark for a cold-start link it does not recognise', async () => {
    getInitialURLSpy.mockResolvedValue('auxi://some-unknown?token=t1');
    const { registerDeepLinkListeners, wasAuthDeepLinkRecentlySeen } =
      loadModule();
    registerDeepLinkListeners(() => null);
    await flush();
    expect(wasAuthDeepLinkRecentlySeen()).toBe(false);
  });

  it('does not mark when there is no initial URL', async () => {
    getInitialURLSpy.mockResolvedValue(null);
    const { registerDeepLinkListeners, wasAuthDeepLinkRecentlySeen } =
      loadModule();
    registerDeepLinkListeners(() => null);
    await flush();
    expect(wasAuthDeepLinkRecentlySeen()).toBe(false);
  });

  it('marks the window on a warm-start reset-password link', async () => {
    const { registerDeepLinkListeners, wasAuthDeepLinkRecentlySeen } =
      loadModule();
    registerDeepLinkListeners(() => null);
    await flush(); // let the cold-start getInitialURL(null) resolve first

    const urlHandler = addEventListenerSpy.mock.calls[0][1] as (event: {
      url: string;
    }) => void;
    urlHandler({ url: 'auxi://reset-password?token=t2' });
    await flush();

    expect(wasAuthDeepLinkRecentlySeen()).toBe(true);
  });

  it('does not mark on a warm-start link it does not recognise', async () => {
    const { registerDeepLinkListeners, wasAuthDeepLinkRecentlySeen } =
      loadModule();
    registerDeepLinkListeners(() => null);
    await flush();

    const urlHandler = addEventListenerSpy.mock.calls[0][1] as (event: {
      url: string;
    }) => void;
    urlHandler({ url: 'auxi://some-unknown?token=t2' });
    await flush();

    expect(wasAuthDeepLinkRecentlySeen()).toBe(false);
  });
});
