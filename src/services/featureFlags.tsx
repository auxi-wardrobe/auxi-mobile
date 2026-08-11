// Feature-flag seam — Unleash via @unleash/unleash-react-native-sdk.
//
// This is the ONLY module on native that imports the Unleash SDK
// (featureFlags.web.tsx is the web no-op counterpart, resolved by vite). The RN
// SDK auto-provides AsyncStorage persistence + a crypto.getRandomValues polyfill
// (react-native-get-random-values), so we do NOT pass a storageProvider or
// hand-roll crypto.
//
// NON-BLOCKING BY CONSTRUCTION — the #1 rule. Unleash was reverted twice before
// on suspected boot-coupling; this layer can never gate app boot or the
// new-user flow:
//   • The client is constructed once, wrapped in try/catch — a bad config can
//     never throw during App render.
//   • `FeatureFlagProvider` renders its children synchronously; it NEVER gates on
//     `flagsReady`. Flags resolve async and default to OFF until then.
//   • The client only start()s (hits the network) when UNLEASH_ENABLED — i.e. a
//     real frontend key is configured. Unset key → no network, flags stay OFF.
//   • An 'error' listener swallows fetch/crypto failures (dev-logs only).
// Net effect: an Unleash outage / misconfig / unlinked native crypto module
// leaves every flag OFF and the app booting normally.

import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import {
  FlagProvider,
  UnleashClient,
  useUnleashClient,
  useUnleashContext,
} from '@unleash/unleash-react-native-sdk';
import { useAuth } from '../context/AuthContext';
import {
  UNLEASH_APP_NAME,
  UNLEASH_CLIENT_KEY,
  UNLEASH_ENABLED,
  UNLEASH_METRICS_INTERVAL,
  UNLEASH_REFRESH_INTERVAL,
  UNLEASH_URL,
} from '../config/unleash';

// Flag-name constants — no magic strings at call sites (mirrors the analytics
// event-name rule). Register every flag the app reads here.
export const FLAGS = {
  TRENDING_ITEM_DROP: 'trending_item_drop',
} as const;

export type FlagName = (typeof FLAGS)[keyof typeof FLAGS];

// Singleton client, constructed defensively. When there is no real key we still
// construct (with a harmless sentinel so the constructor is happy and the hooks
// always have a client) but `startClient` below stays false, so it never hits
// the network.
let client: UnleashClient | null = null;
try {
  client = new UnleashClient({
    url: UNLEASH_URL,
    clientKey: UNLEASH_CLIENT_KEY || 'unset',
    appName: UNLEASH_APP_NAME,
    refreshInterval: UNLEASH_REFRESH_INTERVAL,
    metricsInterval: UNLEASH_METRICS_INTERVAL,
  });
  client.on('error', (err: unknown) => {
    if (__DEV__) {
      console.warn('[unleash] client error (flags stay OFF)', err);
    }
  });
} catch (err) {
  if (__DEV__) {
    console.warn('[unleash] client construction failed (flags OFF)', err);
  }
  client = null;
}

// Exposed so `useFeatureFlag` can read toggles directly off the singleton —
// provider-independent, so it can never throw even if the provider is absent.
export const unleashClient = client;

// Bridge: shares the analytics/user identity with Unleash so % rollouts and
// role targeting stay stable per user, and force-refreshes toggles on
// foreground. Renders nothing. Lives INSIDE FlagProvider so the SDK context
// hooks resolve.
const UnleashUserBridge: React.FC = () => {
  const { user } = useAuth();
  const updateContext = useUnleashContext();
  const sdkClient = useUnleashClient();
  const userId = user?.id != null ? String(user.id) : undefined;

  // Attach (or clear) the user id whenever it changes. Fire-and-forget: a failed
  // refresh keeps the last-known cache; the poll loop retries.
  useEffect(() => {
    updateContext(userId ? { userId } : { userId: undefined }).catch(() => {
      /* non-fatal — polling applies the new context on the next tick */
    });
  }, [updateContext, userId]);

  // Refresh the instant the app returns to the foreground (on top of the
  // interval poll) so a rollout flip reflects without waiting up to 30s.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        sdkClient.updateToggles().catch(() => {
          /* non-fatal — interval polling will retry */
        });
      }
    });
    return () => sub.remove();
  }, [sdkClient]);

  return null;
};

// Root provider. Wrap the app tree with this (inside AuthProvider). Renders
// children immediately — Unleash can never gate boot.
export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  if (!client) {
    // Construction failed — degrade to no flags; the app still renders. The
    // flag hooks read the (null) singleton directly and return false.
    return <>{children}</>;
  }
  return (
    <FlagProvider unleashClient={client} startClient={UNLEASH_ENABLED}>
      <UnleashUserBridge />
      {children}
    </FlagProvider>
  );
};
