import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { ROOT_URL, BASE_URL } from '../config/env';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './tokenStorage';

export { ROOT_URL, BASE_URL };

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Request interceptor — inject Bearer token from Keychain.
// ---------------------------------------------------------------------------

apiClient.interceptors.request.use(async (config: any) => {
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

// ---------------------------------------------------------------------------
// 401 response interceptor — refresh access token once, replay original.
//
// Contract (per phase-03-service-layer.md §7 step 8):
//   1. On 401 from a non-refresh route AND we hold a refresh token →
//      call /auth/refresh.
//   2. Use a singleton in-flight promise so multiple concurrent 401s
//      do not dogpile the refresh endpoint.
//   3. On refresh success → persist new tokens (via setTokens) and replay
//      the original request once with the fresh Authorization header.
//   4. On refresh failure → clearTokens(), fire the onSessionExpired
//      listener (see registerSessionExpiredListener) so AuthContext can
//      reset to the unauthenticated state. Reject with the original 401.
//   5. Each original request retries AT MOST ONCE — we set a marker on
//      the config to guard against infinite loops.
//
// Note: we deliberately avoid recursive use of `apiClient.post` for the
// refresh call. A bare axios POST against `${BASE_URL}/auth/refresh` keeps
// the refresh flow free of the request interceptor's Bearer injection
// (refresh is body-authed) and prevents accidental re-entrance into THIS
// 401 handler.
// ---------------------------------------------------------------------------

interface RetryableRequestConfig extends AxiosRequestConfig {
  _au242_retried?: boolean;
}

interface RefreshAxiosResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in?: number;
  token_type?: string;
}

let inflightRefresh: Promise<string | null> | null = null;

const performRefresh = async (): Promise<string | null> => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post<RefreshAxiosResponse>(
      `${BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { 'Content-Type': 'application/json' } },
    );

    const computeExpiresAt = (expiresIn?: number): number | null => {
      if (!expiresIn || Number.isNaN(expiresIn)) return null;
      return Math.floor(Date.now() / 1000) + expiresIn;
    };

    await setTokens({
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      access_token_expires_at: computeExpiresAt(response.data.expires_in),
      refresh_token_expires_at: computeExpiresAt(
        response.data.refresh_expires_in,
      ),
    });
    return response.data.access_token;
  } catch (refreshError) {
    console.warn('[apiClient] refresh failed', refreshError);
    return null;
  }
};

/**
 * Returns a singleton promise for the in-flight refresh. Concurrent 401s
 * all await the same promise, so we make at most one /auth/refresh call
 * per refresh window.
 */
const getOrStartRefresh = (): Promise<string | null> => {
  if (!inflightRefresh) {
    inflightRefresh = performRefresh().finally(() => {
      inflightRefresh = null;
    });
  }
  return inflightRefresh;
};

// ---------------------------------------------------------------------------
// Session-expired listener registry. AuthContext registers a callback in
// phase 04 to reset its in-memory state when the refresh flow fails. We
// keep this as a module-level array so the interceptor can fire it
// without importing AuthContext (which would create a require cycle).
// ---------------------------------------------------------------------------

type SessionExpiredListener = () => void;
const sessionExpiredListeners: SessionExpiredListener[] = [];

export const registerSessionExpiredListener = (
  listener: SessionExpiredListener,
): (() => void) => {
  sessionExpiredListeners.push(listener);
  return () => {
    const idx = sessionExpiredListeners.indexOf(listener);
    if (idx >= 0) sessionExpiredListeners.splice(idx, 1);
  };
};

const fireSessionExpired = () => {
  sessionExpiredListeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.warn('[apiClient] session-expired listener threw', err);
    }
  });
};

const isRefreshEndpoint = (url: string | undefined): boolean => {
  if (!url) return false;
  return url.includes('/auth/refresh');
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalConfig = error.config as RetryableRequestConfig | undefined;

    // Guard rails:
    //   - Only handle 401s.
    //   - Don't retry the refresh endpoint itself (that would loop).
    //   - Don't retry twice (the _au242_retried marker).
    if (
      status !== 401 ||
      !originalConfig ||
      originalConfig._au242_retried ||
      isRefreshEndpoint(originalConfig.url)
    ) {
      return Promise.reject(error);
    }

    const newAccessToken = await getOrStartRefresh();
    if (!newAccessToken) {
      await clearTokens();
      fireSessionExpired();
      return Promise.reject(error);
    }

    // Replay original request with fresh Authorization header.
    originalConfig._au242_retried = true;
    originalConfig.headers = {
      ...(originalConfig.headers ?? {}),
      Authorization: `Bearer ${newAccessToken}`,
    };

    return apiClient.request(originalConfig);
  },
);
