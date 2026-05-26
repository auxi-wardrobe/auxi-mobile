/**
 * AU-242 Phase 05 — OAuth client-side config.
 *
 * NOTE — iOS provisioning blocker:
 * The values below are placeholders. To complete OAuth wiring the
 * project owner (anh duc2820) must provide:
 *
 *   1. Google Cloud Console — OAuth 2.0 iOS client ID (for the SDK on
 *      device). Drop the iOS client into `iosClientId`.
 *   2. Google Cloud Console — OAuth 2.0 Web client ID (used by the
 *      backend to verify the `audience` claim on the returned ID token).
 *      Drop into `webClientId`.
 *   3. iOS: place `GoogleService-Info.plist` under `ios/auxi/` and add
 *      it to the Xcode target. Then copy `REVERSED_CLIENT_ID` from that
 *      plist into `ios/auxi/Info.plist` `CFBundleURLTypes` so the Google
 *      sign-in callback URL can return to the app.
 *   4. Apple Developer dashboard: enable "Sign in with Apple" capability
 *      on bundle ID `com.auxi.app`. Enable in Xcode → Signing &
 *      Capabilities → + Sign in with Apple.
 *
 * Until those are in place, `isOAuthConfigured()` returns false and the
 * Welcome screen OAuth CTAs surface a toast rather than crashing.
 */
export const OAUTH_CONFIG = {
  google: {
    /**
     * Web client ID — must match the backend `GOOGLE_OAUTH_WEB_CLIENT_ID`
     * env var. Used as the `audience` for backend ID-token verification.
     */
    webClientId: '23012725464-l9piv25qrnishre7or0kjv58ifo12ub0.apps.googleusercontent.com',
    /**
     * iOS client ID — used by the Google Sign-In SDK on device. From the
     * Google Cloud Console OAuth 2.0 iOS client (bundle com.auxi2026.app).
     * Its reversed form is the CFBundleURLScheme in ios/auxi/Info.plist.
     */
    iosClientId: '23012725464-d3nc6042ed7vmnmc50l5jm7fg51t6lm0.apps.googleusercontent.com',
    /** We do not need offline (refresh) access — backend mints its own session. */
    offlineAccess: false,
  },
} as const;

/**
 * Whether OAuth has been wired up with real client IDs. Used by the
 * Welcome screen handlers to fall back to an informational toast when
 * provisioning hasn't landed yet — keeps the app from crashing at the
 * native SDK boundary if a developer taps the button on a non-provisioned
 * build.
 */
export const isOAuthConfigured = (): boolean =>
  OAUTH_CONFIG.google.webClientId.length > 0 &&
  OAUTH_CONFIG.google.iosClientId.length > 0;
