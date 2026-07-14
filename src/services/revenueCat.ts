// RevenueCat service — the single integration seam for in-app purchases.
//
// Screens/context call these helpers; nothing else imports the RevenueCat SDK
// directly (mirrors the analytics.ts pattern). RevenueCat validates receipts
// with Apple and pushes the entitlement to our backend via webhook, so the
// backend `is_premium` field is the durable authority; the `customerInfo`
// this service returns is only used for instant post-purchase UX.
//
// DARK/SAFE by default: with no `RC_IOS_API_KEY` provisioned yet, `configure`
// no-ops and every helper degrades gracefully (offerings → null, entitlement →
// false, purchase/restore → thrown "not configured"). The paywall entry point
// itself is still gated by `SHOW_UPGRADE_PAYWALL` (false) in SettingsScreen, so
// none of this is reachable in production until the CEO flips it.
//
// iOS-only for now: RevenueCat is configured only on iOS (the ship target).
// On other platforms configure() is skipped and helpers no-op. Web imports the
// stub aliased in vite.config.ts, so this file never runs on the sandbox.

import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import { RC_IOS_API_KEY, RC_ENTITLEMENT_ID } from '../config/revenueCat';

// Set once configure() succeeds. Guards every helper so calls made before
// configure (or when no key is provisioned) fail soft instead of throwing from
// the native layer.
let configured = false;

/** Whether the RevenueCat SDK has been configured this session. */
export const isRevenueCatConfigured = (): boolean => configured;

/**
 * Configure the SDK. Call once on app start (before any offering/purchase).
 * Idempotent and safe to call with no key: it simply stays unconfigured.
 *
 * @param appUserID our internal user id, so RevenueCat's `app_user_id` matches
 *   the id the backend webhook keys on. Omit for an anonymous pre-login user;
 *   call `logInRevenueCat` once the user authenticates.
 */
export const configureRevenueCat = (appUserID?: string): void => {
  if (configured) return;
  // iOS is the only shipped IAP surface today.
  if (Platform.OS !== 'ios') return;
  // No key provisioned → stay dark rather than crash the native SDK.
  if (!RC_IOS_API_KEY) {
    if (__DEV__) {
      console.info('revenueCat: no RC_IOS_API_KEY for this build; disabled');
    }
    return;
  }
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: RC_IOS_API_KEY, appUserID });
  configured = true;
};

/**
 * Alias the RevenueCat identity to our user id after authentication so the
 * backend webhook can match `app_user_id` == our id. No-op when unconfigured.
 * Never throws — identity failure must not block the login flow.
 */
export const logInRevenueCat = async (appUserID: string): Promise<void> => {
  if (!configured || !appUserID) return;
  try {
    await Purchases.logIn(appUserID);
  } catch (err) {
    if (__DEV__) {
      console.warn('revenueCat.logIn failed', err);
    }
  }
};

/**
 * Reset the RevenueCat identity to a fresh anonymous id on logout so the next
 * user isn't merged into the prior user's entitlements. No-op when unconfigured.
 */
export const logOutRevenueCat = async (): Promise<void> => {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch (err) {
    if (__DEV__) {
      console.warn('revenueCat.logOut failed', err);
    }
  }
};

/**
 * Fetch the current offering (the set of purchasable packages). Returns null
 * when unconfigured, on error, or when no current offering is set — callers
 * must render a graceful empty/error state, never assume a value.
 */
export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  if (!configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (err) {
    if (__DEV__) {
      console.warn('revenueCat.getOfferings failed', err);
    }
    return null;
  }
};

/**
 * Purchase a package. Resolves with the fresh `customerInfo` on success.
 * Throws on failure — callers must catch and classify (see `isUserCancelled`).
 * The backend becomes authoritative once the RevenueCat webhook fires; this
 * `customerInfo` is for the instant optimistic UX only.
 */
export const purchasePackage = async (
  pkg: PurchasesPackage,
): Promise<CustomerInfo> => {
  if (!configured) {
    throw new Error('revenueCat: not configured');
  }
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
};

/**
 * Restore prior purchases. Resolves with `customerInfo` (which may or may not
 * carry the entitlement). Throws only on a real store error — an empty restore
 * (nothing to restore) resolves normally with no active entitlement.
 */
export const restorePurchases = async (): Promise<CustomerInfo> => {
  if (!configured) {
    throw new Error('revenueCat: not configured');
  }
  return Purchases.restorePurchases();
};

/**
 * True when the given `customerInfo` carries an active `macgie_plus`
 * entitlement. Used for the instant post-purchase/restore UX flip; the durable
 * source of truth remains the backend `is_premium` field.
 */
export const hasMacgiePlusEntitlement = (
  customerInfo: CustomerInfo | null | undefined,
): boolean => Boolean(customerInfo?.entitlements.active[RC_ENTITLEMENT_ID]);

/**
 * Whether a caught purchase error was a user cancellation (they backed out of
 * the native sheet) vs a real failure. RevenueCat sets `userCancelled: true`
 * on the thrown error for this case. Kept defensive: the error is `unknown`.
 */
export const isUserCancelled = (err: unknown): boolean =>
  Boolean(
    err &&
      typeof err === 'object' &&
      'userCancelled' in err &&
      (err as { userCancelled?: boolean }).userCancelled === true,
  );
