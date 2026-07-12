import type { StoredTokenData } from '../types/auth';

const KEY = (f: string) => `AUXI_AUTH/${f}`;

/** Shared cross-subdomain session cookie for the web-preview sandbox. */
const SHARED_COOKIE = 'AUXI_SESSION';
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 30; // 30d fallback

export interface SetTokensInput {
  access_token: string;
  refresh_token?: string | null;
  access_token_expires_at?: number | null;
  refresh_token_expires_at?: number | null;
  user_email?: string | null;
}

// When enabled (admin impersonation iframe), ALL shared-cookie writes/deletes
// are skipped so the ephemeral session never touches the designer's cookie.
let ephemeral = false;
export const enableEphemeralMode = (): void => {
  ephemeral = true;
};

// After-login redirect URL for the Google OAuth relay flow:
// set in index.web.tsx when ?return= is present (preview subdomain → main URL login).
let _pendingReturnUrl: string | null = null;

/** Register a URL to redirect to after the next successful setTokens call.
 *  Only accepts *.auxi-web-review.pages.dev to prevent open redirects.
 *  Anchors on a '.' boundary to block evil-auxi-web-review.pages.dev bypass. */
export const setPendingReturnUrl = (url: string): void => {
  try {
    const h = new URL(url).hostname;
    if (h === 'auxi-web-review.pages.dev' || h.endsWith('.auxi-web-review.pages.dev')) {
      _pendingReturnUrl = url;
    }
  } catch {
    /* invalid URL — ignore */
  }
};

const write = (f: string, v: string | null | undefined) => {
  if (v === undefined) return;
  if (v === null) localStorage.removeItem(KEY(f));
  else localStorage.setItem(KEY(f), v);
};
const read = (f: string): string | null => localStorage.getItem(KEY(f));

const nowSec = () => Math.floor(Date.now() / 1000);

/** Registrable domain for the shared cookie, or undefined for a host-only
 * cookie (e.g. localhost dev). `pages.dev` is a public suffix, so the
 * registrable domain is the last three labels (`auxi-web-review.pages.dev`). */
const sharedCookieDomain = (): string | undefined => {
  const host = typeof location !== 'undefined' ? location.hostname : '';
  if (host.endsWith('.pages.dev')) return host.split('.').slice(-3).join('.');
  return undefined;
};

const readCookie = (name: string): string | null => {
  if (typeof document === 'undefined' || !document.cookie) return null;
  for (const part of document.cookie.split('; ')) {
    const eq = part.indexOf('=');
    if (eq > -1 && part.slice(0, eq) === name) return part.slice(eq + 1);
  }
  return null;
};

const writeSharedCookie = (b: StoredTokenData): void => {
  if (ephemeral || typeof document === 'undefined') return;
  const ttl = (b.refresh_token_expires_at || 0) - nowSec();
  const maxAge = ttl > 0 ? ttl : DEFAULT_MAX_AGE;
  const attrs = [
    `${SHARED_COOKIE}=${encodeURIComponent(JSON.stringify(b))}`,
    'Path=/',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  const domain = sharedCookieDomain();
  if (domain) attrs.push(`Domain=${domain}`);
  document.cookie = attrs.join('; ');
};

const deleteSharedCookie = (): void => {
  if (ephemeral || typeof document === 'undefined') return;
  const attrs = [`${SHARED_COOKIE}=`, 'Path=/', 'Max-Age=0'];
  const domain = sharedCookieDomain();
  if (domain) attrs.push(`Domain=${domain}`);
  document.cookie = attrs.join('; ');
};

export const setTokens = async (input: SetTokensInput): Promise<void> => {
  write('access_token', input.access_token);
  write('refresh_token', input.refresh_token);
  if (input.access_token_expires_at != null)
    write('access_token_expires_at', String(input.access_token_expires_at));
  if (input.refresh_token_expires_at != null)
    write('refresh_token_expires_at', String(input.refresh_token_expires_at));
  write('user_email', input.user_email);
  writeSharedCookie({
    access_token: input.access_token,
    refresh_token: input.refresh_token ?? '',
    access_token_expires_at: input.access_token_expires_at ?? 0,
    refresh_token_expires_at: input.refresh_token_expires_at ?? 0,
    user_email: input.user_email ?? '',
  });

  // Relay flow: after login at the main URL on behalf of a preview subdomain,
  // redirect back so the shared cookie auto-authenticates there.
  if (_pendingReturnUrl && !ephemeral) {
    const url = _pendingReturnUrl;
    _pendingReturnUrl = null;
    // Defer one tick so the login screen's success handler can finish its own
    // state update before we navigate away. Cookie write above is synchronous.
    // Navigate window.top so the entire browser tab moves, not just the iframe.
    setTimeout(() => {
      try {
        if (
          typeof window !== 'undefined' &&
          window.top &&
          window.top !== window
        ) {
          window.top.location.href = url;
          return;
        }
      } catch {
        /* cross-origin top — fall through to location.href */
      }
      location.href = url;
    }, 50);
  }
};

export const getAccessToken = async (): Promise<string | null> =>
  read('access_token');
export const getRefreshToken = async (): Promise<string | null> =>
  read('refresh_token');
export const getStoredEmail = async (): Promise<string | null> =>
  read('user_email');

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
  [
    'access_token',
    'refresh_token',
    'access_token_expires_at',
    'refresh_token_expires_at',
    'user_email',
  ].forEach(f => localStorage.removeItem(KEY(f)));
  deleteSharedCookie();
};

/**
 * Adopt a cross-subdomain sandbox session from the shared cookie when this
 * origin's localStorage is empty. Returns true if a session was hydrated.
 * Skips dead sessions (both access + refresh past expiry).
 */
export const hydrateFromSharedCookie = async (): Promise<boolean> => {
  if (read('access_token')) return false;
  const raw = readCookie(SHARED_COOKIE);
  if (!raw) return false;
  let b: StoredTokenData;
  try {
    b = JSON.parse(decodeURIComponent(raw));
  } catch {
    return false;
  }
  if (!b || !b.access_token) return false;
  const exp = b.refresh_token_expires_at || b.access_token_expires_at || 0;
  if (exp && exp <= nowSec()) return false;
  await setTokens(b);
  return true;
};

export const migrateLegacyKeychain = async (): Promise<void> => {};
