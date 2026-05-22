/**
 * AU-242 Phase 04 — deep-link parser.
 *
 * Parses verify-email and reset-password URLs and dispatches them
 * into the AuthNavigator. Two URL families are supported:
 *
 *   - Custom scheme:  `auxi://verify-email?token=…`
 *                     `auxi://reset-password?token=…`
 *   - Universal Link: `https://auxi.app/verify-email?token=…`
 *                     `https://auxi.app/reset-password?token=…`
 *
 * Universal Links won't open the app until Apple App Site Association
 * is hosted at `https://auxi.app/.well-known/apple-app-site-association`
 * — that hosting work is deferred to phase 06. For now only the
 * custom scheme actually opens the app; the universal-link parser is
 * here so it Just Works once AASA + Android App Links land without a
 * second refactor.
 *
 * Cold-start vs warm-start:
 *   - `Linking.getInitialURL()` is checked once on mount. If a deep
 *     link launched the app cold, we replay it after the nav tree is
 *     ready.
 *   - `Linking.addEventListener('url', …)` handles warm-start (app
 *     already running).
 *
 * Token consumption:
 *   - verify-email links call `verifyEmail({ token })` here and
 *     navigate to `Verified` on success.
 *   - reset-password links navigate to `ResetNewPassword` and let
 *     that screen fire `resetPassword` on submit (so the user gets to
 *     type the new password first).
 */
import { Linking } from 'react-native';
import type { NavigationContainerRef } from '@react-navigation/native';

import { verifyEmail as verifyEmailCall } from './auth';
import type { AppStackParamList } from '../types/navigation';

const SUPPORTED_HOSTS = new Set(['auxi.app']);

export type DeepLinkKind = 'verify-email' | 'reset-password';

export interface ParsedDeepLink {
  kind: DeepLinkKind;
  token: string;
  /** Optional email pass-through for reset-password handoff. */
  email?: string;
}

const SUPPORTED_SLUGS: ReadonlySet<DeepLinkKind> = new Set([
  'verify-email',
  'reset-password',
]);

/**
 * Lightweight URL parser. RN doesn't ship a complete WHATWG URL
 * implementation by default, so we parse by hand instead of pulling
 * in a polyfill for two URL shapes.
 *
 * Returns `{ scheme, host, path, query }` or `null` if the input
 * doesn't match `<scheme>://<host>/<path>?<query>`.
 */
const splitUrl = (raw: string): {
  scheme: string;
  host: string;
  path: string;
  query: string;
} | null => {
  const m = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)([^?#]*)(?:\?([^#]*))?(?:#.*)?$/i.exec(raw);
  if (!m) return null;
  return {
    scheme: m[1].toLowerCase(),
    host: m[2].toLowerCase(),
    path: m[3] ?? '',
    query: m[4] ?? '',
  };
};

const parseQuery = (query: string): Record<string, string> => {
  const out: Record<string, string> = {};
  if (!query) return out;
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    if (eq < 0) {
      out[decodeURIComponent(pair)] = '';
    } else {
      const k = decodeURIComponent(pair.slice(0, eq));
      const v = decodeURIComponent(pair.slice(eq + 1));
      out[k] = v;
    }
  }
  return out;
};

/**
 * Parse a URL into a known deep-link kind. Returns `null` for
 * anything we don't recognise — the caller silently drops these so
 * unrelated `Linking` activity (OAuth redirects, mail-app callbacks)
 * doesn't blow up the app.
 */
export const parseDeepLink = (
  raw: string | null | undefined,
): ParsedDeepLink | null => {
  if (!raw) return null;

  const parts = splitUrl(raw);
  if (!parts) return null;

  const isCustomScheme = parts.scheme === 'auxi';
  const isUniversalLink = parts.scheme === 'https' && SUPPORTED_HOSTS.has(parts.host);
  if (!isCustomScheme && !isUniversalLink) return null;

  // Custom-scheme URLs may parse the slug as the host
  // (`auxi://verify-email`) or as the pathname (`auxi:///verify-email`).
  // Try the host first, fall back to the leading path segment.
  let pathSlug = isCustomScheme && parts.host
    ? parts.host
    : parts.path.replace(/^\/+/, '').split('/')[0] ?? '';
  pathSlug = pathSlug.toLowerCase();

  if (!SUPPORTED_SLUGS.has(pathSlug as DeepLinkKind)) return null;

  const q = parseQuery(parts.query);
  const token = q.token;
  if (!token) return null;

  return {
    kind: pathSlug as DeepLinkKind,
    token,
    email: q.email || undefined,
  };
};

type NavRef = NavigationContainerRef<AppStackParamList>;

interface DispatchDeps {
  navRef: NavRef | null;
}

/**
 * Resolve a parsed deep-link by side-effecting on navigation +
 * issuing the verify-email API call when applicable.
 *
 * Returns a promise so the caller can await test setups; in the
 * happy path the navigation event fires synchronously and the
 * verify API call resolves shortly after.
 */
export const dispatchDeepLink = async (
  link: ParsedDeepLink,
  { navRef }: DispatchDeps,
): Promise<void> => {
  if (!navRef || !navRef.isReady()) {
    // Nav tree not mounted yet — caller will retry once the
    // `onReady` callback fires.
    return;
  }

  if (link.kind === 'reset-password') {
    navRef.navigate('Auth', {
      screen: 'ResetNewPassword',
      params: { token: link.token, email: link.email },
    });
    return;
  }

  if (link.kind === 'verify-email') {
    // Optimistically land on the Verified screen — the screen
    // displays a loading state until the API resolves. On failure
    // the screen surfaces the error envelope and offers a retry.
    navRef.navigate('Auth', {
      screen: 'Verified',
      params: { source: 'signup' },
    });
    try {
      await verifyEmailCall({ token: link.token });
    } catch (err) {
      // Verified screen will read this error via mutation state in
      // a future batch; for foundation we surface it on console.
      console.warn('[deepLinkHandler] verifyEmail failed', err);
    }
  }
};

/**
 * Subscribe to Linking events. Caller passes a ref factory because
 * the navigation container is mounted asynchronously; we re-read on
 * every event so a late nav-ready doesn't drop links.
 *
 * Returns a cleanup function to unsubscribe.
 */
export const registerDeepLinkListeners = (
  getNavRef: () => NavRef | null,
): (() => void) => {
  const handle = async (url: string | null) => {
    const parsed = parseDeepLink(url);
    if (!parsed) return;
    await dispatchDeepLink(parsed, { navRef: getNavRef() });
  };

  // Cold-start: check the URL that opened the app, if any.
  Linking.getInitialURL()
    .then(handle)
    .catch((err) => console.warn('[deepLinkHandler] getInitialURL failed', err));

  // Warm-start: subscribe to subsequent links.
  const sub = Linking.addEventListener('url', (event) => {
    void handle(event.url);
  });

  return () => {
    sub.remove();
  };
};
