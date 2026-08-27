// defaultItemsMilestone — the "you can now remove Macgie's default items"
// milestone celebration.
//
// Macgie seeds every new wardrobe with default (starter catalog) items so the
// suggestion engine has signal on day one. Those defaults are immutable until
// the user has uploaded enough items of their OWN; the backend owns that
// threshold and reports it via `GET /wardrobe/default-items/removal-status`.
// The moment the user crosses it we congratulate them ONCE and tell them the
// defaults can now go.
//
// Every add-item path (camera, gallery, import-from-web) calls
// `maybeCelebrateDefaultItemsUnlocked(user)` fire-and-forget immediately AFTER
// its existing success `track()` call — never blocking the success UI. This
// module owns every guard so no trigger site re-derives them:
//
//   1. `unlocked` comes from the server — never re-derived from the count.
//   2. Once-per-user, persisted in AsyncStorage. A milestone shown twice reads
//      as a bug, and the wardrobe can dip back under the threshold (a delete)
//      and cross it again.
//
// Fail-open, exactly like `usageLimit.maybeShowUsageLimit`: ANY error (network,
// a 401 mid token-refresh, a 404 against an older backend) resolves to `false`
// — no sheet, no toast, no retry. A celebration must never cost a real user a
// working upload.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { track } from './analytics';
import { wardrobeService } from './wardrobeService';
import type { DefaultItemRemovalStatus } from './wardrobeService';
import type { User } from '../types/auth';

/** Per-user so a device shared between accounts celebrates each of them once. */
const celebratedKey = (userId: string | number): string =>
  `default_items_unlock_celebrated_${userId}`;

/** What the celebration sheet renders. */
export interface DefaultItemsUnlockedResult {
  own_item_count: number;
  threshold: number;
}

/**
 * Resolves to the milestone payload iff the congratulations sheet should show
 * right now (the user just became able to remove default items and hasn't been
 * told yet), else `null`. Marks the milestone celebrated and fires
 * `default_items_unlock_celebrated` itself — a single call site for that event
 * so no trigger site can drift on its properties.
 *
 * Never throws: every guard and the fetch are wrapped, so callers can always
 * safely `await` this without a try/catch of their own.
 */
export const maybeCelebrateDefaultItemsUnlocked = async (
  user: User | null | undefined,
): Promise<DefaultItemsUnlockedResult | null> => {
  if (!user?.id) {
    return null;
  }
  const key = celebratedKey(user.id);

  try {
    // Cheap local check first — an already-celebrated user costs no request.
    if (await AsyncStorage.getItem(key)) {
      return null;
    }

    const status: DefaultItemRemovalStatus =
      await wardrobeService.getDefaultItemRemovalStatus();
    if (!status.unlocked) {
      return null;
    }

    // Persist BEFORE returning: if the caller's render throws, the user has
    // still crossed the milestone and re-celebrating on the next upload would
    // be worse than missing one sheet.
    await AsyncStorage.setItem(key, 'true');

    const result: DefaultItemsUnlockedResult = {
      own_item_count: status.own_item_count,
      threshold: status.threshold,
    };
    track('default_items_unlock_celebrated', { ...result });
    return result;
  } catch {
    // Fail-open — see the module header.
    return null;
  }
};

/** Test/QA seam: forget that this user was congratulated. */
export const resetDefaultItemsUnlockCelebration = async (
  userId: string | number,
): Promise<void> => {
  try {
    await AsyncStorage.removeItem(celebratedKey(userId));
  } catch {
    // Best-effort — nothing depends on the reset succeeding.
  }
};
