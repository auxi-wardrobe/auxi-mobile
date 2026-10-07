import { apiClient } from './apiClient';
import type { MakeItYoursItem } from './makeItYoursService';

// "Build around this" → "Find the best match from Discovery": the reverse of
// Make It Yours. The user anchors ONE wardrobe item (A, e.g. black chelsea
// boots). A result is a real Discovery look that already contains A's exact
// piece (same garment + silhouette + color) — never one Discovery image with
// a pile of loosely similar items. Each such look is rebuilt from the user's
// wardrobe where possible; pieces the user doesn't own stay the Discovery item
// and are tagged "Discovery" in the UI. One result per Discovery look: three
// looks contain black chelsea boots ⇒ exactly three results. Looks the user
// owns more of come first.
//
//   POST /discovery/build-around   { item_id, trend_tag? }
//
// CONTRACT: auxi-backend#193 (`algorithm_version: 'ba-2'`), `API_DOCUMENTATION.md`
// §Build Around This → Discovery. Rules the client relies on:
//   • `state: 'success'` ⇒ `outfits` has ≥ 1 look, best first; each slot has
//     a non-null `item` and a `source` (`wardrobe` = owned, `discovery` = not).
//   • Any other / unknown `state` is treated as `no_match` (forward-compat);
//     `no_wardrobe` is only sent by the old `ba-1` engine.
//   • An unknown `source` is treated as `discovery` — never claim a piece is
//     owned when unsure.
//   • The client enforces the product rule regardless of what the backend
//     sends (see `normalizeOutfits`): a look is kept only if
//     `anchor_match === 'exact'` (near-color `similar` / unknown → dropped)
//     AND one of its slots is the anchor itself (`item.id === item_id`,
//     `source: 'wardrobe'`); repeats of the same Discovery look
//     (`inspiration.id`) collapse to the first (best-ranked) one.
//   • `trend_tag` is omitted for "Surprise me"; otherwise one of the tags from
//     `GET /discovery/trend-tags`, and every returned look carries that tag.
//   • 404 = the anchor item is gone, 422 = anchor not eligible
//     (`detail.code`: common_item | item_processing | unclassified_item),
//     429 = rate limited. Unknown keys are ignored (the deprecated ba-1
//     top-level `inspiration` / `outfit` fields are not read).

/** Chips shown on the sheet besides "Surprise me" — random Discovery tags. */
export const BUILD_AROUND_TAG_CHIP_COUNT = 5;

/** Pick up to `count` distinct tags in random order (Fisher–Yates on a copy). */
export const pickRandomTags = (
  tags: readonly string[],
  count: number,
): string[] => {
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
export const trendTagProps = (
  trendTag: string | null,
): { trend_tag?: string } => (trendTag ? { trend_tag: trendTag } : {});

export type BuildAroundMatchState = 'success' | 'no_match' | 'no_wardrobe';

const KNOWN_STATES: readonly BuildAroundMatchState[] = [
  'success',
  'no_match',
  'no_wardrobe',
];

/** `wardrobe` = the user owns this piece; `discovery` = a Discovery piece they don't. */
export type BuildAroundSlotSource = 'wardrobe' | 'discovery';

/**
 * `exact` = the look has A's piece in A's color; `similar` = a near color.
 * Only `exact` looks reach the UI — `similar` is parsed for forward-compat.
 */
export type BuildAroundAnchorMatch = 'exact' | 'similar';

export interface BuildAroundInspiration {
  id: string;
  title: string;
  composite_image_url: string | null;
}

export interface BuildAroundSlot {
  inspiration_item_id: string;
  role: string;
  source: BuildAroundSlotSource;
  item: MakeItYoursItem;
}

export interface BuildAroundOutfit {
  /** The Discovery look these pieces rebuild. */
  inspiration: BuildAroundInspiration;
  anchor_match: BuildAroundAnchorMatch;
  outfit_hash: string;
  /** Every piece comes from the user's wardrobe. */
  is_complete: boolean;
  slots: BuildAroundSlot[];
}

export interface BuildAroundMatchResponse {
  state: BuildAroundMatchState;
  algorithm_version: string;
  /** Best first; empty unless `state === 'success'`. */
  outfits: BuildAroundOutfit[];
}

/** A result the result screen can render: at least one look. */
export type BuildAroundMatchSuccess = BuildAroundMatchResponse & {
  state: 'success';
};

export const isBuildAroundSuccess = (
  result: BuildAroundMatchResponse,
): result is BuildAroundMatchSuccess =>
  result.state === 'success' && result.outfits.length > 0;

/** Same patience as Make It Yours — the search scans the Discovery pool. */
export const BUILD_AROUND_TIMEOUT_MS = 20000;

export const normalizeBuildAroundState = (
  state: unknown,
): BuildAroundMatchState =>
  KNOWN_STATES.includes(state as BuildAroundMatchState)
    ? (state as BuildAroundMatchState)
    : 'no_match';

type RawSlot = Partial<Omit<BuildAroundSlot, 'source'>> & { source?: unknown };
type RawOutfit = Partial<Omit<BuildAroundOutfit, 'slots' | 'anchor_match'>> & {
  anchor_match?: unknown;
  slots?: RawSlot[] | null;
};

const normalizeSlot = (slot: RawSlot): BuildAroundSlot[] =>
  slot.item
    ? [
        {
          inspiration_item_id: slot.inspiration_item_id ?? '',
          role: slot.role ?? '',
          source: slot.source === 'wardrobe' ? 'wardrobe' : 'discovery',
          item: slot.item,
        },
      ]
    : [];

const normalizeOutfit = (outfit: RawOutfit, anchorId: string): BuildAroundOutfit[] => {
  const slots = (outfit.slots ?? []).flatMap(normalizeSlot);
  // The look must contain the user's exact piece: an exact-color match whose
  // anchor slot IS the user's item. Anything looser is not a result.
  const hasAnchor = slots.some(
    slot => slot.item.id === anchorId && slot.source === 'wardrobe',
  );
  if (
    !outfit.inspiration?.id ||
    !outfit.outfit_hash ||
    outfit.anchor_match !== 'exact' ||
    !hasAnchor
  )
    return [];
  return [
    {
      inspiration: outfit.inspiration,
      anchor_match: 'exact',
      outfit_hash: outfit.outfit_hash,
      is_complete: slots.every(slot => slot.source === 'wardrobe'),
      slots,
    },
  ];
};

/**
 * Valid looks in backend order (best first), one per Discovery look — the
 * number of results equals the number of Discovery looks that contain the
 * anchor's exact piece.
 */
const normalizeOutfits = (
  outfits: readonly RawOutfit[],
  anchorId: string,
): BuildAroundOutfit[] => {
  const seen = new Set<string>();
  return outfits
    .flatMap(outfit => normalizeOutfit(outfit, anchorId))
    .filter(outfit => {
      if (seen.has(outfit.inspiration.id)) return false;
      seen.add(outfit.inspiration.id);
      return true;
    });
};

/** Ids to send to `POST /favourites` for a look (Discovery pieces included). */
export const outfitItemIds = (outfit: BuildAroundOutfit): string[] =>
  outfit.slots.map(slot => slot.item.id);

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
    const data = (response.data ?? {}) as {
      state?: unknown;
      algorithm_version?: string;
      outfits?: RawOutfit[] | null;
    };
    const state = normalizeBuildAroundState(data.state);
    const outfits =
      state === 'success' ? normalizeOutfits(data.outfits ?? [], itemId) : [];
    return {
      // A "success" with nothing to show is a no_match, never an empty screen.
      state: state === 'success' && outfits.length === 0 ? 'no_match' : state,
      algorithm_version: data.algorithm_version ?? '',
      outfits,
    };
  },
};
