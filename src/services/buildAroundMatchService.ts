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
//   POST /discovery/build-around   { item_id, trend_tag? }
//
// Two entry points share this call and MUST produce the same result for the
// same item: ItemDetail ("Build around this", one anchor) and the Home
// landing "Build your look" section (up to `BUILD_LOOK_MAX_ITEMS` anchors).
// A multi-item search is NOT a different request: `runMany` sends the exact
// single-item request once per chosen item and merges the answers on the
// client (`mergeBuildAroundResults`), so each look is computed, ranked and
// rendered exactly as it would be from ItemDetail, and a look that contains
// several of the chosen items simply ranks first.
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
   * How many of the searched anchors this look contains as owned pieces.
   * Always 1 for a single-item search; `runMany` raises it when the same
   * Discovery look came back for several of the chosen items.
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

const normalizeOutfit = (outfit: RawOutfit, anchorId: string): BuildAroundOutfit[] => {
  const slots = (outfit.slots ?? []).flatMap(normalizeSlot);
  // The look must contain the user's piece: its anchor slot IS the user's item.
  const hasAnchor = slots.some(
    slot => slot.item.id === anchorId && slot.source === 'wardrobe',
  );
  if (!outfit.inspiration?.id || !outfit.outfit_hash || !hasAnchor) return [];
  return [
    {
      inspiration: outfit.inspiration,
      anchor_match: outfit.anchor_match === 'exact' ? 'exact' : 'similar',
      outfit_hash: outfit.outfit_hash,
      is_complete: slots.every(slot => slot.source === 'wardrobe'),
      slots,
      anchor_coverage: 1,
    },
  ];
};

/**
 * Valid looks, one per Discovery look — the number of results equals the
 * number of Discovery looks that contain the anchor's piece. Exact matches
 * come first, then close (near-color) ones; each tier keeps the backend order.
 */
const normalizeOutfits = (
  outfits: readonly RawOutfit[],
  anchorId: string,
): BuildAroundOutfit[] => {
  const seen = new Set<string>();
  const looks = outfits
    .flatMap(outfit => normalizeOutfit(outfit, anchorId))
    .filter(outfit => {
      if (seen.has(outfit.inspiration.id)) return false;
      seen.add(outfit.inspiration.id);
      return true;
    });
  return [
    ...looks.filter(look => look.anchor_match === 'exact'),
    ...looks.filter(look => look.anchor_match === 'similar'),
  ];
};

/**
 * Fold the per-item answers of a multi-item search into one result that
 * reads exactly like a single-item one:
 *
 *   • one entry per Discovery look (`inspiration.id`), in first-seen order
 *     (item 1's looks, then item 2's new ones, …);
 *   • a look that came back for several items is merged slot by slot
 *     (`inspiration_item_id`): an owned piece always wins over a Discovery
 *     one, and a wardrobe item never appears twice in a look;
 *   • `anchor_coverage` = how many of the chosen items the merged look owns;
 *     `anchor_match` is `exact` only when EVERY item's version was exact
 *     (one near-color anchor makes the whole look a "Close match");
 *   • order: most chosen items first, then exact before similar, then the
 *     first-seen order — so with one item this is the identity.
 *
 * State: `success` as soon as one look exists; otherwise `no_wardrobe` only
 * when every answer said so, else `no_match`.
 */
export const mergeBuildAroundResults = (
  results: readonly BuildAroundMatchResponse[],
  anchorIds: readonly string[],
): BuildAroundMatchResponse => {
  const byLook = new Map<string, BuildAroundOutfit>();
  results.forEach(result => {
    result.outfits.forEach(look => {
      const existing = byLook.get(look.inspiration.id);
      if (!existing) {
        byLook.set(look.inspiration.id, { ...look, slots: [...look.slots] });
        return;
      }
      const slots = [...existing.slots];
      look.slots.forEach(slot => {
        const at = slots.findIndex(
          other => other.inspiration_item_id === slot.inspiration_item_id,
        );
        if (at >= 0) {
          if (slots[at].source === 'discovery' && slot.source === 'wardrobe') {
            slots[at] = slot;
          }
          return;
        }
        if (
          slot.source === 'wardrobe' &&
          slots.some(other => other.source === 'wardrobe' && other.item.id === slot.item.id)
        ) {
          return;
        }
        slots.push(slot);
      });
      byLook.set(look.inspiration.id, {
        ...existing,
        anchor_match:
          existing.anchor_match === 'exact' && look.anchor_match === 'exact'
            ? 'exact'
            : 'similar',
        slots,
      });
    });
  });

  const looks = [...byLook.values()].map(look => {
    const owned = new Set(
      look.slots.filter(slot => slot.source === 'wardrobe').map(slot => slot.item.id),
    );
    return {
      ...look,
      is_complete: look.slots.every(slot => slot.source === 'wardrobe'),
      anchor_coverage: Math.max(1, anchorIds.filter(id => owned.has(id)).length),
    };
  });
  const tier = (look: BuildAroundOutfit) => (look.anchor_match === 'exact' ? 0 : 1);
  const outfits = looks
    .map((look, index) => ({ look, index }))
    .sort(
      (a, b) =>
        b.look.anchor_coverage - a.look.anchor_coverage ||
        tier(a.look) - tier(b.look) ||
        a.index - b.index,
    )
    .map(({ look }) => look);

  const success = results.find(result => result.state === 'success');
  const state: BuildAroundMatchState =
    outfits.length > 0
      ? 'success'
      : results.length > 0 && results.every(result => result.state === 'no_wardrobe')
        ? 'no_wardrobe'
        : 'no_match';
  return {
    state,
    algorithm_version: (success ?? results[0])?.algorithm_version ?? '',
    outfits,
  };
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

  /**
   * The Home "Build your look" search: the SAME request as `run`, once per
   * chosen item, in parallel, folded with `mergeBuildAroundResults`. One
   * item ⇒ exactly `run`. Rejects like `run` if any request fails or aborts.
   */
  runMany: async (
    itemIds: readonly string[],
    trendTag: string | null,
    signal?: AbortSignal,
  ): Promise<BuildAroundMatchResponse> => {
    const ids = [...new Set(itemIds)].slice(0, BUILD_LOOK_MAX_ITEMS);
    if (ids.length === 0) {
      throw new Error('buildAroundMatchService.runMany: at least one item id is required');
    }
    if (ids.length === 1) {
      return buildAroundMatchService.run(ids[0], trendTag, signal);
    }
    const results = await Promise.all(
      ids.map(id => buildAroundMatchService.run(id, trendTag, signal)),
    );
    return mergeBuildAroundResults(results, ids);
  },
};
