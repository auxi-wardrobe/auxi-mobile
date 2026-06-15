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
