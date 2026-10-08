import { apiClient } from './apiClient';
import type { MakeItYoursItem } from './makeItYoursService';

// "Build around this" → "Find the best match from Discovery": the reverse of
// Make It Yours. The user anchors ONE wardrobe item (A, e.g. a blue denim
// shirt). A result is a real Discovery look that already contains A's piece —
// never one Discovery image with a pile of loosely similar items. Each such
// look is rebuilt from the user's wardrobe where possible; pieces the user
// doesn't own stay the Discovery item and are tagged "Discovery" in the UI.
// One result per Discovery look: three looks contain the piece ⇒ exactly three
// results. Two tiers: looks with A's exact piece first, then looks with a
// near-color version of it (labelled "Close match"); within a tier the backend
// order (most-owned first) is kept.
//
//   POST /discovery/build-around   { item_id, item_ids?, trend_tag?, trend_tags? }
//
// Two entry points share this call: ItemDetail ("Build around this", ONE
// anchor, at most one tag) and the Home landing "Build your look" section (up
// to `BUILD_LOOK_MAX_ITEMS` anchors, up to `BUILD_LOOK_MAX_TAGS` tags). The
// request always carries the ba-2 fields the backend already reads
// (`item_id` = the first anchor, `trend_tag` = the first tag) PLUS the full
// lists (`item_ids`, `trend_tags`); a backend that only knows ba-2 ignores the
// lists and answers for the first anchor, and the client still ranks whatever
// comes back by how many of the chosen anchors each look contains.
//
// CONTRACT: auxi-backend#193 (`algorithm_version: 'ba-2'`), `API_DOCUMENTATION.md`
// §Build Around This → Discovery. Rules the client relies on:
//   • `state: 'success'` ⇒ `outfits` has ≥ 1 look, best first; each slot has
//     a non-null `item` and a `source` (`wardrobe` = owned, `discovery` = not).
//   • Any other / unknown `state` is treated as `no_match` (forward-compat);
//     `no_wardrobe` is only sent by the old `ba-1` engine.
//   • An unknown `source` is treated as `discovery` — never claim a piece is
//     owned when unsure.
//     An unknown `anchor_match` is treated as `similar` — never claim an
//     exact match when unsure.
//   • The client enforces the product rule regardless of what the backend
//     sends (see `normalizeOutfits`): a look is kept only if one of its slots
//     is the anchor itself (`item.id === item_id`, `source: 'wardrobe'`);
//     repeats of the same Discovery look (`inspiration.id`) collapse to the
//     first (best-ranked) one; `exact` looks are ordered before `similar`.
//   • `trend_tag` is omitted for "Surprise me"; otherwise one of the tags from
//     `GET /discovery/trend-tags`, and every returned look carries that tag.
//   • 404 = the anchor item is gone, 422 = anchor not eligible
//     (`detail.code`: common_item | item_processing | unclassified_item),
//     429 = rate limited. Unknown keys are ignored (the deprecated ba-1
//     top-level `inspiration` / `outfit` fields are not read).

/** Chips shown on the sheet besides "Surprise me" — random Discovery tags. */
export const BUILD_AROUND_TAG_CHIP_COUNT = 5;

/** Home "Build your look": the most wardrobe items a search can anchor on. */
export const BUILD_LOOK_MAX_ITEMS = 3;
/** Home "Build your look": the most Discovery tags a search can carry. */
export const BUILD_LOOK_MAX_TAGS = 3;

/** What one search anchors on: the user's items (≥ 1) and optional tags. */
export interface BuildAroundRequest {
  /** Wardrobe item ids, in the order the user chose them; the first is `item_id`. */
  itemIds: string[];
  /** Discovery trend tags; empty = "Surprise me" (no tag constraint). */
  trendTags: string[];
}

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

/**
 * Analytics props for a tag LIST: `trend_tag` stays the first tag (so the
 * existing single-tag funnels keep working) and `trend_tags` is only added
 * when there is more than one. Empty list ⇒ no keys at all.
 */
export const trendTagsProps = (
  trendTags: readonly string[],
): { trend_tag?: string; trend_tags?: string[] } => ({
  ...trendTagProps(trendTags[0] ?? null),
  ...(trendTags.length > 1 ? { trend_tags: [...trendTags] } : {}),
});

export type BuildAroundMatchState = 'success' | 'no_match' | 'no_wardrobe';

const KNOWN_STATES: readonly BuildAroundMatchState[] = [
  'success',
  'no_match',
  'no_wardrobe',
];

/** `wardrobe` = the user owns this piece; `discovery` = a Discovery piece they don't. */
export type BuildAroundSlotSource = 'wardrobe' | 'discovery';

/** `exact` = the look has A's piece in A's color; `similar` = a near color. */
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
  /**
   * How many of the requested anchors this look contains as owned pieces
   * (1..itemIds.length). Looks with more of the user's chosen items rank
   * first; a single-anchor search always has 1 here.
   */
  anchor_coverage: number;
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

const normalizeOutfit = (
  outfit: RawOutfit,
  anchorIds: readonly string[],
): BuildAroundOutfit[] => {
  const slots = (outfit.slots ?? []).flatMap(normalizeSlot);
  // The look must contain the user's piece(s): an anchor slot IS one of the
  // user's items. With several anchors, a look that has at least one of them
  // is kept and `anchor_coverage` says how many it has.
  const owned = new Set(
    slots
      .filter(slot => slot.source === 'wardrobe')
      .map(slot => slot.item.id),
  );
  const coverage = anchorIds.filter(id => owned.has(id)).length;
  if (!outfit.inspiration?.id || !outfit.outfit_hash || coverage === 0) return [];
  return [
    {
      inspiration: outfit.inspiration,
      anchor_match: outfit.anchor_match === 'exact' ? 'exact' : 'similar',
      outfit_hash: outfit.outfit_hash,
      is_complete: slots.every(slot => slot.source === 'wardrobe'),
      slots,
      anchor_coverage: coverage,
    },
  ];
};

/**
 * Valid looks, one per Discovery look — the number of results equals the
 * number of Discovery looks that contain the anchor's piece. Looks containing
 * MORE of the chosen anchors come first (only matters for a multi-item
 * search); within the same coverage exact matches come before close
 * (near-color) ones; each tier keeps the backend order (stable sort).
 */
const normalizeOutfits = (
  outfits: readonly RawOutfit[],
  anchorIds: readonly string[],
): BuildAroundOutfit[] => {
  const seen = new Set<string>();
  const looks = outfits
    .flatMap(outfit => normalizeOutfit(outfit, anchorIds))
    .filter(outfit => {
      if (seen.has(outfit.inspiration.id)) return false;
      seen.add(outfit.inspiration.id);
      return true;
    });
  const tier = (look: BuildAroundOutfit) => (look.anchor_match === 'exact' ? 0 : 1);
  return looks
    .map((look, index) => ({ look, index }))
    .sort(
      (a, b) =>
        b.look.anchor_coverage - a.look.anchor_coverage ||
        tier(a.look) - tier(b.look) ||
        a.index - b.index,
    )
    .map(({ look }) => look);
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
    request: BuildAroundRequest,
    signal?: AbortSignal,
  ): Promise<BuildAroundMatchResponse> => {
    const itemIds = [...new Set(request.itemIds)].slice(0, BUILD_LOOK_MAX_ITEMS);
    const trendTags = [...new Set(request.trendTags)].slice(0, BUILD_LOOK_MAX_TAGS);
    if (itemIds.length === 0) {
      throw new Error('buildAroundMatchService.run: at least one item id is required');
    }
    const response = await apiClient.post(
      '/discovery/build-around',
      {
        item_id: itemIds[0],
        // Lists only when they say more than the scalar fields do, so a
        // single-anchor / single-tag request is byte-for-byte the ba-2 one.
        item_ids: itemIds.length > 1 ? itemIds : undefined,
        trend_tag: trendTags[0],
        trend_tags: trendTags.length > 1 ? trendTags : undefined,
      },
      { signal, timeout: BUILD_AROUND_TIMEOUT_MS },
    );
    const data = (response.data ?? {}) as {
      state?: unknown;
      algorithm_version?: string;
      outfits?: RawOutfit[] | null;
    };
    const state = normalizeBuildAroundState(data.state);
    const outfits =
      state === 'success' ? normalizeOutfits(data.outfits ?? [], itemIds) : [];
    return {
      // A "success" with nothing to show is a no_match, never an empty screen.
      state: state === 'success' && outfits.length === 0 ? 'no_match' : state,
      algorithm_version: data.algorithm_version ?? '',
      outfits,
    };
  },
};
