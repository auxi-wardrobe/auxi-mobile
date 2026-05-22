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
  GoogleSignin.configure({
    webClientId: OAUTH_CONFIG.google.webClientId,
    iosClientId: OAUTH_CONFIG.google.iosClientId,
    offlineAccess: OAUTH_CONFIG.google.offlineAccess,
  });
  configured = true;
};

/**
 * Launch the Google sign-in sheet. Resolves with the ID token to send
 * to our backend. Throws on cancellation (caller checks `isOAuthCancelled`
 * to silence the error) or if the SDK didn't return an idToken.
 */
export const googleSignInRequest = async (): Promise<{ idToken: string }> => {
  // hasPlayServices is iOS-no-op + Android service check. Safe everywhere.
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = (await GoogleSignin.signIn()) as
    | { idToken?: string | null }
    | { type?: string; data?: { idToken?: string | null } };

  // v15+ wraps the user in `data`; older SDKs return the user directly.
  const idToken =
    ('data' in response && response.data?.idToken) ||
    ('idToken' in response && response.idToken) ||
    null;

  if (!idToken) {
    throw new OAuthError('no_id_token');
  }

  return { idToken };
};
