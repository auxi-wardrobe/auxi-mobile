/**
 * AU-242 Phase 05 — OAuth SDK error normaliser.
 *
 * The Google and Apple SDKs each throw their own native error shapes.
 * The Welcome screen only cares about two outcomes:
 *
 *   1. User cancelled — return silently, no toast.
 *   2. Something else went wrong — show a generic "OAuth failed" toast.
 *
 * Anything finer-grained (network errors, missing Play Services) is
 * coalesced into "OAuth failed" because the user can't do anything
 * useful with the distinction. We log the original error so QA /
 * Sentry sees the detail.
 */
import { statusCodes } from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';

/**
 * Synthetic error thrown by our wrappers when an SDK returned a
 * response that's structurally fine but missing the token we need.
 */
export class OAuthError extends Error {
  constructor(public readonly reason: 'no_id_token' | 'no_identity_token') {
    super(reason);
    this.name = 'OAuthError';
  }
}

/**
 * True if the user dismissed the Google or Apple sheet without
 * completing sign-in. Caller should silently return to Welcome.
 */
export const isOAuthCancelled = (err: unknown): boolean => {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string | number; message?: string };

  // Google: code is one of statusCodes.SIGN_IN_CANCELLED / IN_PROGRESS.
  if (e.code === statusCodes.SIGN_IN_CANCELLED) return true;

  // Apple: returns Error with code === '1001' (CANCELED) per
  // appleAuth.Error.CANCELED. Native iOS authorization controller
  // also surfaces ASAuthorizationErrorCanceled (code 1001).
  if (
    e.code === appleAuth.Error.CANCELED ||
    e.code === '1001' ||
    e.code === 1001
  ) {
    return true;
  }

  return false;
};
