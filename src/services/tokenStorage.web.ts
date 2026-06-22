import type { StoredTokenData } from '../types/auth';

const KEY = (f: string) => `AUXI_AUTH/${f}`;

export interface SetTokensInput {
  access_token: string;
  refresh_token?: string | null;
  access_token_expires_at?: number | null;
  refresh_token_expires_at?: number | null;
  user_email?: string | null;
}

const write = (f: string, v: string | null | undefined) => {
  if (v === undefined) return;
  if (v === null) localStorage.removeItem(KEY(f));
  else localStorage.setItem(KEY(f), v);
};
const read = (f: string): string | null => localStorage.getItem(KEY(f));

export const setTokens = async (input: SetTokensInput): Promise<void> => {
  write('access_token', input.access_token);
  write('refresh_token', input.refresh_token);
  if (input.access_token_expires_at != null)
    write('access_token_expires_at', String(input.access_token_expires_at));
  if (input.refresh_token_expires_at != null)
    write('refresh_token_expires_at', String(input.refresh_token_expires_at));
  write('user_email', input.user_email);
};

export const getAccessToken = async (): Promise<string | null> => read('access_token');
export const getRefreshToken = async (): Promise<string | null> => read('refresh_token');
export const getStoredEmail = async (): Promise<string | null> => read('user_email');

export const getStoredTokens = async (): Promise<StoredTokenData | null> => {
  const access_token = read('access_token');
  if (!access_token) return null;
  return {
    access_token,
    refresh_token: read('refresh_token') ?? '',
    access_token_expires_at: Number(read('access_token_expires_at') ?? 0),
    refresh_token_expires_at: Number(read('refresh_token_expires_at') ?? 0),
    user_email: read('user_email') ?? '',
  };
};

export const clearTokens = async (): Promise<void> => {
  ['access_token', 'refresh_token', 'access_token_expires_at',
   'refresh_token_expires_at', 'user_email'].forEach(f => localStorage.removeItem(KEY(f)));
};

export const migrateLegacyKeychain = async (): Promise<void> => {};
