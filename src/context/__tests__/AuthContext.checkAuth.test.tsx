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

jest.mock('../../services/apiClient', () => ({
  registerSessionExpiredListener: jest.fn(() => () => {}),
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

const mockedAuth = authService as jest.Mocked<typeof authService>;

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
