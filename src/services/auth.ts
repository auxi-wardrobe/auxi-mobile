import axios, { AxiosError } from 'axios';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ResetPreferencesResponse,
  User,
} from '../types/auth';
import { BASE_URL } from '../config/env';
import { apiClient } from './apiClient';
import { clearTokens, getAccessToken, setTokens } from './tokenStorage';
import type {
  AppleSignInRequest,
  AppleSignInResponse,
  AuthErrorCode,
  AuthErrorEnvelope,
  EmailPrecheckRequest,
  EmailPrecheckResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  GoogleSignInRequest,
  GoogleSignInResponse,
  LoginResponse,
  LogoutRequest,
  LogoutResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  TokenResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
} from './authTypes';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add token to requests
api.interceptors.request.use(async (config: any) => {
  try {
    const accessToken = await getAccessToken();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
  } catch (error) {
    console.error('Error retrieving token', error);
  }
  return config;
});

const computeExpiresAt = (expiresIn?: number): number | null => {
  if (!expiresIn || Number.isNaN(expiresIn)) return null;
  return Math.floor(Date.now() / 1000) + expiresIn;
};

// ---------------------------------------------------------------------------
// Known AuthErrorCode values — used to validate strings coming off the wire.
// ---------------------------------------------------------------------------

const KNOWN_AUTH_ERROR_CODES: ReadonlySet<AuthErrorCode> =
  new Set<AuthErrorCode>([
    'EMAIL_NOT_VERIFIED',
    'OAUTH_ACCOUNT',
    'INVALID_CREDENTIALS',
    'TOKEN_INVALID',
    'TOKEN_EXPIRED',
    'TOKEN_CONSUMED',
    'EMAIL_ALREADY_EXISTS',
    'WEAK_PASSWORD',
    'OAUTH_VERIFICATION_FAILED',
    'OAUTH_EMAIL_UNVERIFIED',
    'EMAIL_LINKED_TO_PASSWORD',
    'EMAIL_LINKED_TO_OTHER_PROVIDER',
    'APPLE_EMAIL_MISSING',
    'RATE_LIMITED',
    'VALIDATION_ERROR',
    'NETWORK_ERROR',
    'UNKNOWN',
  ]);

const asAuthErrorCode = (raw: unknown): AuthErrorCode => {
  if (
    typeof raw === 'string' &&
    KNOWN_AUTH_ERROR_CODES.has(raw as AuthErrorCode)
  ) {
    return raw as AuthErrorCode;
  }
  return 'UNKNOWN';
};

const safeRecord = (raw: unknown): Record<string, unknown> | undefined => {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return undefined;
};

/**
 * Map an axios error to a typed `AuthErrorEnvelope`. Reads:
 *   1. `error.response.data.code` (lifted by app.py exception handler), or
 *   2. `error.response.data.detail.code` (nested form), or
 *   3. HTTP status only (429 → RATE_LIMITED, network → NETWORK_ERROR), or
 *   4. Falls back to UNKNOWN.
 *
 * Used by every public function in this file so screens / mutations can
 * narrow on `code` without re-implementing the parse each time.
 */
export const mapAuthError = (error: unknown): AuthErrorEnvelope => {
  // Network / no response
  if (axios.isAxiosError(error)) {
    const axErr = error as AxiosError;
    const status = axErr.response?.status ?? 0;

    if (!axErr.response) {
      return {
        code: 'NETWORK_ERROR',
        message: axErr.message || 'Network request failed',
        status: 0,
      };
    }

    const data = safeRecord(axErr.response.data) ?? {};
    const detail = safeRecord(data.detail);
    const topCode = data.code;
    const detailCode = detail?.code;
    const code = asAuthErrorCode(
      topCode ?? detailCode ?? (status === 429 ? 'RATE_LIMITED' : null),
    );

    const messageRaw =
      (typeof data.message === 'string' && data.message) ||
      (detail && typeof detail.message === 'string' && detail.message) ||
      axErr.message ||
      'Request failed';

    const requestId =
      typeof data.request_id === 'string'
        ? data.request_id
        : typeof detail?.request_id === 'string'
        ? (detail.request_id as string)
        : undefined;

    // Coerce 400 validation envelope into VALIDATION_ERROR if no code is set
    const finalCode: AuthErrorCode =
      code === 'UNKNOWN' && status === 400 && data.error === 'Validation Error'
        ? 'VALIDATION_ERROR'
        : code === 'UNKNOWN' && status === 429
        ? 'RATE_LIMITED'
        : code;

    return {
      code: finalCode,
      message: messageRaw,
      status,
      detail: detail ?? data,
      request_id: requestId,
    };
  }

  return {
    code: 'UNKNOWN',
    message: error instanceof Error ? error.message : 'Unknown error',
    status: 0,
  };
};

/**
 * Persist tokens from a successful auth response. Centralised so we don't
 * forget to write refresh / expiry on the OAuth paths.
 */
const persistTokens = async (
  data: TokenResponse,
  emailHint?: string | null,
): Promise<void> => {
  await setTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    access_token_expires_at: computeExpiresAt(data.expires_in),
    refresh_token_expires_at: computeExpiresAt(data.refresh_expires_in),
    user_email: emailHint ?? data.user?.email ?? null,
  });
};

export const authService = {
  // -------------------------------------------------------------------------
  // Existing surface (kept for back-compat with current screens / context)
  // -------------------------------------------------------------------------

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post<LoginResponse>('/login', data);
      await persistTokens(response.data, data.email);
      return response.data as AuthResponse;
    } catch (error) {
      // Preserve original throw shape for legacy callers; mutation hooks
      // re-route through mapAuthError.
      console.error('Login error', error);
      throw error;
    }
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post('/register', data);
      return response.data;
    } catch (error) {
      console.error('Register error', error);
      throw error;
    }
  },

  updateUser: async (data: Partial<User>): Promise<User> => {
    try {
      // Use apiClient (not the bare `api`) so an expired access token triggers
      // the silent 401 → refresh → replay path instead of bubbling a 401.
      const response = await apiClient.put('/me', data);
      return response.data;
    } catch (error) {
      console.error('Update user error', error);
      throw error;
    }
  },

  resetPreferences: async (): Promise<User> => {
    try {
      // Use apiClient so a 60-min-expired token is silently refreshed.
      const response = await apiClient.post<ResetPreferencesResponse>(
        '/me/reset-preferences',
      );
      return response.data.user;
    } catch (error) {
      console.error('Reset preferences error', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      // Optional: Call API to revoke refresh token
      // await api.post('/logout', { refresh_token: ... });
      await clearTokens();
    } catch (error) {
      console.error('Logout error', error);
      throw error;
    }
  },

  getCurrentUser: async (): Promise<User> => {
    try {
      // Use apiClient so the cold-start /me call gets the 401 → refresh →
      // replay interceptor. The bare `api` instance has no refresh
      // interceptor, which caused users to be logged out ~hourly once the
      // 60-min access token expired.
      const response = await apiClient.get('/me');
      return response.data;
    } catch (error) {
      // If 401, token might be expired
      throw error;
    }
  },

  isAuthenticated: async (): Promise<boolean> => {
    const token = await getAccessToken();
    return !!token;
  },
};

// ---------------------------------------------------------------------------
// AU-242 endpoints (typed). These functions throw `AuthErrorEnvelope`-shaped
// errors via `mapAuthError`; mutation hooks consume them directly.
//
// Naming: each function name matches the route's verb; request DTO is the
// single positional arg, response is the typed return.
// ---------------------------------------------------------------------------

/**
 * POST /api/register — create a password-auth account. Does NOT return
 * tokens. The response's `verification_required` tells the caller what to do
 * next: `true` (real/email mode) → drive the user to the verify-email screen;
 * `false` / `auto_verified: true` (dev "mock email" mode) → the account is
 * already verified, so the caller should complete sign-in directly.
 *
 * Errors: EMAIL_ALREADY_EXISTS (409), WEAK_PASSWORD / VALIDATION_ERROR (400).
 */
export const registerAccount = async (
  req: RegisterRequest,
): Promise<RegisterResponse> => {
  try {
    const response = await api.post<RegisterResponse>('/register', req);
    return response.data;
  } catch (error) {
    throw mapAuthError(error);
  }
};

/**
 * POST /api/login — password sign-in. Persists tokens on success.
 *
 * Errors: INVALID_CREDENTIALS (401), EMAIL_NOT_VERIFIED (403, detail.email),
 *         OAUTH_ACCOUNT (403, detail.provider), RATE_LIMITED (429).
 */
export const loginWithPassword = async (
  req: LoginRequest,
): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginResponse>('/login', req);
    await persistTokens(response.data, req.email);
    return response.data;
  } catch (error) {
    throw mapAuthError(error);
  }
};

/**
 * POST /api/auth/verify-email — consume a single-use token to verify the
 * user's email address. Idempotent re-consumption returns TOKEN_CONSUMED.
 *
 * Errors: TOKEN_INVALID (404), TOKEN_EXPIRED (410), TOKEN_CONSUMED (410).
 */
export const verifyEmail = async (
  req: VerifyEmailRequest,
): Promise<VerifyEmailResponse> => {
  try {
    const response = await api.post<VerifyEmailResponse>(
      '/auth/verify-email',
      req,
    );
    return response.data;
  } catch (error) {
    throw mapAuthError(error);
  }
};

/**
 * POST /api/auth/resend-verification — request a fresh verify email.
 * Enumeration-safe: backend ALWAYS returns 200 regardless of email validity.
 *
 * Errors: RATE_LIMITED (429).
 */
export const resendVerification = async (
  req: ResendVerificationRequest,
): Promise<ResendVerificationResponse> => {
  try {
    const response = await api.post<ResendVerificationResponse>(
      '/auth/resend-verification',
      req,
    );
    return response.data;
  } catch (error) {
    throw mapAuthError(error);
  }
};

/**
 * POST /api/auth/forgot-password — request a password-reset email.
 * Enumeration-safe: always 200.
 *
 * Errors: RATE_LIMITED (429).
 */
export const forgotPassword = async (
  req: ForgotPasswordRequest,
): Promise<ForgotPasswordResponse> => {
  try {
    const response = await api.post<ForgotPasswordResponse>(
      '/auth/forgot-password',
      req,
    );
    return response.data;
  } catch (error) {
    throw mapAuthError(error);
  }
};

/**
 * POST /api/auth/reset-password — consume a token and set a new password.
 *
 * Errors: VALIDATION_ERROR (400), TOKEN_INVALID (404), TOKEN_EXPIRED (410),
 *         TOKEN_CONSUMED (410).
 */
export const resetPassword = async (
  req: ResetPasswordRequest,
): Promise<ResetPasswordResponse> => {
  try {
    const response = await api.post<ResetPasswordResponse>(
      '/auth/reset-password',
      req,
    );
    return response.data;
  } catch (error) {
    throw mapAuthError(error);
  }
};

/**
 * POST /api/auth/refresh — rotate refresh token + issue fresh access token.
 * Persists the rotated bundle on success.
 *
 * Errors: 401 Unauthorized (no `code`, falls through to UNKNOWN/401).
 */
export const refreshTokens = async (
  req: RefreshTokenRequest,
): Promise<RefreshTokenResponse> => {
  try {
    const response = await api.post<RefreshTokenResponse>('/auth/refresh', req);
    await persistTokens(response.data);
    return response.data;
  } catch (error) {
    throw mapAuthError(error);
  }
};

/**
 * POST /api/auth/logout — revoke refresh token(s) on the server, then clear
 * local Keychain entries. If `refresh_token` is omitted, ALL refresh tokens
 * for the authenticated user are revoked.
 */
export const logout = async (
  req: LogoutRequest = {},
): Promise<LogoutResponse> => {
  try {
    const response = await api.post<LogoutResponse>('/auth/logout', req);
    await clearTokens();
    return response.data;
  } catch (error) {
    // Even if the server rejects (e.g. 401 from expired access token), we
    // still want to wipe local state so the user can re-auth cleanly.
    await clearTokens();
    throw mapAuthError(error);
  }
};

/**
 * POST /api/auth/google — exchange a Google id_token for an Auxi session.
 * Persists tokens on success.
 *
 * Errors: OAUTH_VERIFICATION_FAILED (401), OAUTH_EMAIL_UNVERIFIED (403),
 *         EMAIL_LINKED_TO_PASSWORD (409), EMAIL_LINKED_TO_OTHER_PROVIDER (409),
 *         RATE_LIMITED (429).
 */
export const signInWithGoogle = async (
  req: GoogleSignInRequest,
): Promise<GoogleSignInResponse> => {
  try {
    const response = await api.post<GoogleSignInResponse>('/auth/google', req);
    await persistTokens(response.data);
    return response.data;
  } catch (error) {
    throw mapAuthError(error);
  }
};

/**
 * POST /api/auth/apple — exchange an Apple identity_token for an Auxi
 * session. `name` only supplied on first authorisation.
 *
 * Errors: OAUTH_VERIFICATION_FAILED (401), APPLE_EMAIL_MISSING (400),
 *         EMAIL_LINKED_TO_PASSWORD (409), EMAIL_LINKED_TO_OTHER_PROVIDER (409),
 *         RATE_LIMITED (429).
 */
export const signInWithApple = async (
  req: AppleSignInRequest,
): Promise<AppleSignInResponse> => {
  try {
    const response = await api.post<AppleSignInResponse>('/auth/apple', req);
    await persistTokens(response.data);
    return response.data;
  } catch (error) {
    throw mapAuthError(error);
  }
};

/**
 * POST /api/auth/email-precheck — look up which provider an email is linked
 * to. Anonymous legacy/signup callers receive `"password"` (enumeration
 * safety); anonymous sign-in callers may pass `intent: "signin"` to see
 * `"none"` and avoid a dead-end password screen for unknown email.
 *
 * Errors: RATE_LIMITED (429).
 */
export const emailPrecheck = async (
  req: EmailPrecheckRequest,
): Promise<EmailPrecheckResponse> => {
  try {
    const response = await api.post<EmailPrecheckResponse>(
      '/auth/email-precheck',
      req,
    );
    return response.data;
  } catch (error) {
    throw mapAuthError(error);
  }
};
