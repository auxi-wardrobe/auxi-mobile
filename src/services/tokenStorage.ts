/**
 * Secure token storage layer for AU-242 UAC auth.
 *
 * Phase 01 (foundation): replace the legacy single-entry
 * `Keychain.setGenericPassword('currentUser', access_token)` with a multi-key
 * layout so we can persist refresh tokens, expiry timestamps, and the user's
 * email across cold starts.
 *
 * Storage shape (each field is its own Keychain entry, keyed by `server`):
 *   - AUXI_AUTH/access_token
 *   - AUXI_AUTH/refresh_token
 *   - AUXI_AUTH/access_token_expires_at   (Unix seconds, as string)
 *   - AUXI_AUTH/refresh_token_expires_at  (Unix seconds, as string)
 *   - AUXI_AUTH/user_email
 *
 * `Keychain.setInternetCredentials(server, username, password)` is used per
 * field; `username` is the field name (cosmetic), `password` carries the value.
 *
 * Public API stays minimal: callers either read the access token (most
 * services) or read the full bundle (AuthContext bootstrap). Migration from
 * the legacy single-key layout is idempotent and runs at app start.
 */
import * as Keychain from 'react-native-keychain';
import type { StoredTokenData } from '../types/auth';

const SERVICE_PREFIX = 'AUXI_AUTH';
const LEGACY_USERNAME = 'currentUser';

type FieldKey =
  | 'access_token'
  | 'refresh_token'
  | 'access_token_expires_at'
  | 'refresh_token_expires_at'
  | 'user_email';

const server = (field: FieldKey): string => `${SERVICE_PREFIX}/${field}`;

const writeField = async (field: FieldKey, value: string): Promise<void> => {
  await Keychain.setInternetCredentials(server(field), field, value);
};

const readField = async (field: FieldKey): Promise<string | null> => {
  try {
    const credentials = await Keychain.getInternetCredentials(server(field));
    if (credentials && typeof credentials !== 'boolean') {
      return credentials.password;
    }
    return null;
  } catch (error) {
    console.warn(`[tokenStorage] read ${field} failed`, error);
    return null;
  }
};

const resetField = async (field: FieldKey): Promise<void> => {
  try {
    await Keychain.resetInternetCredentials({ server: server(field) });
  } catch (error) {
    console.warn(`[tokenStorage] reset ${field} failed`, error);
  }
};

export interface SetTokensInput {
  access_token: string;
  refresh_token?: string | null;
  access_token_expires_at?: number | null;
  refresh_token_expires_at?: number | null;
  user_email?: string | null;
}

/**
 * Persist an access token plus any companion fields. Existing fields are
 * left intact when an optional field is omitted (use clearTokens to wipe).
 */
export const setTokens = async (input: SetTokensInput): Promise<void> => {
  await writeField('access_token', input.access_token);

  if (input.refresh_token !== undefined) {
    if (input.refresh_token) {
      await writeField('refresh_token', input.refresh_token);
    } else {
      await resetField('refresh_token');
    }
  }

  if (input.access_token_expires_at !== undefined) {
    if (input.access_token_expires_at !== null) {
      await writeField(
        'access_token_expires_at',
        String(input.access_token_expires_at),
      );
    } else {
      await resetField('access_token_expires_at');
    }
  }

  if (input.refresh_token_expires_at !== undefined) {
    if (input.refresh_token_expires_at !== null) {
      await writeField(
        'refresh_token_expires_at',
        String(input.refresh_token_expires_at),
      );
    } else {
      await resetField('refresh_token_expires_at');
    }
  }

  if (input.user_email !== undefined) {
    if (input.user_email) {
      await writeField('user_email', input.user_email);
    } else {
      await resetField('user_email');
    }
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  const token = await readField('access_token');
  if (token) return token;
  // Fallback: legacy single-entry layout. Read but don't auto-migrate here
  // (migration is explicit, see migrateLegacyKeychain). This guards
  // interceptors that may run before bootstrap finishes.
  try {
    const legacy = await Keychain.getGenericPassword();
    if (legacy && legacy.username === LEGACY_USERNAME) {
      return legacy.password;
    }
  } catch (error) {
    console.warn('[tokenStorage] legacy fallback failed', error);
  }
  return null;
};

export const getRefreshToken = async (): Promise<string | null> => {
  return readField('refresh_token');
};

export const getStoredEmail = async (): Promise<string | null> => {
  return readField('user_email');
};

export const getStoredTokens = async (): Promise<StoredTokenData | null> => {
  const [access, refresh, accessExp, refreshExp, email] = await Promise.all([
    readField('access_token'),
    readField('refresh_token'),
    readField('access_token_expires_at'),
    readField('refresh_token_expires_at'),
    readField('user_email'),
  ]);
  if (!access) return null;
  return {
    access_token: access,
    refresh_token: refresh ?? '',
    access_token_expires_at: accessExp ? Number(accessExp) : 0,
    refresh_token_expires_at: refreshExp ? Number(refreshExp) : 0,
    user_email: email ?? '',
  };
};

export const clearTokens = async (): Promise<void> => {
  await Promise.all([
    resetField('access_token'),
    resetField('refresh_token'),
    resetField('access_token_expires_at'),
    resetField('refresh_token_expires_at'),
    resetField('user_email'),
  ]);
  // Also nuke any leftover legacy entry.
  try {
    await Keychain.resetGenericPassword();
  } catch (error) {
    console.warn('[tokenStorage] reset legacy failed', error);
  }
};

/**
 * One-time upgrade path for users coming from the pre-AU-242 build that
 * stored only an access token under `Keychain.setGenericPassword('currentUser', token)`.
 *
 * Strategy: write-through first (new keys), then delete the legacy entry.
 * Idempotent — safe to call on every cold start.
 *
 * Failure mode: any error swallows + leaves legacy entry intact so the
 * fallback in `getAccessToken()` keeps the user signed in.
 */
export const migrateLegacyKeychain = async (): Promise<void> => {
  try {
    // Skip if new layout already has a token (avoid clobbering).
    const newAccess = await readField('access_token');
    if (newAccess) {
      // Ensure legacy is cleared (best-effort cleanup).
      try {
        const legacy = await Keychain.getGenericPassword();
        if (legacy && legacy.username === LEGACY_USERNAME) {
          await Keychain.resetGenericPassword();
        }
      } catch {
        // ignore
      }
      return;
    }

    const legacy = await Keychain.getGenericPassword();
    if (!legacy || legacy.username !== LEGACY_USERNAME) {
      return;
    }

    await setTokens({
      access_token: legacy.password,
      // Refresh & expiry unknown — server will re-issue on next refresh attempt.
      refresh_token: null,
      access_token_expires_at: null,
      refresh_token_expires_at: null,
      user_email: null,
    });
    await Keychain.resetGenericPassword();
  } catch (error) {
    console.warn('[tokenStorage] migrateLegacyKeychain failed', error);
  }
};
