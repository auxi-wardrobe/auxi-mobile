import { resolveResetContinueEmail } from '../verified-reset-email';

describe('resolveResetContinueEmail', () => {
  it('prefers the route-carried email when present', () => {
    expect(resolveResetContinueEmail('route@x.com', 'pending@x.com')).toBe(
      'route@x.com',
    );
  });

  it('falls back to pendingVerifyEmail when route email is absent', () => {
    expect(resolveResetContinueEmail(undefined, 'pending@x.com')).toBe(
      'pending@x.com',
    );
  });

  it('falls back to empty string when both are absent', () => {
    expect(resolveResetContinueEmail(undefined, undefined)).toBe('');
    expect(resolveResetContinueEmail(undefined, null)).toBe('');
  });

  it('falls back to pendingVerifyEmail when the route email is an empty string', () => {
    expect(resolveResetContinueEmail('', 'pending@x.com')).toBe(
      'pending@x.com',
    );
  });
});
