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
import { getBuildMemory, recordServedOutfit } from './recommendationMemory';
import type { UserConfidenceLevel, UserStyleDirection } from '../types/auth';

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
export const FIT_PREFERENCES = [
  'Slim Fit',
  'Classic Fit',
  'Relaxed Fit',
] as const;
export type FitPreference = (typeof FIT_PREFERENCES)[number];

/**
 * Five-vocabulary style tags, used both as `style_preferences` input on
 * onboarding (2-3 unique, ranked) and as `style_affinities` keys + V05
 * vibe `aesthetic_tags` values on the recommendation side.
 */
export const STYLE_TAGS = [
  'Minimal',
  'Casual',
  'Soft',
  'Bold',
  'Formal',
] as const;
export type StyleTag = (typeof STYLE_TAGS)[number];

/**
 * `intent.mood` values accepted by `/recommendation/build`. Backend treats
 * `null` (or omitting the field) as a no-op (Layer 4 multiplier = 1.0).
 */
export const MOODS = [
  'calm',
  'confident',
  'playful',
  'low_energy',
  'grounded',
] as const;
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

/** `user` input — all fields optional with backend defaults. */
export interface BuildUser {
  gender?: 'M' | 'W' | 'U';
  occasion?: string;
  /**
   * Persona preferences sourced from `user_metadata` (Settings / onboarding).
   * `style_direction` nudges the formality axis (relaxed ↔ polished);
   * `confidence_level` nudges the statement axis (conservative ↔ bold).
   * Omitted when unset so the backend applies its own defaults.
   */
  style_direction?: UserStyleDirection;
  confidence_level?: UserConfidenceLevel;
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
  // AU-307 phase 04 — BE PR #104 (unmerged at FE land): when set, the
  // generated outfit must include this wardrobe item id. BE owns the
  // ownership/SYSTEM-source validation; 410 / 422 errors map to
  // PINNED_ITEM_GONE on the reducer.
  pinned_item_id?: string;
}

/**
 * Item shape in a built outfit. Note this is V05's slimmer projection
 * (the engine returns only the fields it joins on), distinct from the
 * onboarding `OnboardingWardrobeItem` and from the legacy `Item` in
 * `src/types/item.ts`.
 *
 * Phase 1 LLM-1 additions: `formality_level` exposed for the diversifier
 * to anchor elevated-tier picks. `source` distinguishes user-owned items
 * from SYSTEM common-essential fallback injections (Spec v2 §4.4).
 */
export interface V05OutfitItem {
  id: string;
  human_readable_id: string | null;
  name: string | null;
  image_url: string | null;
  image_png?: string | null; // background-removed PNG cutout (backend to_dict), nullable
  category_family: CategoryFamily | null;
  color_code?: string | null;
  style_tags: string[];
  formality_level?: string | null;
  source?: 'user' | 'common_essential';
  // AU-351 (backend PR #101): true for newly-uploaded items inside the active
  // exploration window. Surfaced on outfit tiles as the "Your Piece" badge.
  is_exploration_item?: boolean;
}

/**
 * Tier role assigned by LLM-1 Build Diversifier (Phase 1). `null` when
 * the diversifier was not engaged (e.g. wardrobe too small or LLM-1
 * disabled). UI may surface `tier_role` to label cards as Safe /
 * Elevated / Exploratory.
 */
export type V05TierRole = 'safe' | 'elevated' | 'exploratory';

export interface V05Outfit {
  items: V05OutfitItem[];
  vibe_signature: VibeSignature;
  reasoning_human: string;
  reasoning_debug: string;
  score: number;
  /** Phase 2 — stable 12-char SHA-256 prefix over sorted item IDs. */
  outfit_hash: string;
  /** Phase 1 LLM-1 tier assignment. */
  tier_role?: V05TierRole | null;
  /** Raw composite score from the engine pipeline (pre tier-assignment). */
  engine_score?: number | null;
}

/**
 * LLM-1 call trace — surfaces whether the diversifier actually fired or
 * fell back. `source = "llm"` means the LLM picked; `"fallback_top_score"`
 * means insufficient pools or a transient failure.
 */
export interface V05Llm1Call {
  source: 'llm' | 'fallback_top_score';
  latency_ms: number;
  fallback: boolean;
  fallback_reason: string | null;
  cache_hit: boolean;
}

/**
 * Build trace — engine instrumentation. `fallback_flags` surfaces
 * `style_diversity_unmet` and/or `mood_filtered_outfits` when the pool
 * forced compromises.
 *
 * Phase 1 + 2 additions: tier pool snapshot, LLM-1 call trace, anchor
 * diversity metric, and Phase 2 signal-reweight flags. All optional —
 * legacy responses without these fields continue to parse.
 */
export interface BuildTrace {
  engine_version: string;
  layer_timings_ms: Record<string, number>;
  pool_sizes_after_L1: Record<string, number>;
  skipped_log_count: number;
  fallback_flags: string[];
  /** Phase 2 — true when engine L4 applied user style-signal reweighting. */
  signal_reweight_applied?: boolean | null;
  /** Phase 2 — count of active signals consumed for this Build. */
  signal_count?: number | null;
  /** Phase 1 — per-tier pool sizes after pre-tag filtering. */
  tier_pools_after_pretag?: Record<string, number> | null;
  /** Phase 1 — LLM-1 call instrumentation. */
  llm1_call?: V05Llm1Call | null;
  /** Phase 0 — distinct anchors across primary + alternates. */
  anchor_diversity_score?: number | null;
  anchor_diversity_pool_size?: number | null;
  /**
   * Diversity plan 260611-2012 (try_another traces only) — served outfit's
   * composite distance to the nearest seen outfit, and the active floor
   * (0.35, or 0.175 when relaxed). Diagnostic only — no UI behavior.
   */
  min_distance?: number | null;
  distance_floor?: number | null;
}

/**
 * Locked vocabulary for `wardrobe_gap_reason`. v1 raises only the first
 * two codes; rain/formal reserved for v2 (Spec v2 §4.5).
 */
export type V05WardrobeGapReason =
  | 'cold_weather_no_outerwear'
  | 'hot_weather_no_lightwear'
  | 'rain_no_waterproof'
  | 'formal_no_structured';

export interface BuildRecommendationResponse {
  outfits: V05Outfit[];
  suggested_default: number;
  trace: BuildTrace;
  /**
   * Server-issued session ID (UUIDv4). Pass back to `/try_another` to
   * preserve the seen-set for distance-based diversity. Null if the
   * session-cache write failed (stateless degraded mode — try_another
   * still works but cross-call diversity weakens).
   */
  session_id?: string | null;
  /**
   * True when even the SYSTEM common-items catalog can't fill the
   * climate-starved slot. When true, `outfits` is empty and the client
   * should render a wardrobe-gap CTA per `wardrobe_gap_reason`.
   */
  wardrobe_gap?: boolean;
  wardrobe_gap_reason?: V05WardrobeGapReason | null;
  /**
   * True when fewer than 3 tier pools (safe/elevated/exploratory) could
   * be filled — wardrobe too small to cover all tiers. UI may relabel
   * "Try Another" CTA accordingly.
   */
  tier_pools_partial?: boolean;
  /**
   * AU-307 phase 04 (BE PR #104) — true when the BE relaxed the
   * pinned-item compatibility constraints to compose this outfit.
   * Drives `GENERATE_FALLBACK` in the FE reducer instead of
   * `GENERATE_SUCCESS`.
   */
  low_confidence?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Try Another — POST /api/v05/recommendation/try_another
// (contract: wardrobe-backend/docs/v05-try-another-mobile-contract.md)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * V05 mode tone hint (contract §3). Recorded for telemetry; a no-op in the
 * MVP engine until AU-221 wires modes through. Mirrors the V2-side
 * `RecommendationMode` string union but kept local so V05 stays
 * self-contained.
 */
export type V05RecommendationMode = 'safe' | 'power' | 'creative';

/**
 * Body for `POST /api/v05/recommendation/try_another` (contract §3).
 * `session_id` + `current_outfit_hash` are required; the rest are optional.
 */
export interface TryAnotherInput {
  session_id: string;
  current_outfit_hash: string;
  style_feedback?: string;
  pinned_item_id?: string;
  mode?: V05RecommendationMode;
}

/**
 * Response for `/try_another` (contract §4). `outfit` reuses the existing
 * `V05Outfit` / `V05OutfitItem` shapes already defined above. `outfit` is
 * `null` only when `fallback=true` (pool exhausted + recompose failed) or
 * on a wardrobe gap.
 */
export interface TryAnotherResponse {
  outfit: V05Outfit | null;
  session_id: string;
  // NOTE: the wire still carries a deprecated `variation_axis` field —
  // ALWAYS null since the diversity plan (260611-2012) — intentionally
  // undeclared here so nothing can read it. Backend removes it next.
  fallback: boolean;
  fallback_flags: string[];
  trace?: BuildTrace;
  message: string | null;
  /**
   * Backend sustainability contract (2026-05-27): `true` when the unique
   * variation pool was exhausted and this is a controlled RE-SERVE of a
   * previously-seen outfit. `fallback` is `false` and a real `outfit` is
   * still present — render it like any normal outfit; do NOT treat this as
   * a dead-end. `fallback_flags` may also include `"variations_cycled"`.
   */
  cycled?: boolean;
  /** Spec v2 §4.6 — set when no outfit is composable even with commons. */
  wardrobe_gap?: boolean;
  wardrobe_gap_reason?: V05WardrobeGapReason | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feedback — POST /api/v05/feedback (Phase 2 LLM-2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Body for `POST /api/v05/feedback`. At least one of `text` or
 * `photo_b64` MUST be provided — the server returns 400 if both empty.
 *
 * `photo_b64`: base64-encoded JPEG/PNG, max ~5MB binary (~7MB encoded).
 * Processed in memory only — never stored to disk.
 *
 * Server runs LLM-2 (OpenAI gpt-4o-mini vision) to parse the photo +
 * text into axis-level style signals (likes/dislikes), persists with a
 * 30-day decay window, then reweights the user's future Build candidates
 * via the engine L4 signal vector.
 */
export interface SubmitFeedbackInput {
  outfit_id: string;
  session_id?: string;
  text?: string;
  photo_b64?: string;
  event_metadata?: Record<string, string>;
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
  options?: { signal?: AbortSignal },
): Promise<BuildRecommendationResponse> => {
  const response = await apiClient.post<BuildRecommendationResponse>(
    '/v05/recommendation/build',
    input,
    options?.signal ? { signal: options.signal } : undefined,
  );
  return response.data;
};

/**
 * `POST /api/v05/feedback` — submit post-wear feedback for one outfit.
 * Server runs LLM-2 multimodal parse, persists axis signals with 30-day
 * decay, and the user's next `/build` will see L4 score adjustments
 * (multiplier ∈ [0.5, 1.5]) for the liked/disliked axes.
 *
 * No response body — 204 on success. Failures persist nothing (silent
 * miss); callers should treat 204 as best-effort, not a confirmation
 * that LLM-2 successfully extracted signals.
 *
 * Auth: Bearer JWT (apiClient interceptor handles it).
 * Rate limit: 20 req/min per user.
 * Errors:
 *   - 400: missing both `text` and `photo_b64`, or invalid base64 size
 *   - 401: missing/invalid token
 *   - 422: schema validation (outfit_id too long, photo_b64 > ~7MB)
 *   - 429: rate limit hit
 *   - 500: internal
 */
export const submitFeedback = async (
  input: SubmitFeedbackInput,
): Promise<void> => {
  await apiClient.post('/v05/feedback', input);
};

/**
 * `POST /api/v05/recommendation/try_another` — thin wrapper. Serves a
 * cheap variation from the session's Redis pool (distance-based diversity
 * selection vs ALL outfits seen this session — diversity plan 260611-2012),
 * recomposing only on cache-miss. ~1/100th the cost of `/build`.
 *
 * Auth: Bearer JWT (apiClient interceptor handles it).
 * Errors (see contract §5 — handled by the `recommendV05` façade):
 *   - 410 `session_expired` (also cross-user ownership) → reset + build
 *   - 422 `stale_hash` → reset + build
 *   - 429 `session_locked` → silent backoff retry
 *   - 429 rate-limit / 401 / 500 / timeout → bubble
 */
export const tryAnother = async (
  input: TryAnotherInput,
  options?: { signal?: AbortSignal },
): Promise<TryAnotherResponse> => {
  const response = await apiClient.post<TryAnotherResponse>(
    '/v05/recommendation/try_another',
    input,
    options?.signal ? { signal: options.signal } : undefined,
  );
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// V05 sticky session (mirror of recommendationService's V2 closure pattern)
// ─────────────────────────────────────────────────────────────────────────────
//
// `session_id` + the latest served `outfit_hash` live at module scope for
// the lifetime of one dressing session. The first `recommendV05` call hits
// `/build` (heavy: engine + LLM-1, seeds a Redis pool); every subsequent
// call hits `/try_another` (cheap: pool serve). Reset on:
//   - context/refine submit (HomeScreen.handleSubmitContext → fresh build)
//   - mode change (HomeScreen.handleSelectMode → next prefetch rebuilds)
//   - 410 session_expired / 422 stale_hash (auto-fallback to /build)
//
// `session_id` is bearer-equivalent (contract §8) — NEVER log it (no
// `console.*` with session_id; do not embed in deep links / aggregators).
//
// Cleared on logout / session expiry: AuthContext's identity effect calls
// `resetV05Session()` (and `setRecommendationMemoryUser(null)`) when `user`
// transitions to null, so a session_id never outlives the user it belongs to.
// (recommendationService.resetSession — the V2 path — still has this gap.)
let v05SessionId: string | null = null;
let v05LastOutfitHash: string | null = null;

/** Reset the cached V05 session — forces the next `recommendV05` to `/build`. */
export const resetV05Session = (): void => {
  v05SessionId = null;
  v05LastOutfitHash = null;
};

/**
 * Façade result. `outfits` is the V05 build batch HomeScreen maps + dedups
 * (unchanged). The optional flags let HomeScreen distinguish exhaustion cases
 * without re-plumbing the raw `/try_another` response:
 *   - `cycled`: a real (re-served) outfit is present — render normally; HOME
 *     may show a subtle "seen them all" hint. Never a dead-end.
 *   - `wardrobeGap`: GENUINE dead-end — the wardrobe is too small to compose
 *     any outfit. `outfits` is empty. HOME surfaces a terminal "add items" CTA.
 * `/build` results carry neither flag.
 */
export interface RecommendV05Result {
  outfits: V05Outfit[];
  cycled?: boolean;
  wardrobeGap?: boolean;
  /**
   * AU-307 phase 04 — propagated from /build's `low_confidence`. True when
   * the BE relaxed pinned-item compatibility constraints. Drives
   * GENERATE_FALLBACK instead of GENERATE_SUCCESS in the FE reducer.
   * Only emitted on the /build path (the /try_another contract has no
   * low_confidence flag — variation calls re-use the pre-locked session).
   */
  lowConfidence?: boolean;
  /**
   * Server-issued session id, surfaced so the FE can detect "do we have a
   * session?" to choose /build vs /try_another. Mirrors the cached
   * v05SessionId at module scope.
   */
  sessionId?: string | null;
}

/**
 * Params accepted by the `recommendV05` façade. Combines the build-shaping
 * inputs (weather/user/intent/count) with the per-variation inputs the
 * HomeScreen threads (mode, style_feedback, pinned_item_id,
 * current_outfit_hash).
 */
export interface RecommendV05Params {
  // Build-shaping inputs (used only on the cold-start `/build`).
  weather: BuildWeather;
  user?: BuildUser;
  intent?: BuildIntent;
  count?: number;
  // Per-variation inputs (threaded into `/try_another`).
  current_outfit_hash?: string;
  style_feedback?: string;
  pinned_item_id?: string;
  mode?: V05RecommendationMode;
}

const RETRY_LOCKED_MAX_ATTEMPTS = 3;
const RETRY_LOCKED_BACKOFF_MS = 200;

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

type ErrorWithDetail = {
  response?: {
    status?: number;
    data?: { detail?: { code?: string } };
  };
};

const errStatus = (error: unknown): number | undefined =>
  (error as ErrorWithDetail)?.response?.status;
const errCode = (error: unknown): string | undefined =>
  (error as ErrorWithDetail)?.response?.data?.detail?.code;

/**
 * Run `/build`, cache the new session_id + the suggested-default outfit's
 * hash (guarding an out-of-range `suggested_default`), and return its
 * outfits.
 */
const buildAndStore = async (
  params: RecommendV05Params,
  options?: { signal?: AbortSignal },
): Promise<RecommendV05Result> => {
  // Thread the long-term memory (last-5 signatures + reasoning the user has
  // already seen) so the engine's novelty filter (R10) avoids cross-session
  // repeats. Omitted entirely when empty — the backend no-ops empty arrays.
  const memory = getBuildMemory();
  const data = await buildRecommendation(
    {
      weather: params.weather,
      user: params.user,
      intent: params.intent,
      count: params.count ?? 3,
      ...(memory ? { memory } : {}),
      ...(params.pinned_item_id
        ? { pinned_item_id: params.pinned_item_id }
        : {}),
    },
    options,
  );
  v05SessionId = data.session_id ?? null;
  const defaultIdx = data.suggested_default ?? 0;
  const anchor = data.outfits[defaultIdx];
  v05LastOutfitHash = anchor?.outfit_hash ?? null;
  // Remember the outfit we're anchoring on so the NEXT cold-start build sees it.
  if (anchor) {
    recordServedOutfit(anchor);
  }
  return {
    outfits: data.outfits,
    lowConfidence: data.low_confidence === true,
    sessionId: data.session_id ?? null,
    // Cold-start `/build` can also come back empty on a climate-starved slot
    // (`wardrobe_gap`) — propagate it so HomeScreen shows the terminal CTA
    // instead of a blank deck. Previously only `/try_another` surfaced this,
    // so a NEW user whose first `/build` returned no outfit saw a blank screen.
    wardrobeGap: data.wardrobe_gap === true,
  };
};

/**
 * Façade used by HomeScreen. First invocation (no session) calls `/build`
 * and caches the `session_id`; every subsequent invocation calls
 * `/try_another` with the cached session + the active outfit hash.
 *
 * Returns `RecommendV05Result` — `outfits` keeps HomeScreen's existing
 * `V05Outfit → legacy Outfit` mapping + append/dedup logic unchanged.
 * `/try_another` returns a single outfit → a one-element batch. With the
 * backend sustainability fix (2026-05-27) transient exhaustion now re-serves
 * a real outfit flagged `cycled` (still a one-element batch). A GENUINE
 * `wardrobe_gap` is the only remaining empty batch — surfaced via the
 * `wardrobeGap` flag so HomeScreen can show a terminal CTA instead of a
 * silent freeze.
 *
 * Error handling (contract §5/§6):
 *   - 410 `session_expired` (incl. cross-user ownership) → silent reset + build
 *   - 422 `stale_hash` → identical to 410
 *   - 429 `session_locked` → silent backoff retry (≤3 attempts) then bubble
 *   - everything else (429 rate-limit, 401, 500, timeout) → rethrow so the
 *     HomeScreen mutation `onError` shows the existing fallback UI.
 */
export const recommendV05 = async (
  params: RecommendV05Params,
  options?: { signal?: AbortSignal },
): Promise<RecommendV05Result> => {
  // Cold start / post-reset → /build.
  if (!v05SessionId) {
    return buildAndStore(params, options);
  }

  const tryAnotherInput: TryAnotherInput = {
    session_id: v05SessionId,
    current_outfit_hash: params.current_outfit_hash ?? v05LastOutfitHash ?? '',
    ...(params.style_feedback ? { style_feedback: params.style_feedback } : {}),
    ...(params.pinned_item_id ? { pinned_item_id: params.pinned_item_id } : {}),
    ...(params.mode ? { mode: params.mode } : {}),
  };

  for (let attempt = 0; attempt < RETRY_LOCKED_MAX_ATTEMPTS; attempt++) {
    try {
      const data = await tryAnother(tryAnotherInput, options);
      // `cycled` re-serves a real outfit (uniques exhausted, controlled
      // re-serve) — pass it through with the outfit so HomeScreen can show a
      // subtle hint. A GENUINE `wardrobe_gap` is the honest dead-end (no
      // outfit) — surface it so HomeScreen renders a terminal CTA instead of a
      // silent freeze. `cycled` may also appear in `fallback_flags`
      // ("variations_cycled") — the top-level field is authoritative.
      if (data.outfit?.outfit_hash) {
        v05LastOutfitHash = data.outfit.outfit_hash;
      }
      // Feed the served variation into long-term memory too (no-op on a
      // `cycled` re-serve of the same hash — recordServedOutfit dedups).
      if (data.outfit) {
        recordServedOutfit(data.outfit);
      }
      const cycled =
        data.cycled === true ||
        data.fallback_flags?.includes('variations_cycled');
      return {
        outfits: data.outfit ? [data.outfit] : [],
        cycled,
        wardrobeGap: data.wardrobe_gap === true,
        sessionId: data.session_id ?? v05SessionId,
      };
    } catch (error: unknown) {
      const status = errStatus(error);
      const code = errCode(error);

      // 410 session_expired (also cross-user) OR 422 stale_hash → reset +
      // build silently and return the fresh build's outfits.
      if (
        (status === 410 && code === 'session_expired') ||
        (status === 422 && code === 'stale_hash')
      ) {
        resetV05Session();
        return buildAndStore(params, options);
      }

      // 429 session_locked → benign race against a previous tap still in
      // flight. Silent backoff retry; bubble after the cap.
      if (status === 429 && code === 'session_locked') {
        if (attempt < RETRY_LOCKED_MAX_ATTEMPTS - 1) {
          await sleep(RETRY_LOCKED_BACKOFF_MS);
          continue;
        }
        throw error;
      }

      // 429 rate-limit, 401, 500, timeout, validation 422, etc. → bubble to
      // HomeScreen's mutation onError (existing fallback UI). Do NOT log
      // session_id (contract §8).
      throw error;
    }
  }

  // Unreachable (the loop either returns or throws), but satisfies the
  // compiler's return-path analysis.
  return { outfits: [] };
};
