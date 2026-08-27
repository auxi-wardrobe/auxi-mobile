// useDefaultItemsUnlockedCelebration — owns the "you can now remove Macgie's
// default items" milestone sheet for the Wardrobe screen.
//
// WHY IT LIVES ON THE SCREEN, NOT ON THE UPLOAD PATH
//
// The threshold counts every item the user CHOSE — photos they uploaded, and
// catalog items they picked from the Database screen or a trending drop. So
// the 12th item can arrive by any of four routes (camera, gallery, web
// import, Database pick), and the Database route doesn't even run through
// `useAddWardrobeItem` — it navigates back to Wardrobe from its own screen.
// Hanging the check off one upload path would silently miss the others.
//
// Instead: the wardrobe list is the one thing every route updates. When its
// size changes, re-check. That is one call site covering all four routes,
// with no cross-screen state to plumb.
//
// Cost control comes from two places, not from being clever here:
//   • the size-changed guard — re-focusing Wardrobe without adding anything
//     costs nothing;
//   • `maybeCelebrateDefaultItemsUnlocked`'s AsyncStorage flag — once a user
//     has been congratulated, the local check short-circuits before any
//     request, forever.
//
// Everything else (once-per-user, the server's `unlocked` flag, fail-open) is
// the service's job — this hook only decides WHEN to ask.

import { useEffect, useRef } from 'react';
import { useDefaultItemsUnlockedGate } from './useDefaultItemsUnlockedGate';
import { maybeCelebrateDefaultItemsUnlocked } from '../services/defaultItemsMilestone';
import { track } from '../services/analytics';
import type { User } from '../types/auth';

interface UseDefaultItemsUnlockedCelebrationParams {
  /** Size of the user's wardrobe list. `undefined` while it is still loading. */
  itemCount: number | undefined;
  user: User | null | undefined;
}

interface UseDefaultItemsUnlockedCelebration {
  /** Spread onto <DefaultItemsUnlockedSheet />. */
  sheetProps: {
    visible: boolean;
    ownItemCount: number;
    threshold: number;
    onDismiss: () => void;
  };
}

export const useDefaultItemsUnlockedCelebration = ({
  itemCount,
  user,
}: UseDefaultItemsUnlockedCelebrationParams): UseDefaultItemsUnlockedCelebration => {
  const gate = useDefaultItemsUnlockedGate();
  const lastCheckedCount = useRef<number | null>(null);

  useEffect(() => {
    if (itemCount === undefined || !user?.id) {
      return;
    }
    // First load establishes the baseline AND checks: a user can cross the
    // threshold on a device they then reinstall, and they still deserve to be
    // told once. Subsequent runs only fire when the list actually grew.
    if (
      lastCheckedCount.current !== null &&
      itemCount <= lastCheckedCount.current
    ) {
      lastCheckedCount.current = itemCount;
      return;
    }
    lastCheckedCount.current = itemCount;

    // Fire-and-forget: never awaited by render, never throws (see the service).
    maybeCelebrateDefaultItemsUnlocked(user).then(milestone => {
      if (milestone) {
        gate.open(milestone);
      }
    });
    // `gate` is stable enough for this effect's purpose (its setters are
    // useCallback'd); keying on it would re-run the check on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemCount, user?.id]);

  return {
    sheetProps: {
      ...gate.sheetProps,
      onDismiss: () => {
        track('default_items_unlock_dismissed');
        gate.dismiss();
      },
    },
  };
};
