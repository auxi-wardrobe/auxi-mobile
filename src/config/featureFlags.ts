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

/**
 * Dev-only "Replay onboarding" tooling.
 *
 * Gates the Settings entry point that lets a logged-in user re-run the
 * onboarding flow (via the `forceOnboarding` override in AuthContext)
 * WITHOUT registering a new account. Pure QA/dev tooling — never a
 * production surface.
 *
 * Default = `__DEV__` so it appears in dev/QA builds only. Release
 * builds compile it to `false`, and the Settings row is additionally
 * wrapped in a `__DEV__` check, so prod users can never reach it.
 */
export const ONBOARDING_REPLAY_ENABLED: boolean = __DEV__;

/**
 * Whether the onboarding V2 redesign navigator is active.
 *
 * `true`  — register the new V2 onboarding route set (Welcome →
 *           LocationPermission → OnboardingWardrobe → OnboardingFit →
 *           OnboardingStyles → OnboardingCompleted → OnboardingOutro).
 *           The new flow defers `completeOnboarding()` until the Outro
 *           "See my outfit" tap so the Loading/Completed/Outro screens
 *           render AFTER `/generate` succeeds (see phase-02 spec).
 * `false` — fall back to the legacy V05 onboarding routes
 *           (GenderPreference → StylePreference → StylePicker) so we can
 *           land the scaffold without flipping users to stub screens.
 *
 * Default = `__DEV__` so we can build/QA the V2 flow in dev; release
 * builds keep the legacy V05 flow until Phase 3-4 land the real screen
 * bodies and the flag is promoted (mirrors `UAC_V2_ENABLED`).
 */
export const ONBOARDING_V2_ENABLED: boolean = __DEV__;

/**
 * Dev-only "QA: Skip to Onboarding" bypass on the auth Welcome screen.
 *
 * The redesigned email-entry UI is fragile while AU-242 is in flight, but
 * QA needs a deterministic way to reach V2 onboarding. This flag gates a
 * Welcome-screen button that logs in with the QA account and forces the
 * onboarding stack (via `startOnboardingReplay`) regardless of the
 * account's `is_first_login`.
 *
 * Default = `__DEV__` so it appears in dev/QA builds only (mirrors
 * `ONBOARDING_REPLAY_ENABLED`). Release builds compile it to `false` AND
 * the button is additionally wrapped in a `__DEV__ && QA_BYPASS_ENABLED`
 * check at the call site, so prod users can never reach it.
 */
export const QA_BYPASS_ENABLED: boolean = __DEV__;

/**
 * QA bypass credentials. No `react-native-config`/`.env` mechanism exists
 * in this repo yet (see auxi/CLAUDE.md "API config" TODO), so these live
 * as `__DEV__`-only constants gated behind `QA_BYPASS_ENABLED`. They are
 * NEVER read on a release path.
 *
 * TODO(AU-242): move to react-native-config (`QA_BYPASS_EMAIL` /
 * `QA_BYPASS_PASSWORD`) once the env config surface lands, alongside the
 * `localhost:5001` host externalisation.
 */
export const QA_BYPASS_EMAIL = __DEV__ ? 'qa-test@auxi.app' : '';
export const QA_BYPASS_PASSWORD = __DEV__ ? 'QaTest!2026' : '';
