import { resolveEmailInputRoute } from '../email-input-routing';

describe('resolveEmailInputRoute', () => {
  it('routes existing password email from signup intent to sign-in', () => {
    expect(resolveEmailInputRoute('signup', 'password')).toEqual({
      kind: 'sign-in',
    });
  });

  it('routes new email from signup intent to password creation', () => {
    expect(resolveEmailInputRoute('signup', 'none')).toEqual({
      kind: 'password-creation',
    });
  });

  it('routes unknown email from signin intent to the no-account branch', () => {
    expect(resolveEmailInputRoute('signin', 'none')).toEqual({
      kind: 'unknown-signin-email',
    });
  });

  it.each(['google', 'apple'] as const)(
    'routes %s-linked email to provider notice',
    provider => {
      expect(resolveEmailInputRoute('signin', provider)).toEqual({
        kind: 'email-provider-notice',
      });
    },
  );
});
