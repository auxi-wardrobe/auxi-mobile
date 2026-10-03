import type { SkinToneGender } from '../../content/skin-tones';
import type { User } from '../../types/auth';

/**
 * Which portrait set (men / women) the skin-tone UI shows for this user.
 *
 * Mirrors how the backend resolves a user's wardrobe gender (plan 260923):
 *   1. `user_metadata.wardrobe_direction` — Menswear / Womenswear, chosen at
 *      onboarding and editable in Settings › Personalization;
 *   2. legacy `users.gender` (`MASCULINE` / `FEMININE`, or M / W / F / male /
 *      female) as a fallback;
 *   3. neither set → the women set, which is the Analysis screen's default art.
 */
export const resolveSkinToneGender = (
  user: Pick<User, 'gender' | 'user_metadata'> | null | undefined,
): SkinToneGender => {
  const direction = user?.user_metadata?.wardrobe_direction;
  if (direction === 'Menswear') return 'men';
  if (direction === 'Womenswear') return 'women';

  const gender = user?.gender?.trim().toLowerCase();
  if (gender) {
    if (['masculine', 'male', 'man', 'men', 'm'].includes(gender)) return 'men';
    if (['feminine', 'female', 'woman', 'women', 'f', 'w'].includes(gender)) {
      return 'women';
    }
  }
  return 'women';
};
