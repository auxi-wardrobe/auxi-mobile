// Unleash (feature-flag) connection config — native (Metro) build.
//
// The frontend client key + optional URL override are read from the environment
// so NO token is ever hardcoded in the repo. The Unleash *frontend* token is a
// low-privilege, read-only, env-scoped client key (the Frontend API evaluates
// strategies server-side and returns only on/off results) — same risk class as
// the Mixpanel token in config/analytics.ts — but we still keep it out of source
// per the "no secrets in the repo" directive.
//
// SAFETY CONTRACT: if the client key is UNSET, `UNLEASH_ENABLED` is false. The
// provider still mounts (so the flag hooks always have a client) but it NEVER
// starts — no network call is made and EVERY flag stays default-OFF. A missing
// or misconfigured flag service therefore can never block app boot.
//
// Env injection note: there is no react-native-config yet (see auxi/CLAUDE.md
// "API config" TODO), so on native `process.env.*` only carries a value when a
// build-time inliner is wired; until then the key resolves to '' → default-OFF
// (safe). The web/vite build never imports this file — featureFlags.web.tsx is
// resolved instead — so `process` is never touched in the browser bundle.

// Self-hosted Unleash Frontend API (Railway). Overridable via env for staging.
const DEFAULT_UNLEASH_URL =
  'https://primary-production-ee649.up.railway.app/api/frontend';

// Read env off globalThis so we don't need a `process` global type declaration
// and never throw if `process` is absent on some runtime.
const env: Record<string, string | undefined> =
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env ?? {};

export const UNLEASH_URL: string =
  env.UNLEASH_FRONTEND_URL || DEFAULT_UNLEASH_URL;

export const UNLEASH_CLIENT_KEY: string = env.UNLEASH_FRONTEND_CLIENT_KEY || '';

// Identifies this app in Unleash metrics + scopes flag evaluation.
export const UNLEASH_APP_NAME = 'auxi';

// Frontend API poll cadence (seconds) and metrics flush cadence (seconds).
export const UNLEASH_REFRESH_INTERVAL = 30;
export const UNLEASH_METRICS_INTERVAL = 60;

// Only start the client (i.e. hit the network) when a real key is configured.
export const UNLEASH_ENABLED: boolean = UNLEASH_CLIENT_KEY.length > 0;
