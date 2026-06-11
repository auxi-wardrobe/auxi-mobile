/**
 * Shared email-domain → OAuth provider hints.
 *
 * AU-313 / AU-315: the email-entry step and the forgot-password step both
 * need to recognise a Gmail address client-side:
 *   - AU-313: a gmail address should be routed to the Google sign-in path
 *     (mirroring the Apple flow), since Gmail accounts authenticate via
 *     Google OAuth rather than a password.
 *   - AU-315: a gmail user who taps "forgot password" must be told to reset
 *     via the Gmail app — the backend silently skips OAuth-only accounts on
 *     `/api/auth/forgot-password`, so a password-reset email is never sent.
 *
 * NB: this is a *heuristic* based on the email domain only. The backend
 * `/api/auth/email-precheck` is enumeration-safe (anonymous callers always
 * receive `provider: "password"`), so the domain check is the single signal
 * we have client-side for an unauthenticated user. A real password account
 * registered against an @gmail.com address is an accepted edge case — those
 * users can still recover via the "reset in Gmail" guidance + Google sign-in.
 */

/**
 * Domains that resolve to Google sign-in. Kept as a small set rather than a
 * single literal so we can fold in the Google-hosted variants without
 * touching call sites.
 */
const GOOGLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  'gmail.com',
  'googlemail.com',
]);

/** Extract the lowercased domain part of an email, or null if malformed. */
export const getEmailDomain = (email: string): string | null => {
  const at = email.lastIndexOf('@');
  if (at < 0 || at === email.length - 1) return null;
  return email
    .slice(at + 1)
    .trim()
    .toLowerCase();
};

/**
 * True when the email belongs to a Google-hosted domain (gmail.com /
 * googlemail.com) and should therefore be steered to the Google OAuth path.
 */
export const isGoogleEmail = (email: string): boolean => {
  const domain = getEmailDomain(email.trim());
  return domain !== null && GOOGLE_EMAIL_DOMAINS.has(domain);
};
