/**
 * Pure helpers + timing constants for the Outfit Canvas add-item / persistence
 * flows. Extracted verbatim from OutfitCanvasScreen — no component state, safe to
 * unit-test in isolation.
 */
import { Image, ImageSourcePropType } from 'react-native';

// Upper bound on how long we'll wait for picked images before showing the
// canvas anyway. Caps the picker's "Adding…" button spinner and the canvas
// "Adding…" status so a slow or broken image can never wedge either: we warm
// the cache for snappy placement, but never block the UI on the network.
export const ADD_IMAGE_TIMEOUT_MS = 6000;

// Minimum time the "Adding…" feedback (picker button spinner + canvas status)
// stays up, even when images are already cached and load instantly. Without this
// floor the feedback can flash by unseen (common on web, where the cache hit is
// immediate); it also smooths the fast path so the spinner never just flickers.
export const MIN_ADD_FEEDBACK_MS = 700;

export const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

// Prefetch a remote image into the cache, resolving on success, failure, OR a
// timeout — whichever comes first. Always resolves (never rejects) so a single
// bad URL can't reject the whole Promise.all in the add flow.
export const prefetchWithTimeout = (uri: string): Promise<void> =>
  new Promise<void>(resolve => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    const timer = setTimeout(finish, ADD_IMAGE_TIMEOUT_MS);
    Image.prefetch(uri)
      .catch(() => undefined)
      .finally(() => {
        clearTimeout(timer);
        finish();
      });
  });

// Pull a serializable URI out of a canvas item's imageSource for persistence.
// Remote/picked items are `{ uri }`; require()'d mock assets are numbers (no
// URI) and return undefined so the caller can skip them.
export const extractUri = (
  source: ImageSourcePropType,
): string | undefined => {
  if (
    source &&
    typeof source === 'object' &&
    !Array.isArray(source) &&
    typeof (source as { uri?: unknown }).uri === 'string'
  ) {
    return (source as { uri: string }).uri;
  }
  return undefined;
};
