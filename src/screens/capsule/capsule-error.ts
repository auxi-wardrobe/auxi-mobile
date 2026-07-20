/**
 * Sanitized capsule error-kind enum for analytics. NEVER return a raw message
 * or URL — only a bounded, PII-free code. Mirrors the recommendation error
 * classifier pattern in `utils/aiError.ts` (structural reads, no axios import).
 */
export type CapsuleErrorKind =
  | 'network_error'
  | 'timeout'
  | 'server_error'
  | 'not_found'
  | 'unknown';

export const classifyCapsuleError = (error: unknown): CapsuleErrorKind => {
  const err = error as {
    isAxiosError?: boolean;
    code?: string;
    response?: { status?: number };
  };
  // `axios.isAxiosError` checks exactly this flag — read it structurally so we
  // don't pull axios into a pure classifier (matches aiError.ts's pattern).
  if (err?.isAxiosError) {
    if (err.code === 'ECONNABORTED') {
      return 'timeout';
    }
    const status = err.response?.status;
    if (status === undefined) {
      return 'network_error';
    }
    if (status === 404) {
      return 'not_found';
    }
    if (status >= 500) {
      return 'server_error';
    }
    return 'unknown';
  }
  return 'unknown';
};
