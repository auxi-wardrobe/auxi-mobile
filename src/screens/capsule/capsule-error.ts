import axios from 'axios';

/**
 * Sanitized capsule error-kind enum for analytics. NEVER return a raw message
 * or URL — only a bounded, PII-free code. Mirrors the recommendation error
 * classifier pattern.
 */
export type CapsuleErrorKind =
  | 'network_error'
  | 'timeout'
  | 'server_error'
  | 'not_found'
  | 'unknown';

export const classifyCapsuleError = (error: unknown): CapsuleErrorKind => {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return 'timeout';
    }
    const status = error.response?.status;
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
