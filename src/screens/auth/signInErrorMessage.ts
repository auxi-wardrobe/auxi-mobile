import type { AuthErrorEnvelope } from '../../services/authTypes';

export interface SignInInlineErrorCopy {
  invalidCredentials: string;
  rateLimited: string;
  generic: string;
}

export const getSignInInlineErrorMessage = (
  err: AuthErrorEnvelope,
  copy: SignInInlineErrorCopy,
): string => {
  if (err.code === 'INVALID_CREDENTIALS') return copy.invalidCredentials;
  if (err.code === 'RATE_LIMITED') return copy.rateLimited;
  return copy.generic;
};
