/**
 * Helpers for reading + classifying backend AI error responses.
 *
 * The backend surfaces two typed AI failures via the standard FastAPI
 * `{ detail: { code, message } }` envelope:
 *   - 429 { detail: { code: "ai_daily_limit_reached", ... } }
 *   - 503 { detail: { code: "ai_temporarily_unavailable", ... } }
 *
 * `getApiErrorCode` reads that `detail.code` safely (screens map it to specific
 * user-facing states); `classifyRecommendationError` maps any axios-style error
 * to a sanitized analytics `error_kind` — NEVER a raw message / URL / PII.
 */

export const AI_DAILY_LIMIT_CODE = 'ai_daily_limit_reached';
export const AI_UNAVAILABLE_CODE = 'ai_temporarily_unavailable';

/** Safely read the backend `detail.code` from an axios-style error, if present. */
export const getApiErrorCode = (error: unknown): string | undefined => {
  const detail = (
    error as { response?: { data?: { detail?: { code?: unknown } } } }
  )?.response?.data?.detail;
  const code = detail?.code;
  return typeof code === 'string' ? code : undefined;
};

export type RecommendationErrorKind =
  | 'network'
  | 'rate_limited'
  | 'ai_unavailable'
  | 'server'
  | 'unknown';

/**
 * Map an axios-style error to a sanitized `{ kind, status }` for analytics.
 * `status` is the HTTP status code (not PII) and is omitted when absent so no
 * `null` / `undefined` ships as a property value.
 */
export const classifyRecommendationError = (
  error: unknown,
): { kind: RecommendationErrorKind; status?: number } => {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  const code = (error as { code?: string })?.code;

  // Offline / timeout (axios sets ECONNABORTED on timeout) / cancelled → no HTTP
  // status reached the app; treat as a network-class failure.
  if (
    code === 'ERR_NETWORK' ||
    code === 'ECONNABORTED' ||
    code === 'ERR_CANCELED'
  ) {
    return { kind: 'network' };
  }

  if (status === 429) return { kind: 'rate_limited', status };
  if (status === 503) return { kind: 'ai_unavailable', status };
  if (typeof status === 'number' && status >= 500) {
    return { kind: 'server', status };
  }
  if (typeof status === 'number') return { kind: 'unknown', status };
  return { kind: 'unknown' };
};
