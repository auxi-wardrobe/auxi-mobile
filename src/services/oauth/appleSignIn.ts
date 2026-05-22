/**
 * AU-242 Phase 05 — Apple Sign-In SDK wrapper.
 *
 * Thin adapter over `@invertase/react-native-apple-authentication`.
 *
 * Apple-specific gotchas honoured here:
 *   1. `fullName` is sent by Apple ONLY on the user's first authorisation
 *      for this app. Subsequent sign-ins return `null`. The backend
 *      persists the name on first encounter — mobile just relays it
 *      verbatim if present.
 *   2. The display name is composed `${givenName} ${familyName}` only
 *      when at least one of the components is present, trimmed.
 *   3. `identityToken` is the JWT we POST to backend. Backend verifies
 *      against Apple's JWKS and bundle ID audience.
 *
 * iOS-only: caller MUST gate this behind `Platform.OS === 'ios'` —
 * `appleAuth.isSupported` is false on Android and the native module
 * is not registered.
 */
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { OAuthError } from './oauthErrors';

export interface AppleSignInResult {
  identityToken: string;
  /** Composed display name. Present only on first encounter. */
  name?: string;
}

/**
 * Launch the native Apple sign-in sheet. Resolves with the identity
 * token (and optional name) to forward to `/api/auth/apple`.
 *
 * Throws on cancellation (caller silences via `isOAuthCancelled`) or
 * when Apple returns a response missing `identityToken`.
 */
export const appleSignInRequest = async (): Promise<AppleSignInResult> => {
  const response = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
  });

  if (!response.identityToken) {
    throw new OAuthError('no_identity_token');
  }

  // Compose display name from given+family, trimmed. Apple may return
  // either field as null/undefined — only include if at least one is
  // non-empty.
  const given = response.fullName?.givenName?.trim() ?? '';
  const family = response.fullName?.familyName?.trim() ?? '';
  const composed = [given, family].filter(Boolean).join(' ');

  return {
    identityToken: response.identityToken,
    name: composed.length > 0 ? composed : undefined,
  };
};
