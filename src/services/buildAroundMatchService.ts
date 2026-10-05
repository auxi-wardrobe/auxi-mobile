import { apiClient } from './apiClient';
import {
  type MakeItYoursItem,
  type MakeItYoursOutfit,
  filledItemIds,
} from './makeItYoursService';

// "Build around this" → "Find the best match from Discovery": the reverse of
// Make It Yours. The user anchors ONE wardrobe item (A); the backend finds a
// Discovery outfit that (a) the user can fully build from their own wardrobe
// AND (b) contains A, and returns the owned pieces — A + B + C … — that
// reproduce that Discovery look.
//
//   POST /discovery/build-around   { item_id, trend_tag? }
//
// CONTRACT: implemented by auxi-backend#192 (`algorithm_version: 'ba-1'`,
// `API_DOCUMENTATION.md` §Build Around This → Discovery). The response reuses
// the Make It Yours slot model (`MakeItYoursOutfit` / `MakeItYoursItem`).
// Rules the client relies on:
//   • `state: 'success'` ⇒ `inspiration` and `outfit` are non-null,
//     `outfit.is_complete` is true, and one of its slots' items is the anchor
//     (`item.id === anchor item_id`). Any other state ⇒ both are `null`.
//   • Any other / unknown `state` is treated as `no_match` (forward-compat).
//   • `trend_tag` is omitted for "Surprise me"; otherwise one of the tags from
//     `GET /discovery/trend-tags` (same vocabulary as the Discovery filter), and
//     the matched outfit must carry that tag.
//   • 404 = the anchor item is gone, 422 = anchor not eligible
//     (`detail.code`: common_item | item_processing | unclassified_item),
//     429 = rate limited. Unknown keys are ignored.

/** Chips shown on the sheet besides "Surprise me" — random Discovery tags. */
export const BUILD_AROUND_TAG_CHIP_COUNT = 5;

/** Pick up to `count` distinct tags in random order (Fisher–Yates on a copy). */
export const pickRandomTags = (tags: readonly string[], count: number): string[] => {
  const pool = [...new Set(tags)];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
};

/**
 * Analytics props for the chosen tag. "Surprise me" (`null`) OMITS the key —
 * the tracking rules say never send `null` for an unknown/absent property.
 */
export const trendTagProps = (trendTag: string | null): { trend_tag?: string } =>
  trendTag ? { trend_tag: trendTag } : {};

export type BuildAroundMatchState = 'success' | 'no_match' | 'no_wardrobe';

const KNOWN_STATES: readonly BuildAroundMatchState[] = ['success', 'no_match', 'no_wardrobe'];

export interface BuildAroundInspiration {
  id: string;
  title: string;
  composite_image_url: string | null;
}

export interface BuildAroundMatchResponse {
  state: BuildAroundMatchState;
  algorithm_version: string;
  /** The Discovery outfit the owned pieces were matched to; `null` unless `state === 'success'`. */
  inspiration: BuildAroundInspiration | null;
  /** `null` unless `state === 'success'`. */
  outfit: MakeItYoursOutfit | null;
}

/** A result the result screen can render: a matched look + its owned pieces. */
export type BuildAroundMatchSuccess = BuildAroundMatchResponse & {
  state: 'success';
  inspiration: BuildAroundInspiration;
  outfit: MakeItYoursOutfit;
};

export const isBuildAroundSuccess = (
  result: BuildAroundMatchResponse,
): result is BuildAroundMatchSuccess =>
  result.state === 'success' && result.inspiration !== null && result.outfit !== null;

/** Same patience as Make It Yours — the search scans the Discovery pool. */
export const BUILD_AROUND_TIMEOUT_MS = 20000;

export const normalizeBuildAroundState = (state: unknown): BuildAroundMatchState =>
  KNOWN_STATES.includes(state as BuildAroundMatchState)
    ? (state as BuildAroundMatchState)
    : 'no_match';

/** Owned pieces of the matched outfit, in slot order (anchor included). */
export const matchedItems = (outfit: MakeItYoursOutfit | null): MakeItYoursItem[] =>
  outfit ? outfit.slots.flatMap(slot => (slot.item ? [slot.item] : [])) : [];

/** Ids to send to `POST /favourites` for the matched outfit. */
export const matchedItemIds = (outfit: MakeItYoursOutfit): string[] => filledItemIds(outfit);

export const buildAroundMatchService = {
  /**
   * Rejects on any HTTP / network error and on abort — callers treat an abort
   * as an intentional cancel, not a failure.
   */
  run: async (
    itemId: string,
    trendTag: string | null,
    signal?: AbortSignal,
  ): Promise<BuildAroundMatchResponse> => {
    const response = await apiClient.post(
      '/discovery/build-around',
      { item_id: itemId, trend_tag: trendTag ?? undefined },
      { signal, timeout: BUILD_AROUND_TIMEOUT_MS },
    );
    const data = response.data as BuildAroundMatchResponse;
    const state = normalizeBuildAroundState(data.state);
    const outfit = data.outfit ?? null;
    const inspiration = data.inspiration ?? null;
    const showable = matchedItems(outfit).length > 0 && inspiration !== null;
    return {
      ...data,
      // A "success" with nothing to show is a no_match, never an empty screen.
      state: state === 'success' && !showable ? 'no_match' : state,
      inspiration,
      outfit,
    };
  },
};
