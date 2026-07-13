import { OutfitSheet, SaveState } from './types';

// In-memory, session-scoped snapshot of the Home deck so it survives a
// HomeScreen unmount + remount.
//
// Why this exists: the web build swaps in `@react-navigation/stack`
// (`createStack.web.ts`), whose JS card stack UNMOUNTS inactive screens. So
// navigating from Home to Wardrobe (or any other page) tears HomeScreen down,
// and returning remounts it — which re-fires the cold-start recommendation
// fetch and replaces the deck with brand-new suggestions. (Native uses
// native-stack, which keeps Home mounted, so this is a no-op safety net there.)
//
// Restoring from this snapshot on remount keeps the user's current suggestions
// AND swipe position, so new suggestions only appear when they swipe to the
// last card — the intended discovery flow. The snapshot lives at module scope
// (not React state) precisely so it outlives the component. It is keyed by user
// id so a different signed-in user never restores the previous user's deck, and
// it is purely in-memory (a full page reload / app restart starts fresh).

export type HomeDeckSnapshot = {
  userId: string | number;
  listOutfits: OutfitSheet[];
  activeIndex: number;
  saveStateByHash: Record<string, SaveState>;
};

let snapshot: HomeDeckSnapshot | null = null;

export const saveHomeDeckSnapshot = (next: HomeDeckSnapshot): void => {
  snapshot = next;
};

/**
 * Returns the cached deck for `userId` only if it belongs to that user and has
 * at least one outfit — otherwise null, so the caller cold-starts as usual.
 */
export const readHomeDeckSnapshot = (
  userId: string | number | undefined,
): HomeDeckSnapshot | null => {
  if (userId == null) {
    return null;
  }
  if (!snapshot || snapshot.userId !== userId) {
    return null;
  }
  return snapshot.listOutfits.length > 0 ? snapshot : null;
};

export const clearHomeDeckSnapshot = (): void => {
  snapshot = null;
};
