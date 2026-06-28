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
import {
  MIXPANEL_TOKEN,
  MIXPANEL_SERVER_URL,
  ANALYTICS_CONSENT_KEY,
} from '../config/analytics';

type TrackProps = Record<string, unknown>;
type UserProfile = Record<string, unknown>;

// Singleton — null until consent is granted AND init() resolves.
let mixpanel: Mixpanel | null = null;
let initInFlight: Promise<void> | null = null;

// If identity is established before the SDK is up (cold start: user already
// authenticated, consent init still resolving), stash it and replay on init.
let pendingIdentity: {
  distinctId: string;
  profile?: UserProfile;
  superProps?: TrackProps;
} | null = null;

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
  // 3rd arg routes ingestion to the project's region (EU) — without it the SDK
  // posts to the US endpoint and events are silently dropped for an EU project.
  await instance.init(false, SUPER_PROPERTIES, MIXPANEL_SERVER_URL);
  // Privacy posture for EU/CA: don't derive geolocation from IP.
  instance.setUseIpAddressForGeolocation(false);
  mixpanel = instance;

  if (pendingIdentity) {
    const { distinctId, profile, superProps } = pendingIdentity;
    pendingIdentity = null;
    if (superProps) {
      mixpanel.registerSuperProperties(superProps);
    }
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
  // Dev: flush immediately so events land in the dashboard without waiting for
  // the SDK's batch timer (~60s) or an app-background. Prod keeps batching for
  // network/battery efficiency.
  if (__DEV__) {
    mixpanel?.flush();
  }
};

/**
 * Per-session dedup for `outfit_recommendation_viewed`. Prefetch / re-mount
 * means the same outfit can settle multiple times in one session; we only want
 * to count the first view per `outfit_hash`. Set lives module-level so dedup
 * spans component re-mounts but resets on app restart (per-session semantics).
 *
 * See spec.md §3.3 ★ and the tracking-plan §6 deferral that this resolves.
 */
const seenRecommendations = new Set<string>();

/**
 * Fire `outfit_recommendation_viewed` at most once per `outfit_hash` per
 * session. Use this from HomeScreen / OutfitSwipeDeck — never call
 * `track('outfit_recommendation_viewed', ...)` directly.
 */
export const trackRecommendationViewedOnce = (
  outfitHash: string,
  props: TrackProps = {},
): void => {
  if (!outfitHash || seenRecommendations.has(outfitHash)) {
    return;
  }
  seenRecommendations.add(outfitHash);
  track('outfit_recommendation_viewed', { outfit_hash: outfitHash, ...props });
};

// ── AU-362 Outfit Temperature override (6 events) ──────────────────────────
// Literal event names (no template strings). Props use bucket keys only — no
// PII, no raw user text. Numbers unquoted; unknown props omitted.

/** Lightbulb tapped → "Outfit Temperature" sheet opens. */
export const trackTemperatureModalOpened = (overrideActive: boolean): void => {
  track('temperature_modal_opened', { override_active: overrideActive });
};

/** A temperature radio option is selected in the sheet. */
export const trackTemperatureOptionSelected = (option: string): void => {
  track('temperature_option_selected', { option });
};

/** Apply tapped (before the resulting build resolves). */
export const trackTemperatureApplyClicked = (option: string): void => {
  track('temperature_apply_clicked', { option });
};

/** Apply succeeded with a non-weather bucket → an override is now active. */
export const trackTemperatureOverrideActive = (
  bucket: string,
  repTempC: number,
): void => {
  track('temperature_override_active', { bucket, rep_temp_c: repTempC });
};

/** Apply succeeded with `weather` while an override was active → override removed. */
export const trackTemperatureOverrideRemoved = (
  previousBucket: string,
): void => {
  track('temperature_override_removed', { previous_bucket: previousBucket });
};

/**
 * A recommendation build completed under an active temperature override.
 * Deduped per `outfit_hash` per session so "Show another" re-serving the same
 * outfit (or prefetch over-count) doesn't double-emit — mirrors the
 * `trackRecommendationViewedOnce` Set pattern.
 */
const seenTemperatureGenerations = new Set<string>();
export const trackRecommendationGeneratedByTemperatureOnce = (
  outfitHash: string,
  bucket: string,
  outfitCount: number,
): void => {
  if (!outfitHash || seenTemperatureGenerations.has(outfitHash)) {
    return;
  }
  seenTemperatureGenerations.add(outfitHash);
  track('recommendation_generated_by_temperature', {
    bucket,
    outfit_count: outfitCount,
  });
};

// ── Legal documents (Terms of Service / Privacy Policy) ────────────────────
// App Store blocker B5 (legal docs reachable in-app). Literal event name —
// no template strings. Props are bounded enums, lowercase, no PII.

/** A legal document screen was opened (Terms of Service or Privacy Policy). */
export const trackLegalDocumentViewed = (
  document: 'terms_of_service' | 'privacy_policy',
  source: 'welcome' | 'settings',
): void => {
  track('legal_document_viewed', { document, source });
};

// ── Schedule (outfit planning) ─────────────────────────────────────────────
// Adding to the schedule is ALREADY tracked at the screen level
// (`favourite_added_to_schedule` / `creation_added_to_schedule`, tracking-plan
// §5.18), so we do NOT re-fire a duplicate here — that would double-count the
// add funnel. Removing from the schedule had no event; this fills that gap.
// Literal event name (no template strings); `source` is a bounded enum — no
// outfit ids, no PII.

/** An outfit was removed from a planned day (unscheduled). */
export const trackOutfitUnscheduled = (
  source: 'favourite' | 'creation',
): void => {
  track('outfit_unscheduled', { source });
};

/**
 * Link events to a known user. Call after authentication. Uses the database
 * primary key as distinct_id (never email). Profile attributes go to
 * People, not event properties.
 */
export const identifyUser = (
  distinctId: string,
  profile?: UserProfile,
  superProps?: TrackProps,
): void => {
  if (__DEV__) {
    console.info('analytics.identify', distinctId, profile ?? {});
  }
  if (!mixpanel) {
    pendingIdentity = { distinctId, profile, superProps };
    return;
  }
  // Super properties auto-attach to every subsequent event, so user context
  // (id, gender, style_direction…) tags all events for segmentation.
  if (superProps) {
    mixpanel.registerSuperProperties(superProps);
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
