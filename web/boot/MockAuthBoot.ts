import { setTokens } from '../../src/services/tokenStorage';

// Seed a far-future mock token so AuthContext boots authenticated and the app
// lands straight on Home (loads /me fixture via MSW). Stub mode: no real login.
export const seedMockAuth = async (): Promise<void> => {
  const farFuture = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
  await setTokens({
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    access_token_expires_at: farFuture,
    refresh_token_expires_at: farFuture,
    user_email: 'designer@auxi.test',
  });
};
