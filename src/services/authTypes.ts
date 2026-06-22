/**
 * AU-242 UAC — TypeScript types for the auth surface.
 *
 * These types mirror the Pydantic schemas from
 * `wardrobe-backend/schemas/auth.py` 1:1. Per the umbrella's two-repo
 * contract, there is no codegen and no shared SDK — drift between these
 * types and the backend is caught at PR review time.
 *
 * Source of truth: `plans/reports/backend-dev-260522-0906-au-242-phase-02-summary.md`
 * §3 (endpoints) and §4 (error envelope).
 */
import type { User } from '../types/auth';

// ---------------------------------------------------------------------------
// OAuth provider tag (matches backend `users.oauth_provider` column)
// ---------------------------------------------------------------------------

export type OAuthProvider = 'password' | 'google' | 'apple';

// ---------------------------------------------------------------------------
// Token bundle returned by login / google / apple / refresh
// ---------------------------------------------------------------------------

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number; // seconds, typically 900 (15 min)
  refresh_expires_in?: number; // seconds, typically 2_592_000 (30 days)
  user?: User;
}

export interface GenericOkResponse {
  ok: boolean;
  message?: string;
}

// ---------------------------------------------------------------------------
// /api/register (MODIFIED) — no longer issues tokens; verification gate
// ---------------------------------------------------------------------------

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
  /**
   * `true` (real/email mode) — the account needs email verification; the
   * client must route to VerifyEmail and wait for the magic-link deep link.
   * `false` (dev "mock email" mode) — registration already verified the
   * account server-side; the client should auto-complete sign-in instead.
   */
  verification_required: boolean;
  /**
   * Present + `true` only when the backend auto-verified the account at
   * registration time (mock email mode). Treated as a synonym of
   * `verification_required === false` by the client. Omitted in real mode.
   */
  auto_verified?: boolean;
}

// ---------------------------------------------------------------------------
// /api/login (MODIFIED) — adds EMAIL_NOT_VERIFIED + OAUTH_ACCOUNT 403 variants
// ---------------------------------------------------------------------------

export interface LoginRequest {
  email: string;
  password: string;
}

export type LoginResponse = TokenResponse;

export interface LoginEmailNotVerifiedDetail {
  code: 'EMAIL_NOT_VERIFIED';
  message: string;
  email: string;
}

export interface LoginOAuthAccountDetail {
  code: 'OAUTH_ACCOUNT';
  message: string;
  provider: 'google' | 'apple';
}

// ---------------------------------------------------------------------------
// /api/auth/verify-email
// ---------------------------------------------------------------------------

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  verified: boolean;
  already_verified: boolean;
  user: User;
}

// ---------------------------------------------------------------------------
// /api/auth/resend-verification
// ---------------------------------------------------------------------------

export interface ResendVerificationRequest {
  email: string;
}

export type ResendVerificationResponse = GenericOkResponse;

// ---------------------------------------------------------------------------
// /api/auth/forgot-password
// ---------------------------------------------------------------------------

export interface ForgotPasswordRequest {
  email: string;
}

export type ForgotPasswordResponse = GenericOkResponse;

// ---------------------------------------------------------------------------
// /api/auth/reset-password
// ---------------------------------------------------------------------------

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export type ResetPasswordResponse = GenericOkResponse;

// ---------------------------------------------------------------------------
// /api/auth/refresh
// ---------------------------------------------------------------------------

export interface RefreshTokenRequest {
  refresh_token: string;
}

export type RefreshTokenResponse = TokenResponse;

// ---------------------------------------------------------------------------
// /api/auth/logout
// ---------------------------------------------------------------------------

export interface LogoutRequest {
  refresh_token?: string;
}

export type LogoutResponse = GenericOkResponse;

// ---------------------------------------------------------------------------
// /api/auth/google
// ---------------------------------------------------------------------------

export interface GoogleSignInRequest {
  id_token: string;
}

export type GoogleSignInResponse = TokenResponse;

// ---------------------------------------------------------------------------
// /api/auth/apple
// ---------------------------------------------------------------------------

export interface AppleSignInRequest {
  identity_token: string;
  name?: string;
}

export type AppleSignInResponse = TokenResponse;

// ---------------------------------------------------------------------------
// /api/auth/email-precheck
// ---------------------------------------------------------------------------

export interface EmailPrecheckRequest {
  email: string;
}

export interface EmailPrecheckResponse {
  /**
   * "none" — email not registered (only visible to authenticated admin/staff).
   * "password" — has password-based account OR enumeration-safety fallback
   *              returned to anonymous callers regardless of real linkage.
   * "google" / "apple" — visible only to authenticated callers.
   */
  provider: 'none' | OAuthProvider;
}

// ---------------------------------------------------------------------------
// OAuth conflict detail (shared by /google and /apple)
// ---------------------------------------------------------------------------

export interface OAuthConflictDetail {
  code: 'EMAIL_LINKED_TO_PASSWORD' | 'EMAIL_LINKED_TO_OTHER_PROVIDER';
  message: string;
  provider: 'password' | 'google' | 'apple';
}

// ---------------------------------------------------------------------------
// Discriminated error code union — every documented code in §3 of the sidecar.
// ---------------------------------------------------------------------------

/**
 * All known backend error `code` values for the AU-242 auth surface, plus
 * synthetic client-side codes (`NETWORK_ERROR`, `RATE_LIMITED`, `UNKNOWN`).
 *
 * Update this union whenever the backend introduces a new `detail.code`.
 */
export type AuthErrorCode =
  // login (modified)
  | 'EMAIL_NOT_VERIFIED'
  | 'OAUTH_ACCOUNT'
  | 'INVALID_CREDENTIALS'
  // verify-email / reset-password / forgot-password tokens
  | 'TOKEN_INVALID'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_CONSUMED'
  // register
  | 'EMAIL_ALREADY_EXISTS'
  | 'WEAK_PASSWORD'
  // OAuth (google/apple)
  | 'OAUTH_VERIFICATION_FAILED'
  | 'OAUTH_EMAIL_UNVERIFIED'
  | 'EMAIL_LINKED_TO_PASSWORD'
  | 'EMAIL_LINKED_TO_OTHER_PROVIDER'
  | 'APPLE_EMAIL_MISSING'
  // shared
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

/**
 * Backend error envelope after the `app.py` exception-handler fix
 * (commit `6d5bf18`). `code` is lifted to the top level AND preserved
 * inside `detail`. Clients may read either; we read top-level first.
 */
export interface AuthErrorEnvelope {
  code: AuthErrorCode;
  message: string;
  status: number; // HTTP status from the response
  /**
   * Original `detail` payload (provider name, email, etc.). Kept as
   * `unknown`-shaped record so the union below can narrow.
   */
  detail?: Record<string, unknown>;
  request_id?: string;
}

/**
 * Type-guarding helpers for the structured error payloads. Each predicate
 * narrows the `detail` shape when matched against the known `code`.
 */
export const isEmailNotVerifiedError = (
  err: AuthErrorEnvelope,
): err is AuthErrorEnvelope & {
  code: 'EMAIL_NOT_VERIFIED';
  detail: { email: string };
} => err.code === 'EMAIL_NOT_VERIFIED' && typeof err.detail?.email === 'string';

export const isOAuthAccountError = (
  err: AuthErrorEnvelope,
): err is AuthErrorEnvelope & {
  code: 'OAUTH_ACCOUNT';
  detail: { provider: 'google' | 'apple' };
} =>
  err.code === 'OAUTH_ACCOUNT' &&
  (err.detail?.provider === 'google' || err.detail?.provider === 'apple');

export const isOAuthConflictError = (
  err: AuthErrorEnvelope,
): err is AuthErrorEnvelope & {
  code: 'EMAIL_LINKED_TO_PASSWORD' | 'EMAIL_LINKED_TO_OTHER_PROVIDER';
  detail: { provider: 'password' | 'google' | 'apple' };
} =>
  (err.code === 'EMAIL_LINKED_TO_PASSWORD' ||
    err.code === 'EMAIL_LINKED_TO_OTHER_PROVIDER') &&
  typeof err.detail?.provider === 'string';

// ---------------------------------------------------------------------------
// Public user shape — re-exported so screens only import from authTypes.
// ---------------------------------------------------------------------------

export type UserPublicResponse = User;
