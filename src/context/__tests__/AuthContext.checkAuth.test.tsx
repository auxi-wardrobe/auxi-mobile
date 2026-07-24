/* eslint-env jest */
/**
 * AuthContext.checkAuth() — cold-start session-restore safety.
 *
 * Validates the fix for the "logged out ~every hour" bug at the context layer:
 *   - A transient failure (offline / timeout / 5xx) while restoring the session
 *     must NOT call authService.logout() — the stored tokens are preserved so
 *     the user is restored on the next retry.
 *   - A definitive auth rejection (the apiClient interceptor already wiped the
 *     tokens) is reflected as a signed-out state (user === null), still WITHOUT
 *     calling authService.logout() (the interceptor owns the clear).
 *   - The happy path restores the user.
 *
 * All service dependencies are mocked so the provider mounts without native /
 * network side effects.
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, useAuth } from '../AuthContext';
import { authService } from '../../services/auth';
import { toast } from '../../components/design-system/lib';
import { wasAuthDeepLinkRecentlySeen } from '../../services/deepLinkHandler';

jest.mock('../../services/auth', () => ({
  authService: {
    isAuthenticated: jest.fn(),
    getCurrentUser: jest.fn(),
    updateUser: jest.fn(),
    resetPreferences: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
    login: jest.fn(),
    register: jest.fn(),
  },
}));

jest.mock('../../services/tokenStorage', () => ({
  migrateLegacyKeychain: jest.fn().mockResolvedValue(undefined),
}));

// registerSessionExpiredListener captures the callback so tests can invoke it
// directly to simulate apiClient firing a session-expired event.
let capturedSessionExpiredListener: (() => void) | null = null;
jest.mock('../../services/apiClient', () => ({
  registerSessionExpiredListener: jest.fn((cb: () => void) => {
    capturedSessionExpiredListener = cb;
    return () => {};
  }),
}));

jest.mock('../../services/deepLinkHandler', () => ({
  wasAuthDeepLinkRecentlySeen: jest.fn(() => false),
}));

jest.mock('../../services/analytics', () => ({
  identifyUser: jest.fn(),
  resetAnalytics: jest.fn(),
  track: jest.fn(),
}));

jest.mock('../../services/reviewOverrides', () => ({
  getForcedFirstLogin: jest.fn(() => false),
}));

jest.mock('../../services/v05Api', () => ({
  resetV05Session: jest.fn(),
}));

jest.mock('../../services/recommendationMemory', () => ({
  setRecommendationMemoryUser: jest.fn(),
}));

// AuthContext eagerly imports the RevenueCat service, whose `react-native-purchases`
// dependency chain (`@revenuecat/purchases-js-hybrid-mappings`) isn't covered by
// jest.config.js's transformIgnorePatterns whitelist and fails to parse under
// babel-jest. Mock the service boundary (matches the pattern for every other
// AuthContext dependency in this file) so the suite can mount the real provider.
jest.mock('../../services/revenueCat', () => ({
  configureRevenueCat: jest.fn(),
  logInRevenueCat: jest.fn(),
  logOutRevenueCat: jest.fn(),
}));

const mockedAuth = authService as jest.Mocked<typeof authService>;
const mockedToastShow = (toast as unknown as { show: jest.Mock }).show;
const mockedWasAuthDeepLinkRecentlySeen =
  wasAuthDeepLinkRecentlySeen as jest.Mock;

type Ctx = ReturnType<typeof useAuth>;
let captured: Ctx;

const Probe = () => {
  captured = useAuth();
  return null;
};

const flush = () => new Promise<void>(resolve => setImmediate(resolve));

const mountAndSettle = async () => {
  await act(async () => {
    TestRenderer.create(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    // Let checkAuth()'s awaited chain (migrate → isAuthenticated → getCurrentUser)
    // and the resulting state updates flush.
    await flush();
    await flush();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedAuth.logout.mockResolvedValue(undefined);
  capturedSessionExpiredListener = null;
  mockedWasAuthDeepLinkRecentlySeen.mockReturnValue(false);
});

describe('AuthContext.checkAuth cold start', () => {
  it('restores the user on the happy path', async () => {
    mockedAuth.isAuthenticated.mockResolvedValue(true);
    mockedAuth.getCurrentUser.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
    } as any);

    await mountAndSettle();

    expect(captured.user).toMatchObject({ id: 'user-1' });
    expect(captured.isLoading).toBe(false);
    expect(mockedAuth.logout).not.toHaveBeenCalled();
  });

  it('does NOT log out on a transient restore failure (tokens preserved)', async () => {
    // Token exists at start AND still exists after the failed /me call →
    // transient (the interceptor left tokens intact).
    mockedAuth.isAuthenticated.mockResolvedValue(true);
    const networkErr: any = new Error('Network Error');
    networkErr.isAxiosError = true;
    mockedAuth.getCurrentUser.mockRejectedValue(networkErr);

    await mountAndSettle();

    // The bug was here: the old code called authService.logout() (clearTokens)
    // on ANY error, nuking a still-valid session.
    expect(mockedAuth.logout).not.toHaveBeenCalled();
    expect(captured.isLoading).toBe(false);
  });

  it('reflects signed-out state on a definitive expiry without calling logout', async () => {
    // First isAuthenticated() (the gate) → true; getCurrentUser rejects after
    // the interceptor wiped the tokens; the post-failure probe → false.
    mockedAuth.isAuthenticated
      .mockResolvedValueOnce(true) // gate
      .mockResolvedValueOnce(false); // post-failure probe (tokens cleared)
    const expiredErr: any = new Error('Unauthorized');
    expiredErr.isAxiosError = true;
    expiredErr.response = { status: 401 };
    mockedAuth.getCurrentUser.mockRejectedValue(expiredErr);

    await mountAndSettle();

    expect(captured.user).toBeNull();
    expect(captured.isLoading).toBe(false);
    // The apiClient interceptor owns the token clear; checkAuth must not also
    // call logout().
    expect(mockedAuth.logout).not.toHaveBeenCalled();
  });

  it('sets user null when there is no stored session', async () => {
    mockedAuth.isAuthenticated.mockResolvedValue(false);

    await mountAndSettle();

    expect(captured.user).toBeNull();
    expect(mockedAuth.getCurrentUser).not.toHaveBeenCalled();
    expect(mockedAuth.logout).not.toHaveBeenCalled();
  });
});

describe('AuthContext session-expired listener — deep-link toast suppression', () => {
  // A stale/revoked token can fail-refresh on the SAME cold boot that a
  // reset-password/verify-email deep link lands the user on its screen
  // (AU-428). The listener must still clear the session in both cases —
  // only the toast is conditional on the deep-link marker.
  it('suppresses the toast but still clears the session when a reset-password/verify-email link was just seen', async () => {
    mockedAuth.isAuthenticated.mockResolvedValue(true);
    mockedAuth.getCurrentUser.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
    } as any);
    mockedWasAuthDeepLinkRecentlySeen.mockReturnValue(true);

    await mountAndSettle();
    expect(captured.user).toMatchObject({ id: 'user-1' });

    await act(async () => {
      capturedSessionExpiredListener?.();
      await flush();
    });

    expect(captured.user).toBeNull();
    expect(captured.pendingVerifyEmail).toBeNull();
    expect(mockedToastShow).not.toHaveBeenCalled();
  });

  it('still shows the toast when no reset-password/verify-email link was recently seen (regression)', async () => {
    mockedAuth.isAuthenticated.mockResolvedValue(true);
    mockedAuth.getCurrentUser.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
    } as any);
    mockedWasAuthDeepLinkRecentlySeen.mockReturnValue(false);

    await mountAndSettle();
    expect(captured.user).toMatchObject({ id: 'user-1' });

    await act(async () => {
      capturedSessionExpiredListener?.();
      await flush();
    });

    expect(captured.user).toBeNull();
    expect(captured.pendingVerifyEmail).toBeNull();
    expect(mockedToastShow).toHaveBeenCalledWith({
      type: 'error',
      text1: 'Session expired',
      text2: 'Please sign in again.',
    });
  });
});
