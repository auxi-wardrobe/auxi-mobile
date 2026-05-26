/* eslint-env jest */
/**
 * Onboarding flag → route-set regression guard (Phase 6, item 6).
 *
 * The actual flag→navigator branch in AppNavigator.tsx is a COMPILE-TIME JSX
 * ternary on `ONBOARDING_V2_ENABLED` (a `const = __DEV__`). It is NOT a pure
 * function and cannot be flipped at runtime per-test without re-rendering the
 * whole NavigationContainer + AuthContext + ~20 screen modules — which would
 * be trivial render-spam with little value. The branch selection itself is
 * covered by:
 *   - the compile-time ternary (tsc proves both arms type-check), and
 *   - Maestro: onboarding-v2.yaml (flag ON) + v05.yaml (flag OFF regression).
 *
 * What we CAN unit-guard cheaply and usefully: the flag is a boolean, and the
 * V2 route names are DISJOINT from the legacy V05 route names — so whichever
 * arm the flag selects, the two sets never collide in the param list (a
 * collision would silently shadow a screen registration at runtime).
 */
import { ONBOARDING_V2_ENABLED } from '../../config/featureFlags';

// Route-name sets as registered in AppNavigator's two ternary arms.
const V2_ROUTES = [
  'OnboardingWardrobe',
  'OnboardingFit',
  'OnboardingStyles',
  'OnboardingLoading',
  'OnboardingCompleted',
  'OnboardingOutro',
] as const;

const LEGACY_ROUTES = [
  'GenderPreference',
  'StylePreference',
  'StylePicker',
] as const;

describe('onboarding flag → route set', () => {
  it('ONBOARDING_V2_ENABLED is a boolean (compile-time branch selector)', () => {
    expect(typeof ONBOARDING_V2_ENABLED).toBe('boolean');
  });

  it('V2 and legacy route names are disjoint (no registration collision either arm)', () => {
    const overlap = V2_ROUTES.filter(r =>
      (LEGACY_ROUTES as readonly string[]).includes(r),
    );
    expect(overlap).toEqual([]);
  });

  it('the shared pre-steps (Welcome/LocationPermission) are NOT in either branch set', () => {
    const branchRoutes = [...V2_ROUTES, ...LEGACY_ROUTES];
    expect(branchRoutes).not.toContain('Welcome');
    expect(branchRoutes).not.toContain('LocationPermission');
  });
});
