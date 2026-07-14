// RevenueCat configuration.
//
// The iOS "public SDK key" is a PUBLIC client identifier (like the Mixpanel
// project token in config/analytics.ts) — it is safe to ship in the app bundle
// and is NOT a secret. It only authorises the client to read offerings and
// start purchases scoped to this app; receipt validation + entitlement grants
// happen server-side (RevenueCat → backend webhook, the authority for
// `is_premium`).
//
// The real key is provisioned by the CEO once the RevenueCat project exists
// (see plan: plans/260714-1013-real-paywall-macgie-plus/plan.md → HUMAN-ONLY
// prerequisites). Until then this stays an empty placeholder and the RC service
// no-ops (getOfferings() returns null → the paywall shows a graceful error
// instead of crashing). DO NOT commit a real key here — when externalised
// config (react-native-config / .env) lands, read it from there.
//
// NOTE: there is currently no dev/prod key split. RevenueCat resolves the
// StoreKit environment (sandbox vs production) from the running build itself, so
// a single public key works for both TestFlight/sandbox and App Store.
export const RC_IOS_API_KEY: string = '';

// RevenueCat entitlement identifier (must match the entitlement configured in
// the RevenueCat dashboard). Single source of truth for the "has Macgie+"
// check — see plan Contract section.
export const RC_ENTITLEMENT_ID = 'macgie_plus';
