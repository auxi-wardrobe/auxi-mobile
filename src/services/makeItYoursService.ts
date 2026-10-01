import { apiClient } from './apiClient';

// AU-458 Make It Yours — recreate a Discovery outfit from the user's own
// wardrobe. Contract: `wardrobe-backend/API_DOCUMENTATION.md` §Make It Yours
// (tech-lead PASS 2026-09-26).
//   POST /discovery/outfits/{id}/make-it-yours   (no body, read-only)
//
// Forward-compat rules from the contract (do not break them):
//   • Unknown keys are ignored — match %, summary counts and quality bands
//     will be ADDED later.
//   • An unknown `state` is treated as `no_match` (`normalizeState`).
//   • `role` is a free string (may be "" or outside the known list) — never
//     switch exhaustively on it.
//   • To favourite an outfit: `outfit_hash` + ids of the FILLED slots only,
//     `source: 'make_it_yours'`.

export type MakeItYoursState = 'success' | 'partial' | 'no_match' | 'no_wardrobe';

const KNOWN_STATES: readonly MakeItYoursState[] = [
  'success',
  'partial',
  'no_match',
  'no_wardrobe',
];

/** User-owned wardrobe item (no `position`, unlike `DiscoveryOutfitItem`). */
export interface MakeItYoursItem {
  id: string;
  name: string | null;
  image_url: string;
  image_png: string | null;
  image_studio: string | null;
  category: string;
  category_code: string | null;
  layer_code: string | null;
  is_common_item: boolean;
}

export interface MakeItYoursSlot {
  /** Equals an `items[].id` of the Discovery outfit detail. */
  inspiration_item_id: string;
  role: string;
  /** `null` = the user owns nothing close enough — never a fabricated item. */
  item: MakeItYoursItem | null;
}

export interface MakeItYoursOutfit {
  outfit_hash: string;
  is_complete: boolean;
  slots: MakeItYoursSlot[];
}

export interface MakeItYoursResponse {
  state: MakeItYoursState;
  algorithm_version: string;
  inspiration: { id: string; title: string; composite_image_url: string | null };
  outfits: MakeItYoursOutfit[];
  /** Closest owned pieces — only populated for `partial`. */
  relevant_items: MakeItYoursItem[];
}

/** Whole flow must finish well inside the loading modal's patience. */
export const MAKE_IT_YOURS_TIMEOUT_MS = 15000;

export const normalizeState = (state: unknown): MakeItYoursState =>
  KNOWN_STATES.includes(state as MakeItYoursState)
    ? (state as MakeItYoursState)
    : 'no_match';

/** Ids to send to `POST /favourites` for a generated outfit. */
export const filledItemIds = (outfit: MakeItYoursOutfit): string[] =>
  outfit.slots.flatMap(slot => (slot.item ? [slot.item.id] : []));

export const makeItYoursService = {
  /**
   * Run the match. Rejects on any HTTP / network error (404 = the look is no
   * longer servable, 429 = rate limited) and on abort — callers treat an
   * abort as an intentional cancel, not a failure.
   */
  run: async (outfitId: string, signal?: AbortSignal): Promise<MakeItYoursResponse> => {
    const response = await apiClient.post(
      `/discovery/outfits/${outfitId}/make-it-yours`,
      undefined,
      { signal, timeout: MAKE_IT_YOURS_TIMEOUT_MS },
    );
    const data = response.data as MakeItYoursResponse;
    return {
      ...data,
      state: normalizeState(data.state),
      outfits: data.outfits ?? [],
      relevant_items: data.relevant_items ?? [],
    };
  },
};
