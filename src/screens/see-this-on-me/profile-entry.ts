/**
 * AU-346 entry decision for the Self-Visualization flow.
 *
 * Pure helper (no React, no IO) so it's trivially unit-testable: given the
 * active reusable profile (or null), decide whether the screen should REUSE it
 * to render the current outfit straight away, or run the normal CAPTURE flow.
 *
 * A profile only counts as reusable when it actually has a usable id — a null
 * profile, or a malformed record missing its id, falls through to capture.
 */
import { BodyProfile } from '../../services/bodyService';

export type EntryMode = 'reuse' | 'capture';

export const decideEntryMode = (
  profile: BodyProfile | null | undefined,
): EntryMode => (profile && profile.id ? 'reuse' : 'capture');

/**
 * Which photo the reuse-confirm sheet should show for a saved profile.
 *
 * The sheet asks "reuse THIS body?", so it must show the body the render will
 * actually run on — the AI body-shape photo the user picked at the bodyShape
 * step. Since AU-358 that photo IS the profile's `image_url`: `POST
 * /api/body-shape/select` creates the primary profile with `image_url` = the
 * chosen render, while `full_body_url` keeps pointing at the RAW capture that
 * fed the generation (and, when the user skipped the optional full-body step,
 * that raw capture is the SELFIE — the flow falls back to the selfie id there).
 *
 * The pre-AU-358 (AU-346) profile had `image_url` = the selfie and the
 * full-body photo as the only better-than-selfie option, so this preferred
 * `full_body_url`. Keeping that precedence after AU-358 meant a returning user
 * was shown their raw selfie/full-body capture instead of the body photo they
 * selected. Prefer `image_url`, and fall back to `full_body_url` only when a
 * (legacy/malformed) profile has no `image_url` at all.
 */
export const resolveReusePhotoUri = (
  profile: BodyProfile | null | undefined,
): string | null => profile?.image_url || profile?.full_body_url || null;
