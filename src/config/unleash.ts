// Unleash (feature-flag) connection config — native (Metro) build.
//
// The frontend client key is embedded per-env below, split by `__DEV__` the
// same way config/env.ts picks the API host. Unleash *frontend* tokens are
// low-privilege, read-only, env-scoped client keys (the Frontend API evaluates
// strategies server-side and returns only on/off results) — same risk class as
// the Mixpanel token in config/analytics.ts — so they are safe to ship in the
// client bundle. This app has NO build-time env injector (no react-native-config
// — see auxi/CLAUDE.md "API config" TODO), so reading the key from `process.env`
// resolves to '' on native and the flag can never turn ON; embedding the token
// is what actually makes the client start.
//
// SAFETY CONTRACT: if the client key is empty, `UNLEASH_ENABLED` is false. The
// provider still mounts (so the flag hooks always have a client) but it NEVER
// starts — no network call is made and EVERY flag stays default-OFF. A missing
// or misconfigured flag service therefore can never block app boot.
//
// The web/vite build never imports this file — services/featureFlags.web.tsx is
// resolved instead — so the native SDK is never touched in the browser bundle.

// Self-hosted Unleash Frontend API (Railway).
const DEFAULT_UNLEASH_URL =
  'https://primary-production-ee649.up.railway.app/api/frontend';

export const UNLEASH_URL: string = DEFAULT_UNLEASH_URL;

// Frontend tokens — env-scoped. The token already encodes its environment
// (`*:development.…` vs `*:production.…`), so `__DEV__` picks the matching one:
// dev builds read dev flags, release builds read prod flags. These are the same
// frontend tokens the original Unleash integration shipped (PR #95 / #249).
const DEV_CLIENT_KEY =
  '*:development.a587512a159d1160d346f11b31c41162e99dcf8f5ff631ceed8f16d4';
const PROD_CLIENT_KEY =
  '*:production.4218ce067f64910e6643fe674c17c1f875e9c0acc4dcb21488e63690';

export const UNLEASH_CLIENT_KEY: string = __DEV__
  ? DEV_CLIENT_KEY
  : PROD_CLIENT_KEY;

// Identifies this app in Unleash metrics + scopes flag evaluation.
export const UNLEASH_APP_NAME = 'auxi';

// Frontend API poll cadence (seconds) and metrics flush cadence (seconds).
export const UNLEASH_REFRESH_INTERVAL = 30;
export const UNLEASH_METRICS_INTERVAL = 60;

// Only start the client (i.e. hit the network) when a real key is configured.
export const UNLEASH_ENABLED: boolean = UNLEASH_CLIENT_KEY.length > 0;
