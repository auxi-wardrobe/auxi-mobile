import type { User } from '../../types/auth';
import { recommendV05 } from '../../services/v05Api';
import {
  DEFAULT_RECOMMENDATION_MODE,
} from '../../services/recommendationService';
import { moodForMode } from '../../services/mood/mood-vocabulary';
import { buildPersonaFrom } from '../HomeScreen/build-persona';
import {
  mapV05Item,
  normalizeOutfits,
  reorderColdOutfitsPreferOuter,
} from '../HomeScreen/outfit-normalize';
import type { OutfitSheet } from '../HomeScreen/types';

// Cold-start build for the LANDING page.
//
// Why the landing fires a build at all: the homepage's job is to show the
// user's newest outfit suggestion, and on a first open there is nothing
// cached to show. The alternative — an empty panel with a "go look over
// there" CTA — is not a homepage.
//
// Why this does NOT double the AI spend: `recommendV05` keeps a module-scope
// sticky session, and the recommender restores an existing deck snapshot
// instead of cold-starting (HomeScreen's mount effect reads
// `readHomeDeckSnapshot` first). So the landing runs the session's ONE
// `/build`, writes the result into that same snapshot, and the recommender
// picks it up — one build, and both screens show the SAME outfit. Getting
// this wrong in the other direction (calling the raw `/build` API to avoid
// touching the session) would cost two heavy builds per app open and show
// the user two different "newest" outfits.
//
// Consequently this must mirror HomeScreen's `buildViaV05` + its first-batch
// post-processing exactly. Both now share `buildPersonaFrom`, `mapV05Item`,
// `normalizeOutfits` and `reorderColdOutfitsPreferOuter` so the two paths
// cannot drift on anything that changes which outfit is served or its order.

export interface ColdStartInput {
  user: User | null | undefined;
  tempC: number;
  /** How many outfits to ask for — the same batch size the recommender uses. */
  count?: number;
}

export type ColdStartOutcome =
  | { kind: 'outfits'; sheets: OutfitSheet[] }
  /** The engine could not compose anything: the wardrobe is too small. */
  | { kind: 'wardrobeGap' };

export const COLD_START_COUNT = 3;

export const buildColdStartOutfits = async ({
  user,
  tempC,
  count = COLD_START_COUNT,
}: ColdStartInput): Promise<ColdStartOutcome> => {
  const mode = DEFAULT_RECOMMENDATION_MODE;

  const result = await recommendV05({
    weather: { temp_c: tempC, is_rainy: false },
    user: {
      gender: 'U',
      occasion: mode,
      ...buildPersonaFrom(user?.user_metadata),
    },
    // Mode pill → engine mood, via the shared mood-vocabulary bridge.
    intent: { mood: moodForMode(mode) as never },
    count,
    mode,
  });

  if (result.wardrobeGap) {
    return { kind: 'wardrobeGap' };
  }

  const sheets = normalizeOutfits({
    outfits: result.outfits.map(outfit => ({
      items: outfit.items.map(mapV05Item),
      outfit_hash: outfit.outfit_hash,
      caption: outfit.reasoning_human,
    })),
  });

  return {
    kind: 'outfits',
    // AU-362: below 15°C float outfits that already carry an outer layer ahead
    // of the too-light ones. The recommender applies this to its first batch;
    // since it will RESTORE this deck rather than build its own, the ordering
    // has to be applied here or the two screens disagree.
    sheets: reorderColdOutfitsPreferOuter(sheets, tempC),
  };
};
