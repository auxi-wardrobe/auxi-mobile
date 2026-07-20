// Capsule "notify me when ready" seam.
//
// The generation screen lets the user leave while the create mutation keeps
// running via React Query. When it resolves in the background we want to nudge
// the user that their capsule is ready.
//
// LOCAL-NOTIFICATION GAP (see spec §6 tracking-gap convention): this repo ships
// only `@react-native-firebase/messaging` (REMOTE push display), with no local
// scheduling library (`notifee` / `react-native-push-notification` are NOT
// dependencies). Presenting a true OS-level local notification would require
// adding one of those deps — out of scope for this feature and not something a
// mobile-dev invents unilaterally.
//
// So this is a documented no-op/log seam: it keeps the call site honest (the
// generating screen already routes through here) and gives a single place to
// drop in a real local-notification call once the dependency lands. The
// in-app `toast.success('Your capsule is ready.')` fired by the create
// mutation's onSuccess is the actual user-visible signal today.
//
// RE-WIRE CONDITION: add a local-notification dependency, then implement
// `notifyCapsuleReady` to schedule/display an immediate local notification and
// remove the console fallback.

/**
 * Signal that a backgrounded capsule generation finished. Currently a logged
 * no-op (see file header). Never throws — call sites stay fire-and-forget.
 *
 * The capsule name is intentionally NOT sent to analytics anywhere; it's only
 * used for the (future) on-device notification body, which is local to the
 * device and never leaves it.
 */
export const notifyCapsuleReady = (name: string): void => {
  if (__DEV__) {
    console.info('capsuleNotifications.notifyCapsuleReady (no-op seam)', {
      hasName: Boolean(name),
    });
  }
};
