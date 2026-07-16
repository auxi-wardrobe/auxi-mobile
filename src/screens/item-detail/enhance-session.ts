import type { WardrobeItem } from '../../services/wardrobeService';

/**
 * AI Image Enhancement (on-demand beautify from Item Detail) — session
 * constants + pure helpers, kept out of the screen for unit testing
 * (mirrors `wardrobe/beautify-status.ts`).
 *
 * Same backend job as the upload-time beautify flow (BeautifyService /
 * gpt-image-1, realistically 15-60s+), so the wait budget mirrors that
 * flow's `BeautifyPendingScreen` MAX_WAIT_MS (3 min) rather than promising
 * a synchronous "under 10 seconds" turnaround — that promise was
 * unrealistic and caused this screen to time out and show a false failure
 * while the job was still legitimately running server-side (AU-422).
 * Leaving the screen mid-generation is still safe: polling stops
 * client-side but the job finishes server-side, and WardrobeScreen's own
 * list poll (useItemReadySnackbar) picks up the pending→ready transition
 * whenever the user is back on the grid.
 */
export const ENHANCE_POLL_MS = 2000;

// Mirrors BeautifyPendingScreen's MAX_WAIT_MS — same backend job, same
// realistic ceiling.
export const ENHANCE_TIMEOUT_MS = 3 * 60 * 1000;

export type EnhanceFailureReason = 'network' | 'timeout' | 'server_error';

/** Per-reason user-facing message keys (resolved via i18n `t`). */
export const ENHANCE_ERROR_KEYS: Record<EnhanceFailureReason, string> = {
  network: 'wardrobe.enhance.error_network',
  timeout: 'wardrobe.enhance.error_timeout',
  server_error: 'wardrobe.enhance.error_generic',
};

/**
 * Map a thrown request error to a failure reason. Axios attaches `request`
 * to every dispatched error and `response` only when the server answered —
 * so request-without-response means connectivity dropped; anything else
 * (4xx/5xx, including the 409 regenerate cap) is a server-side rejection.
 */
export function classifyEnhanceError(error: unknown): EnhanceFailureReason {
  const maybe = error as { response?: unknown; request?: unknown } | null;
  if (
    maybe &&
    typeof maybe === 'object' &&
    maybe.request &&
    !maybe.response
  ) {
    return 'network';
  }
  return 'server_error';
}

/**
 * Whether the Enhance entry point should be offered for an item.
 * One enhancement per image version (trust-first MVP): once a studio shot is
 * accepted the affordance disappears. A `pending` job (e.g. an upload-time
 * beautify still running) also hides it so we never double-fire; `ready` /
 * `discarded` / `failed` / `none` all allow a fresh session — the backend
 * regenerates over any stale uncommitted candidate.
 */
export function isEnhanceAvailable(
  item: Pick<WardrobeItem, 'image_studio' | 'beautify_status'>,
): boolean {
  if (item.image_studio) {
    return false;
  }
  return (
    item.beautify_status !== 'accepted' && item.beautify_status !== 'pending'
  );
}

/**
 * Full FAB predicate: Enhance is the NEXT step after a user's own upload has
 * been successfully processed — nothing else qualifies.
 *
 * - Uploaded by the user: catalog items are excluded. That's SYSTEM common
 *   items, USR_* per-user clones (AU-287), AND any other item carrying a
 *   `human_readable_id` — hrids are only ever assigned to catalog/seeded
 *   inventory (e.g. TOP_L1_*, TRADITIONAL_*); real uploads have none.
 * - Successfully processed: the create pipeline finished (`is_preparing`
 *   false) and produced the rembg cutout (`image_png`). Uploads that are
 *   still processing — or whose processing failed — don't offer the step.
 * - Plus the one-shot availability rules above (not already enhanced, no
 *   job already pending).
 */
export function canEnhanceItem(
  // `human_readable_id` / `is_preparing` reach WardrobeItem through its index
  // signature (not declared fields), so they're typed loosely here and
  // narrowed by the runtime checks below.
  item: Pick<
    WardrobeItem,
    'image_studio' | 'beautify_status' | 'is_common_item' | 'image_png'
  > & { human_readable_id?: unknown; is_preparing?: unknown },
): boolean {
  if (item.is_common_item === true) {
    return false;
  }
  if (
    typeof item.human_readable_id === 'string' &&
    item.human_readable_id.trim()
  ) {
    return false;
  }
  if (item.is_preparing === true) {
    return false;
  }
  if (!(typeof item.image_png === 'string' && item.image_png.trim())) {
    return false;
  }
  return isEnhanceAvailable(item);
}
