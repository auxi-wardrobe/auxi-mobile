import { getSignInInlineErrorMessage } from '../signInErrorMessage';
import type { AuthErrorEnvelope } from '../../../services/authTypes';

const copy = {
  invalidCredentials: 'No account found for this email or the password is incorrect.',
  rateLimited: 'Too many attempts. Please try again later.',
  generic: 'Something went wrong. Please try again.',
};

const makeError = (code: AuthErrorEnvelope['code']): AuthErrorEnvelope => ({
  code,
  message: code,
  status: code === 'RATE_LIMITED' ? 429 : 401,
});

describe('getSignInInlineErrorMessage', () => {
  it('mentions unregistered email for invalid credentials', () => {
    expect(getSignInInlineErrorMessage(makeError('INVALID_CREDENTIALS'), copy))
      .toBe(copy.invalidCredentials);
  });

  it('keeps the rate-limit copy distinct', () => {
    expect(getSignInInlineErrorMessage(makeError('RATE_LIMITED'), copy)).toBe(
      copy.rateLimited,
    );
  });

  it('falls back to generic copy for unknown auth errors', () => {
    expect(getSignInInlineErrorMessage(makeError('UNKNOWN'), copy)).toBe(
      copy.generic,
    );
  });
});
