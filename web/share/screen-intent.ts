/**
 * Pure helpers for the web-review screen-share intent encoded in the URL as
 * `?screen=<key>`. Kept side-effect free so they unit-test cleanly and can run
 * in both the outer frame and the embedded app.
 */
import {
  SHAREABLE_SCREENS,
  type ReviewAuthState,
  type ShareableScreen,
} from './shareable-screens';

/** Query-string key carrying the shared screen. */
export const SCREEN_PARAM = 'screen';

/** Read the raw `?screen=` value from a `location.search` string. */
export const parseScreenKey = (search: string): string | null => {
  try {
    return new URLSearchParams(search).get(SCREEN_PARAM);
  } catch {
    return null;
  }
};

/** Resolve a screen key to its registry entry, if any. */
export const findScreen = (
  key: string | null | undefined,
): ShareableScreen | undefined =>
  key ? SHAREABLE_SCREENS.find(s => s.key === key) : undefined;

/**
 * Auth state the sandbox must seed for the screen in `location.search`.
 * Defaults to `app` (today's behavior) when no/unknown screen is requested.
 */
export const authStateForSearch = (search: string): ReviewAuthState =>
  findScreen(parseScreenKey(search))?.authState ?? 'app';

/** Resolve the screen in `location.search` to its registry entry, if any. */
export const screenForSearch = (search: string): ShareableScreen | undefined =>
  findScreen(parseScreenKey(search));
