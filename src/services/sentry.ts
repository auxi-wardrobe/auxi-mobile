import * as Sentry from '@sentry/react-native';

/**
 * Sentry React Native SDK init.
 *
 * Org: auxi · Project: react-native
 *
 * The DSN is a public client identifier (safe to ship in app bundles).
 * If we later want to externalise it (e.g., switch between dev/prod
 * projects), move to `react-native-config` — same TODO as the API base URL
 * in `services/apiClient.ts`.
 *
 * `sendDefaultPii: false` keeps auth tokens, headers, and request bodies
 * out of Sentry. Do not flip this without a privacy review.
 */
const SENTRY_DSN =
  'https://0330bbfe810f0b89097461636f6eed08@o4511377654611968.ingest.us.sentry.io/4511377991467008';

export function initSentry(): void {
  Sentry.init({
    dsn: SENTRY_DSN,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    // Disable in dev so we don't pollute the project with simulator noise.
    enabled: !__DEV__,
  });
}

export { Sentry };
