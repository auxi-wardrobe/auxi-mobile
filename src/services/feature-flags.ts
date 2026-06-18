// src/services/feature-flags.ts
//
// Feature-flag seam — backed by Unleash (unleash-proxy-client).
// Single integration point: components use the `useFeatureFlag` hook; AuthContext
// calls identifyFlagUser / resetFlagUser. Nothing else imports the SDK.

import { UnleashClient } from 'unleash-proxy-client';
import {
  UNLEASH_URL,
  UNLEASH_CLIENT_KEY,
  UNLEASH_APP_NAME,
  UNLEASH_REFRESH_INTERVAL,
} from '../config/unleash';
import { asyncStorageProvider } from './unleash-storage';

// Flag names as literal constants — no magic strings at call sites (same rule
// as analytics event names). Add every new flag here.
export const FLAGS = {
  EXAMPLE: 'auxi_example_flag',
} as const;

export type FlagName = (typeof FLAGS)[keyof typeof FLAGS];

// Singleton client. FlagProvider in App.tsx starts it.
export const unleashClient = new UnleashClient({
  url: UNLEASH_URL,
  clientKey: UNLEASH_CLIENT_KEY,
  appName: UNLEASH_APP_NAME,
  refreshInterval: UNLEASH_REFRESH_INTERVAL,
  storageProvider: asyncStorageProvider,
});

if (__DEV__) {
  unleashClient.on('error', (err: unknown) =>
    console.warn('[unleash] error', err),
  );
}

// Re-fetch toggles for a new context, fire-and-forget. The context update is
// best-effort: a failed fetch leaves the last-known cache in place, and the
// poll loop retries on the next interval. We swallow (log in dev) rather than
// surface to the caller, which never awaits an identity change.
const applyContext = (
  context: Parameters<UnleashClient['updateContext']>[0],
) => {
  unleashClient.updateContext(context).catch(err => {
    if (__DEV__) {
      console.warn('[unleash] updateContext failed', err);
    }
  });
};

// Attach the logged-in user so % rollouts / targeting are stable per user.
// `updateContext` re-fetches toggles for the new context.
export const identifyFlagUser = (user: {
  id: number | string;
  email?: string;
  role?: string;
  gender?: string | null;
}): void => {
  applyContext({
    userId: String(user.id),
    properties: {
      ...(user.role ? { role: user.role } : {}),
      ...(user.gender ? { gender: user.gender } : {}),
    },
  });
};

// Clear identity on logout → back to anonymous evaluation.
export const resetFlagUser = (): void => {
  applyContext({ userId: undefined, properties: {} });
};
