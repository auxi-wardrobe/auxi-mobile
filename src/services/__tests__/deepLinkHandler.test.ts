/* eslint-env jest */
// resolveNotificationData — FCM tap payload → navigation/open side-effect.
// Curated route allowlist (incl. the Creations→MyCreations route mapping),
// external-URL opening, and the unknown/missing → fallback-Home guarantee.

import { Linking } from 'react-native';
import { resolveNotificationData } from '../deepLinkHandler';

const makeNavRef = (ready = true) => ({
  isReady: () => ready,
  navigate: jest.fn(),
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
