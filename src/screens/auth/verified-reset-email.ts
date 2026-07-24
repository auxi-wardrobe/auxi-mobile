/**
 * AU-242 — pure resolver for the email VerifiedScreen hands off to SignIn
 * after a password reset.
 *
 * Prefers the deep-link/mutation-carried email (route param, sourced from
 * the backend's `resetPassword` response `email` field) over the older
 * `pendingVerifyEmail` AuthContext value — the forgot-password flow never
 * actually populates `pendingVerifyEmail` (only the signup/PasswordCreation
 * path does), so it's a defensive fallback, not the primary source. Falls
 * back to `''` so SignIn's read-only email field never renders `undefined`.
 */
export const resolveResetContinueEmail = (
  routeEmail: string | undefined,
  pendingVerifyEmail: string | null | undefined,
): string => routeEmail || pendingVerifyEmail || '';
