/**
 * Whether a given outfit currently has an in-flight try-on generation job — the
 * AI "See on me" photo is still being created on the background worker.
 *
 * The generation store (`try-on-generation-store`) keeps ONE job alive after the
 * user quits the loading screen ("continue in background"). List screens that
 * expose a "See on me" action for that same outfit — Favourite, My Creations —
 * use this to render the button in a LOADING state instead of re-launching a
 * duplicate job while the photo is still processing. Once the job settles
 * (success/error) or the user starts a different outfit, this flips back to
 * false and the button re-enables.
 *
 * Matches on the outfit hash the store retains for the in-flight job across BOTH
 * phases (`shapes` and `render`), so the button stays loading for the whole
 * flow the user kicked off from that outfit — not just the final render.
 */
import { useTryOnGeneration } from './use-try-on-generation';

export const useIsOutfitGenerating = (
  outfitHash: string | undefined,
): boolean => {
  const { status, outfit } = useTryOnGeneration();
  return (
    status === 'generating' &&
    !!outfitHash &&
    outfit?.outfitHash === outfitHash
  );
};
