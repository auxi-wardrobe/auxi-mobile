// Analytics seam — backed by Mixpanel (mixpanel-react-native).
//
// This is the single integration point for product analytics. Screens and
// hooks call `track(...)`; AuthContext calls `identifyUser` / `resetAnalytics`.
// Nothing else imports the Mixpanel SDK directly.
//
// CONSENT (EU/CA): the SDK is NOT constructed or initialised until the user
// has granted consent. Until then `track`/`identifyUser` are no-ops (dev
// console only), so no data leaves the device pre-consent. Wire the consent
// UI to `grantAnalyticsConsent` / `revokeAnalyticsConsent`.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Mixpanel } from 'mixpanel-react-native';
import { MIXPANEL_TOKEN, ANALYTICS_CONSENT_KEY } from '../config/analytics';

type TrackProps = Record<string, unknown>;
type UserProfile = Record<string, unknown>;

// Singleton — null until consent is granted AND init() resolves.
let mixpanel: Mixpanel | null = null;
let initInFlight: Promise<void> | null = null;

// If identity is established before the SDK is up (cold start: user already
// authenticated, consent init still resolving), stash it and replay on init.
let pendingIdentity: { distinctId: string; profile?: UserProfile } | null =
  null;

// Super properties auto-attach to every event. Kept minimal; app_version
// needs react-native-device-info (not installed) — tracked as a follow-up.
const SUPER_PROPERTIES = {
  platform: Platform.OS,
  app_environment: __DEV__ ? 'development' : 'production',
};

const readStoredConsent = async (): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(ANALYTICS_CONSENT_KEY)) === 'granted';
  } catch {
    return false;
  }
};

const doInit = async (): Promise<void> => {
  if (mixpanel) return;
  // No token for this build (e.g. release before the prod project exists) →
  // stay disabled rather than init against an empty project.
  if (!MIXPANEL_TOKEN) {
    if (__DEV__) {
      console.info('analytics: no Mixpanel token for this build; disabled');
    }
    return;
  }
  // trackAutomaticEvents=true captures app sessions/updates automatically.
  const instance = new Mixpanel(MIXPANEL_TOKEN, true);
  // We only ever reach here after consent, so opt-out default is false.
  await instance.init(false, SUPER_PROPERTIES);
  // Privacy posture for EU/CA: don't derive geolocation from IP.
  instance.setUseIpAddressForGeolocation(false);
  mixpanel = instance;

  if (pendingIdentity) {
    const { distinctId, profile } = pendingIdentity;
    pendingIdentity = null;
    // Await identify so the People profile below lands on the identified
    // user, not the anonymous distinct_id.
    await mixpanel.identify(distinctId);
    if (profile) {
      mixpanel.getPeople().set(profile);
    }
  }
};

// Single-flight init that does NOT memoize failures: if doInit rejects (e.g.
// transient AsyncStorage/native error) the next call retries instead of being
// stuck awaiting a permanently-rejected promise.
const ensureInit = (): Promise<void> => {
  if (!initInFlight) {
    initInFlight = doInit().catch(err => {
      initInFlight = null;
      throw err;
    });
  }
  return initInFlight;
};

/**
 * Call once on app start. Brings the SDK up ONLY if consent was previously
 * granted; otherwise stays inert until `grantAnalyticsConsent` is called.
 */
export const initAnalytics = async (): Promise<void> => {
  if (await readStoredConsent()) {
    await ensureInit();
  }
};

/** Grant analytics consent: persist the decision and bring the SDK up. */
export const grantAnalyticsConsent = async (): Promise<void> => {
  await AsyncStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
  await ensureInit();
};

/** Revoke analytics consent: persist, stop tracking, tear the SDK down. */
export const revokeAnalyticsConsent = async (): Promise<void> => {
  await AsyncStorage.setItem(ANALYTICS_CONSENT_KEY, 'revoked');
  if (mixpanel) {
    // optOutTracking() discards queued events and suppresses future sends;
    // a flush() afterwards would be a confusing no-op, so we omit it.
    mixpanel.optOutTracking();
    mixpanel.reset();
  }
  mixpanel = null;
  initInFlight = null;
  pendingIdentity = null;
};

/** Whether the user has granted analytics consent (persisted). */
export const hasAnalyticsConsent = (): Promise<boolean> => readStoredConsent();

/**
 * Track a product event. No-op beyond the dev console until consent + init
 * complete. Never throws — call sites must stay fire-and-forget.
 */
export const track = (event: string, props: TrackProps = {}): void => {
  // In dev, surface events to Metro console for simulator verification.
  if (__DEV__) {
    console.info('analytics.track', event, props);
  }
  mixpanel?.track(event, props);
};

/**
 * Link events to a known user. Call after authentication. Uses the database
 * primary key as distinct_id (never email). Profile attributes go to
 * People, not event properties.
 */
export const identifyUser = (
  distinctId: string,
  profile?: UserProfile,
): void => {
  if (__DEV__) {
    console.info('analytics.identify', distinctId, profile ?? {});
  }
  if (!mixpanel) {
    pendingIdentity = { distinctId, profile };
    return;
  }
  // Write the People profile only AFTER identify resolves, else it lands on
  // the anonymous profile. Fire-and-forget — never throws to the caller.
  mixpanel
    .identify(distinctId)
    .then(() => {
      if (profile) {
        mixpanel?.getPeople().set(profile);
      }
    })
    .catch(() => {
      /* identify failure is non-fatal; events continue under the prior id */
    });
};

/** Clear identity on logout / session expiry so the next user is not merged. */
export const resetAnalytics = (): void => {
  if (__DEV__) {
    console.info('analytics.reset');
  }
  pendingIdentity = null;
  mixpanel?.reset();
};
