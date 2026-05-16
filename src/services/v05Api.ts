/**
 * V05 API service — typed wrappers for the V05 onboarding + recommendation
 * endpoints. Authority: `wardrobe-backend/API_DOCUMENTATION.md` §"V05
 * Onboarding (AU-245)" and §"V05 Recommendation Engine".
 *
 * AU-248 — service-layer stubs only. No UI / navigation / Query hooks here;
 * those land in follow-up tickets. The contract is pending tech-lead review
 * on backend PRs #41 + #42, so types may need adjustment after sign-off —
 * any post-review tweak should be a single targeted edit to this file.
 */
import { apiClient } from './apiClient';

// ─────────────────────────────────────────────────────────────────────────────
// Closed enums (mirror backend Pydantic constants)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `wardrobe_direction` accepted by `/onboarding/generate`. Spelling +
 * casing matches the backend's literal allowlist (`Menswear` /
 * `Womenswear` / `Mixed`) — these are user-facing labels, not enum codes.
 */
export const WARDROBE_DIRECTIONS = ['Menswear', 'Womenswear', 'Mixed'] as const;
export type WardrobeDirection = (typeof WARDROBE_DIRECTIONS)[number];

/**
 * `fit_preference` accepted by `/onboarding/generate`. Note the spaces +
 * "Fit" suffix — backend matches the literal string.
 */
export const FIT_PREFERENCES = ['Slim Fit', 'Classic Fit', 'Relaxed Fit'] as const;
export type FitPreference = (typeof FIT_PREFERENCES)[number];

/**
 * Five-vocabulary style tags, used both as `style_preferences` input on
 * onboarding (2-3 unique, ranked) and as `style_affinities` keys + V05
 * vibe `aesthetic_tags` values on the recommendation side.
 */
export const STYLE_TAGS = ['Minimal', 'Casual', 'Soft', 'Bold', 'Formal'] as const;
export type StyleTag = (typeof STYLE_TAGS)[number];

/**
 * `intent.mood` values accepted by `/recommendation/build`. Backend treats
 * `null` (or omitting the field) as a no-op (Layer 4 multiplier = 1.0).
 */
export const MOODS = ['calm', 'confident', 'playful', 'low_energy', 'grounded'] as const;
export type Mood = (typeof MOODS)[number];

/**
 * V05 category families — first-class taxonomy used in pool sizes, item
 * shapes, and outfit composition. `FULL_BODY` is Womenswear/Mixed only;
 * the engine drops `FULL_BODY` outfits when `user.gender = "M"`.
 */
export const CATEGORY_FAMILIES = [
  'TOP',
  'BOTTOM',
  'OUTER',
  'FOOTWEAR',
  'FULL_BODY',
  'ACCESSORY',
] as const;
export type CategoryFamily = (typeof CATEGORY_FAMILIES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding — POST /api/v05/onboarding/generate
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Body for `POST /api/v05/onboarding/generate`.
 *
 * `style_preferences` MUST contain 2-3 unique entries. Order matters:
 * first = highest weight (1.0), then 0.7, then 0.4. Backend rejects
 * 400 on duplicates / unknown values / wrong arity.
 */
export interface GenerateStarterWardrobeInput {
  wardrobe_direction: WardrobeDirection;
  fit_preference: FitPreference;
  style_preferences: StyleTag[];
}

/**
 * Item shape returned in `wardrobe_items[]`. Mirrors the SYSTEM commons
 * row schema after cloning into the user's wardrobe (`USR_` prefix on
 * `human_readable_id`, `is_common_item=false`). `styling_metadata` /
 * `physical_attributes` are opaque JSON blobs the backend hands through
 * — typed as Record<string, unknown> until a downstream consumer needs
 * structured access.
 */
export interface OnboardingWardrobeItem {
  id: string;
  human_readable_id: string;
  name: string;
  image_url: string;
  category: string;
  category_code: string;
  category_family: CategoryFamily;
  layer_code: string;
  style_tags: string[];
  gender_tags: string[];
  styling_metadata: Record<string, unknown>;
  physical_attributes: Record<string, unknown>;
}

/**
 * `profile_classification` block — derived from the user's input,
 * persisted server-side for downstream affinity learning (Phase 2).
 *
 * `style_affinities` always contains all 5 keys with weights 0.0 / 0.4 /
 * 0.7 / 1.0 depending on rank in `style_preferences`.
 */
export interface ProfileClassification {
  gender_style: string;
  fit_classification: string;
  style_affinities: Record<StyleTag, number>;
}

/**
 * Trace block — instrumentation, not consumed by UI today. Useful for
 * QA / debugging. `fallback_used` flips true when Phase 6 has to loosen
 * quotas to hit minimums.
 */
export interface OnboardingTrace {
  pool_size_after_gender_filter: number;
  pool_size_with_style_tags: number;
  fallback_used: boolean;
  fallback_reason: string | null;
  style_tag_diversity_count: number;
  category_distribution: Record<string, number>;
  total_items: number;
  style_affinity_weights: Record<StyleTag, number>;
  elapsed_ms: number;
}

export interface GenerateStarterWardrobeResponse {
  wardrobe_items: OnboardingWardrobeItem[];
  profile_classification: ProfileClassification;
  trace: OnboardingTrace;
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation — POST /api/v05/recommendation/build
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vibe signature — six-dimensional fingerprint emitted per outfit AND
 * accepted as input via `memory.recent_signatures[]` for the novelty
 * filter (R10). Same shape on both sides of the wire.
 */
export interface VibeSignature {
  dominant_color_family: string;
  dominant_silhouette: string;
  formality_band: string;
  statement_level_avg: number;
  aesthetic_tags: string[];
}

/** `weather` input — `temp_c` required, `is_rainy` defaults to false. */
export interface BuildWeather {
  temp_c: number;
  is_rainy?: boolean;
}

/** `user` input — both fields optional with backend defaults. */
export interface BuildUser {
  gender?: 'M' | 'W' | 'U';
  occasion?: string;
}

/** `intent` input — mood biases scoring (Layer 4). Null = no bias. */
export interface BuildIntent {
  mood?: Mood | null;
}

/**
 * `memory` input — last-5 signatures + reasoning the user has seen, used
 * for the novelty filter (R10) and reasoning de-dup. Empty arrays are
 * treated as no-op.
 */
export interface BuildMemory {
  recent_signatures?: VibeSignature[];
  recent_reasoning_used?: string[];
}

/**
 * Body for `POST /api/v05/recommendation/build`. `count` is bounded
 * 1..3 by Pydantic; supply explicitly even though backend defaults to 3.
 */
export interface BuildRecommendationInput {
  weather: BuildWeather;
  user?: BuildUser;
  intent?: BuildIntent;
  memory?: BuildMemory;
  exclude_ids?: string[];
  count?: number;
  seed?: number;
}

/**
 * Item shape in a built outfit. Note this is V05's slimmer projection
 * (the engine returns only the fields it joins on), distinct from the
 * onboarding `OnboardingWardrobeItem` and from the legacy `Item` in
 * `src/types/item.ts`.
 */
export interface V05OutfitItem {
  id: string;
  human_readable_id: string | null;
  name: string | null;
  image_url: string | null;
  category_family: CategoryFamily | null;
  color_code?: string | null;
  style_tags: string[];
}

export interface V05Outfit {
  items: V05OutfitItem[];
  vibe_signature: VibeSignature;
  reasoning_human: string;
  reasoning_debug: string;
  score: number;
}

/**
 * Build trace — engine instrumentation. `fallback_flags` surfaces
 * `style_diversity_unmet` and/or `mood_filtered_outfits` when the pool
 * forced compromises.
 */
export interface BuildTrace {
  engine_version: string;
  layer_timings_ms: Record<string, number>;
  pool_sizes_after_L1: Record<string, number>;
  skipped_log_count: number;
  fallback_flags: string[];
}

export interface BuildRecommendationResponse {
  outfits: V05Outfit[];
  suggested_default: number;
  trace: BuildTrace;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `POST /api/v05/onboarding/generate` — generate a 30-60 item starter
 * wardrobe + persist USR_-prefixed clones into the user's wardrobe.
 * Idempotent on retake (server hard-deletes prior auto-clones first).
 *
 * Auth: Bearer JWT (apiClient interceptor handles it).
 * Errors:
 *   - 400: invalid direction / fit / styles count != 2-3 / unknown style
 *   - 401: missing/invalid token
 *   - 422: pool insufficient even after fallback
 *   - 500: internal
 */
export const generateStarterWardrobe = async (
  input: GenerateStarterWardrobeInput,
): Promise<GenerateStarterWardrobeResponse> => {
  const response = await apiClient.post<GenerateStarterWardrobeResponse>(
    '/v05/onboarding/generate',
    input,
  );
  return response.data;
};

/**
 * `POST /api/v05/recommendation/build` — generate `count` (1-3) outfit
 * recommendations for the authenticated user. Stateless; deterministic
 * given a `seed`. Reads the caller's wardrobe (USR_ clones + manual
 * additions); falls back to the SYSTEM catalog at cold start.
 *
 * Auth: Bearer JWT (apiClient interceptor handles it).
 * Errors:
 *   - 400: invalid temp_c / mood / count / gender
 *   - 401: missing/invalid token
 *   - 422: `pool_insufficient:<reason>` — no anchors / no FOOTWEAR /
 *          no BOTTOM&FB / no valid outfit
 *   - 500: internal
 */
export const buildRecommendation = async (
  input: BuildRecommendationInput,
): Promise<BuildRecommendationResponse> => {
  const response = await apiClient.post<BuildRecommendationResponse>(
    '/v05/recommendation/build',
    input,
  );
  return response.data;
};
