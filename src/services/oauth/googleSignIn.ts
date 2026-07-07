/**
 * AU-242 Phase 05 — Google Sign-In SDK wrapper.
 *
 * Thin adapter over `@react-native-google-signin/google-signin`. The
 * wrapper is responsible for:
 *
 *   1. Calling `GoogleSignin.configure()` once at startup (idempotent).
 *   2. Returning a normalised `{ idToken }` payload — caller passes this
 *      to the backend `/api/auth/google` route, which verifies the
 *      audience claim against our web client ID.
 *
 * SDK responses can be either v15+ shape `{ type, data: { idToken } }`
 * or legacy `{ idToken }` — we handle both defensively.
 */
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { OAUTH_CONFIG } from './oauthConfig';
import { OAuthError } from './oauthErrors';

let configured = false;

/**
 * One-time SDK configuration. Safe to call repeatedly — guarded by a
 * module-local flag. Invoked from `App.tsx` on bootstrap.
 */
export const configureGoogleSignIn = (): void => {
  if (configured) return;
  try {
    GoogleSignin.configure({
      webClientId: OAUTH_CONFIG.google.webClientId,
      iosClientId: OAUTH_CONFIG.google.iosClientId,
      offlineAccess: OAUTH_CONFIG.google.offlineAccess,
    });
  } catch (error) {
    // The RNGoogleSignin native TurboModule may be absent from the running
    // binary (e.g. a dev build produced before `pod install` linked the pod).
    // Don't crash the whole app at bootstrap over one optional OAuth provider —
    // log and continue. The Google button surfaces its own error if tapped.
    console.warn(
      '[googleSignIn] configure failed — native module unavailable; ' +
        'rebuild the app (pod install) to enable Google Sign-In.',
      error,
    );
  }
  // Mark as attempted regardless so we don't retry a permanently-missing module
  // on every call.
  configured = true;
};

/**
 * Launch the Google sign-in sheet. Resolves with the ID token to send
 * to our backend, plus the Google profile photo URL (if any) so callers
 * can cache it for display — the backend user record has no photo field
 * and rejects unknown `user_metadata` keys, so the photo only exists
 * client-side. Throws on cancellation (caller checks `isOAuthCancelled`
 * to silence the error) or if the SDK didn't return an idToken.
 */
export const googleSignInRequest = async (): Promise<{
  idToken: string;
  photoUrl: string | null;
}> => {
  // hasPlayServices is iOS-no-op + Android service check. Safe everywhere.
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = (await GoogleSignin.signIn()) as
    | { idToken?: string | null; user?: { photo?: string | null } }
    | {
        type?: string;
        data?: { idToken?: string | null; user?: { photo?: string | null } };
      };

  // v15+ wraps the user in `data`; older SDKs return the user directly.
  const idToken =
    ('data' in response && response.data?.idToken) ||
    ('idToken' in response && response.idToken) ||
    null;
  const photoUrl =
    ('data' in response && response.data?.user?.photo) ||
    ('user' in response && response.user?.photo) ||
    null;

  if (!idToken) {
    throw new OAuthError('no_id_token');
  }

  return { idToken, photoUrl };
};
