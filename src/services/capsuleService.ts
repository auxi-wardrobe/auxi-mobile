// Capsule Wardrobe API client.
//
// Frozen contract: plans/260718-0433-capsule-wardrobe/spec.md §4. One fn per
// endpoint, all through the shared `apiClient` (baseURL `${ROOT_URL}/api`), so
// no screen/hook imports axios directly. Response unwrapping is centralised
// here (endpoints return either a bare `CapsuleFull` or an envelope that wraps
// it under `capsule`).
import { apiClient } from './apiClient';
import type { WardrobeItem } from './wardrobeService';

// ── Types ──────────────────────────────────────────────────────────────────

export type CapsuleStatus =
  | 'draft'
  | 'generating'
  | 'success'
  | 'success_with_gaps'
  | 'failed';

/** Outfit-source for the "add from saved outfits" flow. */
export type CapsuleOutfitSource = 'favourites' | 'creations';

/** Swap application scope for the change-item flow. */
export type CapsuleChangeScope = 'outfit' | 'all';

/** Requirements captured in the create wizard step 2. */
export interface CapsuleRequirements {
  temp_min: number | null;
  temp_max: number | null;
  formalness_level: number | null;
  outfit_target: number | null;
  shoe_limit: number | null;
}

/** Category counts driving the detail groups. */
export interface CapsuleCategoryGroups {
  outer: number;
  top: number;
  bottom: number;
  footwear: number;
  accessory: number;
}

/** Expandable summary block on the detail screen. */
export interface CapsuleSummaryBlock {
  outer_count: number;
  top_count: number;
  bottom_count: number;
  shoe_count: number;
  accessory_count: number;
  weather_range: string;
  formalness_score: number;
}

/** List-row / summary shape. */
export interface Capsule {
  id: string;
  name: string;
  status: CapsuleStatus;
  item_count: number;
  outfit_count: number;
  created_at: string;
}

/** A generated outfit inside a capsule. */
export interface CapsuleOutfit {
  id: string;
  outfit_hash: string;
  styling_note: string | null;
  item_ids: string[];
  items: WardrobeItem[];
}

/** Full detail payload. */
export interface CapsuleFull extends Capsule {
  requirements: CapsuleRequirements;
  category_groups: CapsuleCategoryGroups;
  summary: CapsuleSummaryBlock;
  items: WardrobeItem[];
  outfits: CapsuleOutfit[];
  missing_categories: string[];
}

/** Body for `POST /capsules`. */
export interface CreateCapsuleInput {
  name: string;
  temp_min?: number | null;
  temp_max?: number | null;
  formalness_level?: number | null;
  outfit_target?: number | null;
  shoe_limit?: number | null;
  item_ids?: string[];
}

/** Body for `PATCH /capsules/{id}` (design revision §9.1 — all optional). */
export interface UpdateCapsuleInput {
  name?: string;
  temp_min?: number | null;
  temp_max?: number | null;
  formalness_level?: number | null;
  outfit_target?: number | null;
  shoe_limit?: number | null;
}

/** Envelope returned by the add-items / add-from-outfits endpoints. */
export interface AddItemsResult {
  items_added: number;
  already_existed: number;
  new_outfits: number;
  capsule: CapsuleFull;
}

/** Envelope returned by the remove-item endpoint. */
export interface RemoveItemResult {
  removed: boolean;
  capsule: CapsuleFull;
}

// ── Query-key factory ────────────────────────────────────────────────────────

export const capsuleKeys = {
  all: ['capsules'] as const,
  list: () => ['capsules'] as const,
  detail: (id: string) => ['capsules', id] as const,
};

// ── Unwrapping helpers ───────────────────────────────────────────────────────

/** Endpoints return either a bare CapsuleFull or `{ capsule: CapsuleFull }`. */
const unwrapCapsule = (payload: any): CapsuleFull =>
  (payload?.capsule ?? payload) as CapsuleFull;

const unwrapList = (payload: any): Capsule[] =>
  Array.isArray(payload?.capsules) ? (payload.capsules as Capsule[]) : [];

const unwrapAddResult = (payload: any): AddItemsResult => ({
  items_added: Number(payload?.items_added ?? 0),
  already_existed: Number(payload?.already_existed ?? 0),
  new_outfits: Number(payload?.new_outfits ?? 0),
  capsule: unwrapCapsule(payload?.capsule),
});

// ── Service ──────────────────────────────────────────────────────────────────

export const capsuleService = {
  /** POST /capsules → creates + synchronously generates → final CapsuleFull. */
  createCapsule: async (input: CreateCapsuleInput): Promise<CapsuleFull> => {
    try {
      const response = await apiClient.post('/capsules', input);
      return unwrapCapsule(response.data);
    } catch (error) {
      console.error('Error creating capsule', error);
      throw error;
    }
  },

  /** GET /capsules → user-scoped summaries, newest first. */
  listCapsules: async (): Promise<Capsule[]> => {
    try {
      const response = await apiClient.get('/capsules');
      return unwrapList(response.data);
    } catch (error) {
      console.error('Error listing capsules', error);
      throw error;
    }
  },

  /** GET /capsules/{id} → CapsuleFull. */
  getCapsule: async (id: string): Promise<CapsuleFull> => {
    try {
      const response = await apiClient.get(`/capsules/${id}`);
      return unwrapCapsule(response.data);
    } catch (error) {
      console.error('Error fetching capsule', error);
      throw error;
    }
  },

  /**
   * PATCH /capsules/{id} → update provided fields; the backend re-runs
   * generation when any of the 5 constraints changed (design revision §9.1).
   * Returns the final CapsuleFull.
   */
  updateCapsule: async (
    id: string,
    patch: UpdateCapsuleInput,
  ): Promise<CapsuleFull> => {
    try {
      const response = await apiClient.patch(`/capsules/${id}`, patch);
      return unwrapCapsule(response.data);
    } catch (error) {
      console.error('Error updating capsule', error);
      throw error;
    }
  },

  /** DELETE /capsules/{id} → preserves wardrobe items / favourites. */
  deleteCapsule: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/capsules/${id}`);
    } catch (error) {
      console.error('Error deleting capsule', error);
      throw error;
    }
  },

  /** POST /capsules/{id}/generate/retry → re-run generation on a failed capsule. */
  retryGeneration: async (id: string): Promise<CapsuleFull> => {
    try {
      const response = await apiClient.post(`/capsules/${id}/generate/retry`);
      return unwrapCapsule(response.data);
    } catch (error) {
      console.error('Error retrying capsule generation', error);
      throw error;
    }
  },

  /** POST /capsules/{id}/items → add wardrobe items, dedup, regenerate. */
  addItems: async (id: string, itemIds: string[]): Promise<AddItemsResult> => {
    try {
      const response = await apiClient.post(`/capsules/${id}/items`, {
        item_ids: itemIds,
      });
      return unwrapAddResult(response.data);
    } catch (error) {
      console.error('Error adding capsule items', error);
      throw error;
    }
  },

  /** POST /capsules/{id}/items/from-outfits → extract items from saved outfits. */
  addFromOutfits: async (
    id: string,
    outfitSource: CapsuleOutfitSource,
    outfitIds: string[],
  ): Promise<AddItemsResult> => {
    try {
      const response = await apiClient.post(
        `/capsules/${id}/items/from-outfits`,
        { outfit_source: outfitSource, outfit_ids: outfitIds },
      );
      return unwrapAddResult(response.data);
    } catch (error) {
      console.error('Error adding capsule items from outfits', error);
      throw error;
    }
  },

  /** DELETE /capsules/{id}/items/{itemId} → remove item, drop its outfits. */
  removeItem: async (id: string, itemId: string): Promise<RemoveItemResult> => {
    try {
      const response = await apiClient.delete(
        `/capsules/${id}/items/${itemId}`,
      );
      return {
        removed: Boolean(response.data?.removed ?? true),
        capsule: unwrapCapsule(response.data?.capsule),
      };
    } catch (error) {
      console.error('Error removing capsule item', error);
      throw error;
    }
  },

  /** POST /capsules/{id}/items/{itemId}/change → swap an item (scoped). */
  changeItem: async (
    id: string,
    itemId: string,
    replacementItemId: string,
    scope: CapsuleChangeScope,
    outfitId?: string,
  ): Promise<CapsuleFull> => {
    try {
      const response = await apiClient.post(
        `/capsules/${id}/items/${itemId}/change`,
        {
          replacement_item_id: replacementItemId,
          scope,
          ...(scope === 'outfit' && outfitId ? { outfit_id: outfitId } : {}),
        },
      );
      return unwrapCapsule(response.data);
    } catch (error) {
      console.error('Error changing capsule item', error);
      throw error;
    }
  },
};
