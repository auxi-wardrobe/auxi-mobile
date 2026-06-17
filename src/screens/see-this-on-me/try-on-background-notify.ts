/**
 * Binds the background-safe generation store's completion event to the in-app
 * completion Toast (AU-358). Kept in its own module so the binding is set up
 * exactly once at import time and is NOT torn down when the loading screen
 * unmounts — that's the whole point: the user has quit, yet the render must
 * still notify when it finishes.
 *
 * The screen flips the "backgrounded" flag (via the store) when the user quits;
 * the store only invokes the handler below when that flag is set, so a user
 * still watching the loading screen never gets a redundant Toast.
 */
import { setBackgroundCompleteHandler } from './try-on-generation-store';
import { showTryOnCompletionNotice } from './try-on-completion-notice';

let bound = false;

/**
 * Idempotently register the in-app completion notice as the store's
 * background-complete handler. Call from the SeeThisOnMe screen on mount; safe
 * to call repeatedly (binds once).
 */
export const setTryOnBackgroundCompleteHandler = (): void => {
  if (bound) return;
  bound = true;
  setBackgroundCompleteHandler(showTryOnCompletionNotice);
};
