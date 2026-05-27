// Mixpanel configuration.
//
// The project token is a PUBLIC client identifier — it is safe to ship in
// the app bundle and is NOT a secret API key (it only allows *writing*
// events into the project, which is exactly what the client does).
//
// Mirrors the __DEV__ split in `env.ts`: dev and prod must be SEPARATE
// Mixpanel projects because Simplified ID Merge and the project timezone
// cannot be changed retroactively. Keeping dev traffic out of the prod
// project is the whole reason for two tokens.
//
// TEMPORARY (per request): prod reuses the dev token so release builds aren't
// inert before a dedicated prod Mixpanel project exists.
// ⚠️ This routes PRODUCTION traffic into the DEV project. Because Simplified
// ID Merge and the project timezone are NOT retroactive, that data cannot be
// cleanly separated out later — treat the dev project as throwaway until the
// real prod token lands.
// TODO(prod, before first release): create the production Mixpanel project and
// replace PROD_TOKEN with its own token (do NOT ship the dev token to users).
const DEV_TOKEN = 'b402f392536a20f92a54f18dc5df1f93';
const PROD_TOKEN = DEV_TOKEN; // TEMP: real prod token pending — see note above

export const MIXPANEL_TOKEN: string = __DEV__ ? DEV_TOKEN : PROD_TOKEN;

// Data residency: the Mixpanel project is hosted in the EU zone, so the SDK
// MUST post to the EU ingestion endpoint. The SDK defaults to the US endpoint
// (https://api.mixpanel.com); events sent there for an EU-resident project are
// accepted (HTTP 200) but never stored — which is why nothing showed up.
export const MIXPANEL_SERVER_URL = 'https://api-eu.mixpanel.com';

// Persisted analytics-consent decision. EU/CA users must opt in before the
// SDK initialises (see services/analytics.ts). Versioned so a future policy
// change can force a fresh consent prompt by bumping the suffix.
export const ANALYTICS_CONSENT_KEY = 'auxi.analytics.consent.v1';
