/* eslint-env jest */
// Tests for the analytics seam (src/services/analytics.ts).
//
// The headline guarantee this file protects is the CONSENT GATE: before the
// user grants consent, the Mixpanel SDK must NEVER be constructed and no
// track()/identify() call must reach it. We mock the SDK with spies and assert
// exactly that, plus the grant/revoke lifecycle, the identify-before-People.set
// ordering, and init failure-retry. The seam holds a module singleton, so each
// test re-requires it (jest.resetModules) for clean state.

// SDK mock with spies. Method spies are module-scoped so we can assert on them
// regardless of which instance the seam constructs.
const mockInit = jest.fn(() => Promise.resolve());
const mockTrack = jest.fn();
const mockIdentify = jest.fn(() => Promise.resolve());
const mockPeopleSet = jest.fn();
const mockOptIn = jest.fn();
const mockOptOut = jest.fn();
const mockReset = jest.fn();
const mockFlush = jest.fn();
const mockRegisterSuper = jest.fn();
const mockSetGeo = jest.fn();
const mockMixpanelCtor = jest.fn().mockImplementation(() => ({
  init: mockInit,
  track: mockTrack,
  identify: mockIdentify,
  getPeople: () => ({ set: mockPeopleSet }),
  optInTracking: mockOptIn,
  optOutTracking: mockOptOut,
  reset: mockReset,
  flush: mockFlush,
  registerSuperProperties: mockRegisterSuper,
  setUseIpAddressForGeolocation: mockSetGeo,
}));

jest.mock('mixpanel-react-native', () => ({
  __esModule: true,
  Mixpanel: mockMixpanelCtor,
}));

// In-memory, test-controlled consent store (overrides the global jest.setup mock).
let mockConsentStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((k: string) =>
      Promise.resolve(k in mockConsentStore ? mockConsentStore[k] : null),
    ),
    setItem: jest.fn((k: string, v: string) => {
      mockConsentStore[k] = v;
      return Promise.resolve();
    }),
    removeItem: jest.fn((k: string) => {
      delete mockConsentStore[k];
      return Promise.resolve();
    }),
  },
}));

import { ANALYTICS_CONSENT_KEY } from '../../config/analytics';

type AnalyticsModule = typeof import('../analytics');

// Re-require for a fresh singleton (consent state lives in module scope).
const loadAnalytics = (): AnalyticsModule => require('../analytics');

// Let any queued microtasks settle.
const flushMicrotasks = () =>
  new Promise<void>(resolve => setImmediate(() => resolve()));

let consoleSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  mockConsentStore = {};
  consoleSpy = jest.spyOn(console, 'info').mockImplementation();
});

afterEach(() => {
  consoleSpy.mockRestore();
});

describe('analytics seam — track() logging', () => {
  it('does not throw when called', () => {
    const { track } = loadAnalytics();
    expect(() => track('test_event')).not.toThrow();
    expect(() => track('test_event', { foo: 'bar' })).not.toThrow();
  });

  it('logs event name + props to console.info in dev', () => {
    const { track } = loadAnalytics();
    track('test_event', { foo: 'bar' });
    expect(consoleSpy).toHaveBeenCalledWith('analytics.track', 'test_event', {
      foo: 'bar',
    });
  });

  it('logs with empty props when none passed', () => {
    const { track } = loadAnalytics();
    track('bare_event');
    expect(consoleSpy).toHaveBeenCalledWith('analytics.track', 'bare_event', {});
  });
});

describe('analytics seam — consent gate', () => {
  it('does NOT construct the SDK or send anything before consent', async () => {
    const a = loadAnalytics();
    a.track('outfit_favorited', { outfit_hash: 'h1' });
    a.identifyUser('user-1', { $email: 'a@b.co' });
    await flushMicrotasks();
    expect(mockMixpanelCtor).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it('initAnalytics() stays inert when consent was never granted', async () => {
    const a = loadAnalytics();
    await a.initAnalytics();
    expect(mockMixpanelCtor).not.toHaveBeenCalled();
  });

  it('initAnalytics() boots the SDK when consent was previously granted', async () => {
    mockConsentStore[ANALYTICS_CONSENT_KEY] = 'granted';
    const a = loadAnalytics();
    await a.initAnalytics();
    expect(mockMixpanelCtor).toHaveBeenCalledTimes(1);
    expect(mockInit).toHaveBeenCalledTimes(1);
    // Privacy posture: IP geolocation disabled.
    expect(mockSetGeo).toHaveBeenCalledWith(false);
  });

  it('grantAnalyticsConsent() persists, boots the SDK, and routes events to it', async () => {
    const a = loadAnalytics();
    await a.grantAnalyticsConsent();
    expect(mockConsentStore[ANALYTICS_CONSENT_KEY]).toBe('granted');
    expect(mockMixpanelCtor).toHaveBeenCalledTimes(1);
    a.track('outfit_favorited', { outfit_hash: 'h2' });
    expect(mockTrack).toHaveBeenCalledWith('outfit_favorited', {
      outfit_hash: 'h2',
    });
  });

  it('revokeAnalyticsConsent() opts out, resets, and stops further events', async () => {
    const a = loadAnalytics();
    await a.grantAnalyticsConsent();
    a.track('e1', {});
    expect(mockTrack).toHaveBeenCalledTimes(1);

    await a.revokeAnalyticsConsent();
    expect(mockOptOut).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(mockConsentStore[ANALYTICS_CONSENT_KEY]).toBe('revoked');

    mockTrack.mockClear();
    a.track('e2', {});
    expect(mockTrack).not.toHaveBeenCalled();
  });
});

describe('analytics seam — identity', () => {
  it('queues identity before consent and replays identify-before-People on init', async () => {
    const a = loadAnalytics();
    a.identifyUser('42', { $email: 'a@b.co' });
    expect(mockIdentify).not.toHaveBeenCalled(); // queued; SDK not up yet

    await a.grantAnalyticsConsent();
    expect(mockIdentify).toHaveBeenCalledWith('42');
    expect(mockPeopleSet).toHaveBeenCalledWith({ $email: 'a@b.co' });
    // The People profile must be written AFTER identify resolves, otherwise it
    // lands on the anonymous distinct_id.
    expect(mockIdentify.mock.invocationCallOrder[0]).toBeLessThan(
      mockPeopleSet.mock.invocationCallOrder[0],
    );
  });

  it('resetAnalytics() clears identity on the live SDK', async () => {
    const a = loadAnalytics();
    await a.grantAnalyticsConsent();
    a.resetAnalytics();
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});

describe('analytics seam — init resilience', () => {
  it('does not memoize a failed init — a later attempt retries', async () => {
    mockInit.mockRejectedValueOnce(new Error('boom'));
    const a = loadAnalytics();

    await expect(a.grantAnalyticsConsent()).rejects.toThrow('boom');
    // A transient init failure must not poison the session: the next call
    // retries instead of awaiting a permanently-rejected promise.
    await a.grantAnalyticsConsent();
    expect(mockInit).toHaveBeenCalledTimes(2);
  });
});
