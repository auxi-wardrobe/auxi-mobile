/**
 * TanStack Query mutation / query hooks for AU-242 UAC auth.
 *
 * Each hook is a thin wrapper around the typed authService function in
 * `src/services/auth.ts`. Mutations are kept caller-agnostic — they
 * surface the raw `AuthErrorEnvelope` to the screen, which is responsible
 * for branching on `code` and rendering vi-VN copy.
 *
 * Invalidations: any mutation that establishes or destroys a session
 * invalidates the `currentUser` query so AuthContext picks up the new
 * state. (`currentUser` hook will land in phase 04 alongside the
 * screens; the query key is reserved here.)
 */
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import {
  emailPrecheck,
  forgotPassword,
  loginWithPassword,
  logout as logoutCall,
  refreshTokens,
  registerAccount,
  resendVerification,
  resetPassword,
  signInWithApple,
  signInWithGoogle,
  verifyEmail,
} from '../../services/auth';
import type {
  AppleSignInRequest,
  AppleSignInResponse,
  AuthErrorEnvelope,
  EmailPrecheckRequest,
  EmailPrecheckResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  GoogleSignInRequest,
  GoogleSignInResponse,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
} from '../../services/authTypes';

/**
 * Shared query key for the authenticated user. Phase 04 will add a
 * `useCurrentUserQuery` that reads this key; here we expose it so
 * mutations can invalidate after a session change.
 */
export const CURRENT_USER_QUERY_KEY = ['auth', 'currentUser'] as const;

const invalidateCurrentUser = (
  queryClient: ReturnType<typeof useQueryClient>,
) => queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });

// ---------------------------------------------------------------------------
// Convenience type alias — every mutation in this file shares the same error
// channel (`AuthErrorEnvelope`), so we factor that out.
// ---------------------------------------------------------------------------

export type AuthMutation<TData, TVariables> = UseMutationResult<
  TData,
  AuthErrorEnvelope,
  TVariables
>;

// ---------------------------------------------------------------------------
// Register / Login
// ---------------------------------------------------------------------------

export const useRegisterMutation = (): AuthMutation<
  RegisterResponse,
  RegisterRequest
> =>
  useMutation<RegisterResponse, AuthErrorEnvelope, RegisterRequest>({
    mutationFn: (req) => registerAccount(req),
  });

export const useLoginMutation = (): AuthMutation<
  LoginResponse,
  LoginRequest
> => {
  const queryClient = useQueryClient();
  return useMutation<LoginResponse, AuthErrorEnvelope, LoginRequest>({
    mutationFn: (req) => loginWithPassword(req),
    onSuccess: () => invalidateCurrentUser(queryClient),
  });
};

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

export const useVerifyEmailMutation = (): AuthMutation<
  VerifyEmailResponse,
  VerifyEmailRequest
> => {
  const queryClient = useQueryClient();
  return useMutation<VerifyEmailResponse, AuthErrorEnvelope, VerifyEmailRequest>({
    mutationFn: (req) => verifyEmail(req),
    onSuccess: () => invalidateCurrentUser(queryClient),
  });
};

export const useResendVerificationMutation = (): AuthMutation<
  ResendVerificationResponse,
  ResendVerificationRequest
> =>
  useMutation<
    ResendVerificationResponse,
    AuthErrorEnvelope,
    ResendVerificationRequest
  >({
    mutationFn: (req) => resendVerification(req),
  });

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

export const useForgotPasswordMutation = (): AuthMutation<
  ForgotPasswordResponse,
  ForgotPasswordRequest
> =>
  useMutation<ForgotPasswordResponse, AuthErrorEnvelope, ForgotPasswordRequest>({
    mutationFn: (req) => forgotPassword(req),
  });

export const useResetPasswordMutation = (): AuthMutation<
  ResetPasswordResponse,
  ResetPasswordRequest
> =>
  useMutation<ResetPasswordResponse, AuthErrorEnvelope, ResetPasswordRequest>({
    mutationFn: (req) => resetPassword(req),
  });

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

/**
 * Manual refresh trigger. Used sparingly — the apiClient interceptor handles
 * 401-driven refresh automatically (see commit 4: refresh interceptor).
 */
export const useRefreshTokensMutation = (): AuthMutation<
  RefreshTokenResponse,
  RefreshTokenRequest
> =>
  useMutation<RefreshTokenResponse, AuthErrorEnvelope, RefreshTokenRequest>({
    mutationFn: (req) => refreshTokens(req),
  });

export const useLogoutMutation = (): AuthMutation<
  LogoutResponse,
  LogoutRequest | void
> => {
  const queryClient = useQueryClient();
  return useMutation<LogoutResponse, AuthErrorEnvelope, LogoutRequest | void>({
    mutationFn: (req) => logoutCall(req ?? {}),
    onSuccess: () => {
      // Wipe ALL cached server state on sign-out — not just currentUser.
      queryClient.clear();
    },
  });
};

// ---------------------------------------------------------------------------
// OAuth
// ---------------------------------------------------------------------------

export const useGoogleSignInMutation = (): AuthMutation<
  GoogleSignInResponse,
  GoogleSignInRequest
> => {
  const queryClient = useQueryClient();
  return useMutation<GoogleSignInResponse, AuthErrorEnvelope, GoogleSignInRequest>({
    mutationFn: (req) => signInWithGoogle(req),
    onSuccess: () => invalidateCurrentUser(queryClient),
  });
};

export const useAppleSignInMutation = (): AuthMutation<
  AppleSignInResponse,
  AppleSignInRequest
> => {
  const queryClient = useQueryClient();
  return useMutation<AppleSignInResponse, AuthErrorEnvelope, AppleSignInRequest>({
    mutationFn: (req) => signInWithApple(req),
    onSuccess: () => invalidateCurrentUser(queryClient),
  });
};

// ---------------------------------------------------------------------------
// Email precheck
//
// Modeled as a MUTATION rather than a query because:
//   1. It's invoked imperatively when the user finishes typing an email in
//      screen 7 ("this email is linked to Google" notice) — we don't want
//      automatic re-fetching on focus or stale-time semantics.
//   2. Anonymous callers always receive `"password"` regardless of real
//      linkage — caching the result by email is misleading.
// If a future caller needs cache semantics, switch to useQuery there
// without changing this hook.
// ---------------------------------------------------------------------------

export const useEmailPrecheckMutation = (): AuthMutation<
  EmailPrecheckResponse,
  EmailPrecheckRequest
> =>
  useMutation<EmailPrecheckResponse, AuthErrorEnvelope, EmailPrecheckRequest>({
    mutationFn: (req) => emailPrecheck(req),
  });
