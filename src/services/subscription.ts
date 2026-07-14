/**
 * Macgie+ subscription state selectors.
 *
 * There is no subscription backend yet (see CLAUDE.md "Active work"), so
 * `is_premium` is undefined for every user today and `isPremiumUser` returns
 * false — i.e. everyone is a free user and sees the upgrade affordances. This
 * single selector is the one place the "free vs premium" decision lives, so
 * when the backend starts returning `is_premium` the whole app flips at once.
 */
import type { User } from '../types/auth';

export const isPremiumUser = (user: User | null | undefined): boolean =>
  Boolean(user?.is_premium);

/** Inverse convenience — a free user is anyone without an active Macgie+ plan. */
export const isFreeUser = (user: User | null | undefined): boolean =>
  !isPremiumUser(user);
