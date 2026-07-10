// src/config/unleash.ts
//
// Unleash frontend connection config. Split by build mode, same as env.ts.
// The dev/prod tokens are FRONTEND tokens (read-only, env-scoped) — same risk
// class as the Mixpanel token already in config/analytics.ts. Prefer moving
// these to react-native-config / .env when that work lands (see CLAUDE.md TODO).

const UNLEASH_HOST = 'https://primary-production-ee649.up.railway.app';

// The Frontend API endpoint the client polls.
export const UNLEASH_URL = `${UNLEASH_HOST}/api/frontend`;

// Frontend tokens — env-scoped. The token already encodes its environment
// (`*:development.…` vs `*:production.…`), so `__DEV__` picks the matching one:
// dev builds read dev flags, release builds read prod flags.
const DEV_CLIENT_KEY =
  '*:development.a587512a159d1160d346f11b31c41162e99dcf8f5ff631ceed8f16d4';
const PROD_CLIENT_KEY =
  '*:production.4218ce067f64910e6643fe674c17c1f875e9c0acc4dcb21488e63690';

export const UNLEASH_CLIENT_KEY = __DEV__ ? DEV_CLIENT_KEY : PROD_CLIENT_KEY;

// Identifies this app in Unleash metrics + scopes metric counts.
export const UNLEASH_APP_NAME = 'auxi';

// Poll cadence (seconds). 30s is a good default; lower = fresher but chattier.
export const UNLEASH_REFRESH_INTERVAL = 30;
