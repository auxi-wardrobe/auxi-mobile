/**
 * Wardrobe direction → V05 `gender` mapping + local persistence.
 *
 * SINGLE SOURCE OF TRUTH for turning the onboarding `wardrobe_direction`
 * (`Menswear` / `Womenswear` / `Mixed`) into the backend V05 build `gender`
 * code (`M` / `W` / `U`). Both onboarding (writes the persisted direction)
 * and HomeScreen (reads it, maps to gender for `/build`) go through here so
 * the two never drift.
 *
 * Why persisted locally and not derived from the auth `User`?
 *   - `wardrobe_direction` lives only in the onboarding navigation params; it
 *     is sent raw to `POST /v05/onboarding/generate` and the backend derives
 *     gender server-side. It is NOT round-tripped onto the `User` object.
 *   - `PUT /me` rejects unknown `user_metadata` keys (422), and its top-level
 *     `gender` field uses the legacy V2 vocabulary (`MASCULINE` / `FEMININE` /
 *     `UNISEX`), not the V05 `M|W|U` codes — so we can't persist the direction
 *     server-side without a backend contract change.
 *   - A small client-side AsyncStorage entry keeps the whole fix inside
 *     `auxi/` with NO contract change. The persisted string is the user's own
 *     onboarding pick, written once at onboarding completion.
 *
 * `gender: M|W|U` is ALREADY part of the V05 `/build` request contract
 * (`schemas/v05_recommendation.py`, `BuildUser` in `v05Api.ts`). This module
 * only computes the correct value — it does not add a field.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WardrobeDirection } from './v05Api';

/** V05 build `user.gender` code. Mirrors `BuildUser['gender']` in `v05Api.ts`. */
export type Gender = 'M' | 'W' | 'U';

/** Safe default for missing / unknown / not-yet-onboarded users. */
export const DEFAULT_GENDER: Gender = 'U';

/**
 * AsyncStorage key for the user's onboarding `wardrobe_direction`. Namespaced
 * per the `@auxi/<feature>/<name>` convention (see `SwipeCoachMark`).
 */
const STORAGE_KEY = '@auxi/onboarding/wardrobe-direction';

/**
 * Map an onboarding `wardrobe_direction` to the V05 build `gender` code.
 *
 *   Womenswear → "W"
 *   Menswear   → "M"
 *   Mixed      → "U"
 *   null / undefined / unknown → "U"  (safe fallback; never throws)
 *
 * NOTE (flag for CEO/PM): the `Mixed → "U"` default treats a mixed wardrobe as
 * unisex on Home. Confirm this is the intended product behavior.
 */
export const wardrobeDirectionToGender = (
  direction: WardrobeDirection | null | undefined,
): Gender => {
  switch (direction) {
    case 'Womenswear':
      return 'W';
    case 'Menswear':
      return 'M';
    case 'Mixed':
      return 'U';
    default:
      return DEFAULT_GENDER;
  }
};

/**
 * Persist the user's onboarding `wardrobe_direction` so HomeScreen can derive
 * the build `gender` after onboarding. Best-effort: a write failure must not
 * break the onboarding completion flow (Home just falls back to `"U"`).
 */
export const persistWardrobeDirection = async (
  direction: WardrobeDirection,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, direction);
  } catch (err) {
    if (__DEV__) {
      console.warn('[wardrobeDirection] persist failed', err);
    }
  }
};

/**
 * Read the persisted `wardrobe_direction`. Returns `null` when absent or on a
 * read error (caller maps `null → "U"` via `wardrobeDirectionToGender`).
 */
export const readWardrobeDirection =
  async (): Promise<WardrobeDirection | null> => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEY);
      switch (value) {
        case 'Menswear':
        case 'Womenswear':
        case 'Mixed':
          return value;
        default:
          return null;
      }
    } catch (err) {
      if (__DEV__) {
        console.warn('[wardrobeDirection] read failed', err);
      }
      return null;
    }
  };

/**
 * Convenience: read the persisted direction and map straight to a `gender`
 * code. Used by HomeScreen's build call. Always resolves (never rejects),
 * falling back to `"U"`.
 */
export const readGender = async (): Promise<Gender> =>
  wardrobeDirectionToGender(await readWardrobeDirection());
