/**
 * AU-242 Phase 04 — feature flag registry.
 *
 * Single-purpose module: own the small set of compile-time booleans
 * that gate the UAC v2 rollout. Keeping flags here (instead of
 * scattered `__DEV__` checks) means a future env-driven config
 * surface (react-native-config, AsyncStorage overrides) plugs in at
 * one site.
 *
 * Convention: every flag has a default that is safe to ship to
 * production. Dev overrides happen below the default declaration so
 * the production behaviour is the literal first line you read.
 */

/**
 * Whether the AU-242 UAC v2 navigation tree is active.
 *
 * `true`  — render the new 11-route auth stack (Welcome → Email →
 *           Password → Verify → Verified, plus forgot/reset/google
 *           notice / language settings).
 * `false` — fall back to the legacy two-route stack (LoginScreen,
 *           RegisterScreen) so we can ship the foundation slice
 *           without flipping users to half-built screens.
 *
 * Default = `true` in dev so we can develop the new stack;
 *           `false` in release builds until phase 04 batches B-D
 *           land all the real screen bodies.
 */
export const UAC_V2_ENABLED: boolean = __DEV__;

/**
 * Destination after a successful email verification or password
 * reset. The Verified! screen reads this to compute its "Continue"
 * CTA target.
 *
 * Values:
 *   - `'onboarding'` — start the first-login onboarding flow (AU-243).
 *   - `'home'` — land directly on Home.
 *   - `'signin'` — surface the sign-in screen with email pre-filled
 *                  (used for the reset-password convergence).
 *
 * The screen will pick a context-appropriate default (`'home'` for
 * signup, `'signin'` for reset) and only consult this flag when an
 * override is needed.
 */
export type PostVerifyDestination = 'onboarding' | 'home' | 'signin';

export const UAC_POST_VERIFY_DEST: PostVerifyDestination = 'home';
