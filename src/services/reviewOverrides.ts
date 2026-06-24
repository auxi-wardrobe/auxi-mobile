/**
 * Review-only runtime overrides for the web-preview ("sandbox") surface.
 *
 * The setters here are called EXCLUSIVELY from the web entry `index.web.tsx`,
 * which is not part of the native bundle (native boots `index.js`). On native
 * and in real production these values therefore stay at their defaults and the
 * readers are no-ops — production behavior is unchanged. This is the single,
 * tightly-scoped seam the sandbox uses to (a) force the onboarding stack to
 * mount for a shared onboarding screen and (b) hand the desired landing screen
 * to the navigator once it's ready.
 */

/** When true, AuthContext treats the fetched user as `is_first_login`. */
let forcedFirstLogin = false;

export const setForcedFirstLogin = (value: boolean): void => {
  forcedFirstLogin = value;
};

export const getForcedFirstLogin = (): boolean => forcedFirstLogin;

/**
 * Pending "land on this screen" intent for the navigator to apply once ready.
 *  - `app`  → top-level screen, navigate by name.
 *  - `auth` → screen nested in the `Auth` navigator.
 */
export type ReviewNavIntent = { kind: 'app' | 'auth'; name: string } | null;

let pendingNavIntent: ReviewNavIntent = null;

export const setPendingNavIntent = (intent: ReviewNavIntent): void => {
  pendingNavIntent = intent;
};

export const getPendingNavIntent = (): ReviewNavIntent => pendingNavIntent;
