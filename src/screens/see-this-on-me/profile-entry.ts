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
 * actually run on. Which field holds that depends on the profile's GENERATION,
 * and `body_shape` is the marker:
 *
 *  • `body_shape` set — an AU-358 profile, created by `POST /api/body-shape/
 *    select`. Its `image_url` IS the AI body-shape photo the user picked, while
 *    `full_body_url` still points at the RAW capture that fed the generation
 *    (and when the user skipped the optional full-body step, that raw capture
 *    is the SELFIE — the flow passes the selfie id as the full-body fallback).
 *    So: prefer `image_url`.
 *
 *  • no `body_shape` — a pre-AU-358 (AU-346) profile, where `image_url` is the
 *    selfie and `full_body_url` the full-body photo. So: prefer
 *    `full_body_url`, the only better-than-selfie option those records have.
 *
 * Getting this backwards is what showed returning users their own selfie in
 * the confirm sheet. Note the auto-reuse routing means only the second case
 * still reaches the sheet — the first now skips it — but both are resolved
 * here so the helper stays correct if the sheet is ever shown for a
 * shape-carrying profile again.
 */
export const resolveReusePhotoUri = (
  profile: BodyProfile | null | undefined,
): string | null => {
  if (!profile) return null;
  return profile.body_shape
    ? profile.image_url || profile.full_body_url || null
    : profile.full_body_url || profile.image_url || null;
};
