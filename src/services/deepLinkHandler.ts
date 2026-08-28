/**
 * AU-242 Phase 04 — deep-link parser. Extended AU-457 phase 09 with a third
 * kind (`discovery-outfit`) that carries an opaque outfit id instead of a
 * token.
 *
 * Parses verify-email, reset-password, and discovery-outfit URLs and
 * dispatches them into the app. Two URL families are supported for every
 * kind:
 *
 *   - Custom scheme:  `auxi://verify-email?token=…`
 *                     `auxi://reset-password?token=…`
 *                     `auxi://discovery-outfit?id=…`
 *   - Universal Link: `https://macgie.com/verify-email?token=…`
 *                     `https://macgie.com/reset-password?token=…`
 *                     `https://macgie.com/discovery-outfit?id=…`
 *
 * Universal Links won't open the app until Apple App Site Association
 * is hosted at `https://macgie.com/.well-known/apple-app-site-association`
 * — that hosting work is deferred to phase 06. For now only the
 * custom scheme actually opens the app; the universal-link parser is
 * here so it Just Works once AASA + Android App Links land without a
 * second refactor. No native manifest change was needed for
 * `discovery-outfit` — the custom scheme is already registered
 * (`ios/auxi/Info.plist`, `AndroidManifest.xml`).
 *
 * Cold-start vs warm-start:
 *   - `Linking.getInitialURL()` is checked once on mount. If a deep
 *     link launched the app cold, we replay it after the nav tree is
 *     ready.
 *   - `Linking.addEventListener('url', …)` handles warm-start (app
 *     already running).
 *
 * Kind handling:
 *   - verify-email links call `verifyEmail({ token })` here and
 *     navigate to `Verified` on success.
 *   - reset-password links navigate to `ResetNewPassword` and let
 *     that screen fire `resetPassword` on submit (so the user gets to
 *     type the new password first).
 *   - discovery-outfit links navigate straight to
 *     `DiscoveryOutfitDetail` with the id — "route-then-resolve": the
 *     screen itself resolves the fetch (a 404 renders its own
 *     "no longer available" fallback, see `discoveryService.getOutfit`).
 *     This is a single network path and behaves identically cold or warm.
 */
import { Alert, Linking } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import type { NavigationContainerRef } from '@react-navigation/native';

import { verifyEmail as verifyEmailCall } from './auth';
import { track } from './analytics';
import type { AppStackParamList } from '../types/navigation';

const SUPPORTED_HOSTS = new Set(['macgie.com', 'www.macgie.com']);

export type DeepLinkKind = 'verify-email' | 'reset-password' | 'discovery-outfit';
type AuthDeepLinkKind = 'verify-email' | 'reset-password';

const AUTH_KINDS: ReadonlySet<AuthDeepLinkKind> = new Set([
  'verify-email',
  'reset-password',
]);

/**
 * Discriminated union — the two auth kinds require `token`, the discovery
 * kind requires `id`. Keeping these mutually exclusive at the type level is
 * what makes the parser's kind-aware validation (below) safe to extend later
 * without a param silently becoming optional-everywhere.
 */
export type ParsedDeepLink =
  | { kind: AuthDeepLinkKind; token: string; email?: string }
  | { kind: 'discovery-outfit'; id: string };

const SUPPORTED_SLUGS: ReadonlySet<DeepLinkKind> = new Set([
  'verify-email',
  'reset-password',
  'discovery-outfit',
]);

/**
 * Lightweight URL parser. RN doesn't ship a complete WHATWG URL
 * implementation by default, so we parse by hand instead of pulling
 * in a polyfill for two URL shapes.
 *
 * Returns `{ scheme, host, path, query }` or `null` if the input
 * doesn't match `<scheme>://<host>/<path>?<query>`.
 */
const splitUrl = (
  raw: string,
): {
  scheme: string;
  host: string;
  path: string;
  query: string;
} | null => {
  const m =
    /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)([^?#]*)(?:\?([^#]*))?(?:#.*)?$/i.exec(
      raw,
    );
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
  const isUniversalLink =
    parts.scheme === 'https' && SUPPORTED_HOSTS.has(parts.host);
  if (!isCustomScheme && !isUniversalLink) return null;

  // Custom-scheme URLs may parse the slug as the host
  // (`auxi://verify-email`) or as the pathname (`auxi:///verify-email`).
  // Try the host first, fall back to the leading path segment.
  let pathSlug =
    isCustomScheme && parts.host
      ? parts.host
      : parts.path.replace(/^\/+/, '').split('/')[0] ?? '';
  pathSlug = pathSlug.toLowerCase();

  if (!SUPPORTED_SLUGS.has(pathSlug as DeepLinkKind)) return null;

  const q = parseQuery(parts.query);

  if (pathSlug === 'discovery-outfit') {
    const id = q.id;
    if (!id) return null;
    return { kind: 'discovery-outfit', id };
  }

  // Both remaining kinds are auth-recovery links and require `token`.
  const token = q.token;
  if (!token) return null;

  return {
    kind: pathSlug as AuthDeepLinkKind,
    token,
    email: q.email || undefined,
  };
};

// Session-expired UX guard: AuthContext's cold-start checkAuth() can race
// with this handler — if a stale token gets revoked server-side (e.g. by
// an earlier successful password reset elsewhere), apiClient fires a
// "session expired" toast at the exact moment we're also landing the user
// on the reset-password/verify-email screen. That's confusing noise during
// account recovery, so AuthContext checks this marker and skips the toast
// (still clears the session — just skips the interruption) when a reset-
// password/verify-email link was seen in the last few seconds.
const AUTH_DEEP_LINK_GRACE_MS = 10_000;
let lastAuthDeepLinkAt: number | null = null;

export const markAuthDeepLinkSeen = (): void => {
  lastAuthDeepLinkAt = Date.now();
};

export const wasAuthDeepLinkRecentlySeen = (
  windowMs: number = AUTH_DEEP_LINK_GRACE_MS,
): boolean =>
  lastAuthDeepLinkAt !== null && Date.now() - lastAuthDeepLinkAt < windowMs;

type NavRef = NavigationContainerRef<AppStackParamList>;

interface DispatchDeps {
  navRef: NavRef | null;
}

// Cold-start race fix: `getInitialURL()` can resolve before the nav tree is
// ready (auth bootstrap keeps `NavigationContainer` unmounted while
// `isLoading` is true — see AppNavigator). Rather than silently dropping the
// link, stash it here and replay it once `AppNavigator`'s `onReady` fires.
// Single slot is enough — this only needs to survive one mount cycle, not a
// queue of links.
let pendingDeepLink: ParsedDeepLink | null = null;

// AU-457 phase 09 (review-fix, see High #2): `DiscoveryOutfitDetail` only
// exists as a registered `Stack.Screen` in `AppNavigator`'s post-onboarding
// authed branch. Two other root-stack shapes have no such route: the
// logged-out branch (a single `Auth` screen wrapping the auth flow) AND the
// first-login onboarding branch (`Welcome` → ... → `OnboardingOutro`, mounted
// whenever `user.is_first_login` is true). The original check only compared
// `routes[0].name !== 'Auth'`, which returns `true` (wrongly "ready") for the
// onboarding branch too — a link opened mid-onboarding would `navigate()`
// into a tree without the route (silent no-op) and be lost forever, since
// `pendingDeepLink` was already cleared before this check ran.
//
// Checking `routeNames` — the full set of screens configured on the
// CURRENTLY mounted root `Stack.Navigator`, not just the routes pushed onto
// the history stack — covers every "not ready" branch with one query and
// self-corrects if `AppNavigator`'s branches are ever restructured; there's
// no separate route-name allowlist here to fall out of sync.
const isDiscoveryRouteMounted = (navRef: NavRef): boolean =>
  Boolean(navRef.getState()?.routeNames?.includes('DiscoveryOutfitDetail'));

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
  source: string = 'unknown',
): Promise<void> => {
  if (!navRef || !navRef.isReady()) {
    // TEMPORARY diagnostic — see the discovery-outfit block below.
    if (link.kind === 'discovery-outfit') {
      Alert.alert(
        'DEBUG discovery-outfit dispatch',
        `source: ${source}\nnavRef: ${navRef ? 'present' : 'NULL'}\nisReady: ${navRef?.isReady() ?? 'n/a (no ref)'}\n→ stashing (not ready)`,
      );
    }
    // Nav tree not mounted yet — stash for replay once `onReady` fires
    // (see `replayPendingDeepLink`).
    pendingDeepLink = link;
    return;
  }

  if (link.kind === 'discovery-outfit') {
    // TEMPORARY diagnostic (AU-457 review-fix investigation) — remove once
    // the "must visit Discovery once first" real-device pattern is
    // root-caused. Shows on-screen (no Console.app needed) exactly what
    // routeNames/isReady look like at the moment a discovery-outfit link is
    // dispatched, so we can compare a failing attempt vs a working one.
    // `source` identifies which of the several trigger paths fired this
    // call (cold-getInitialURL / warm-url-event / onReady / retry-N /
    // appstate-active / user-effect) so we can tell which one sees the
    // empty-routeNames state.
    const state = navRef.getState();
    Alert.alert(
      'DEBUG discovery-outfit dispatch',
      [
        `source: ${source}`,
        `isReady: ${navRef.isReady()}`,
        `routeNames (${state?.routeNames?.length ?? 0}): ${state?.routeNames?.join(', ') ?? 'none'}`,
        `current route: ${state?.routes?.[state.index ?? 0]?.name ?? 'unknown'}`,
        `will navigate: ${state?.routeNames?.includes('DiscoveryOutfitDetail') ?? false}`,
      ].join('\n'),
    );
    // Logged-out OR mid-onboarding — `DiscoveryOutfitDetail` isn't a
    // registered route in either tree shape. Stash instead of navigating
    // into a tree that doesn't have it; `replayPendingDeepLink` re-runs this
    // same check once the authed tree (with Discovery routes) mounts, however
    // long that takes — post-login, or post-onboarding for a first-login
    // user.
    if (!isDiscoveryRouteMounted(navRef)) {
      pendingDeepLink = link;
      return;
    }
    // Route-then-resolve (see file header): navigate straight to the detail
    // screen with just the id — it owns the fetch, the loading state, and the
    // "no longer available" 404 fallback. `source: 'deep_link'` lets the
    // screen fire `discovery_deep_link_opened` once the fetch settles,
    // without double-counting the `discovery_outfit_opened` a feed-card tap
    // already fires.
    navRef.navigate('DiscoveryOutfitDetail', {
      outfitId: link.id,
      source: 'deep_link',
    });
    return;
  }

  if (link.kind === 'reset-password') {
    // Reset (not navigate) the Auth stack to a fresh
    // [ForgotPasswordRequest, ResetNewPassword] state. A plain `.navigate`
    // would push ResetNewPassword onto whatever stale Auth stack state
    // already existed in this app session (e.g. a leftover
    // ForgotPasswordCheckMail "check your email" screen from an earlier
    // forgot-password attempt) — back from ResetNewPassword would then land
    // on that stale, no-longer-relevant screen instead of the "enter your
    // email" screen. Resetting guarantees back always lands on
    // ForgotPasswordRequest regardless of prior stack state. This assumes
    // `Auth` is the currently-mounted root screen (true whenever the user
    // isn't logged in — same precondition the rest of this function already
    // assumes); a logged-in user tapping this link is a known, separate edge
    // case.
    navRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Auth',
            state: {
              index: 1,
              routes: [
                {
                  name: 'ForgotPasswordRequest',
                  params: { email: link.email ?? '' },
                },
                {
                  name: 'ResetNewPassword',
                  params: { token: link.token, email: link.email },
                },
              ],
            },
          },
        ],
      }),
    );
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
      // Email-signup funnel terminus: the user clicked the magic link
      // and the backend confirmed verification. Pair with
      // `sign_up_started` / `sign_up_submitted` to measure activation.
      track('sign_up_completed', { method: 'email' });
    } catch (err) {
      // Verified screen will read this error via mutation state in
      // a future batch; for foundation we surface it on console.
      console.warn('[deepLinkHandler] verifyEmail failed', err);
    }
  }
};

/**
 * Replay a deep link that `dispatchDeepLink` couldn't act on because the nav
 * tree wasn't ready yet. Call this from `NavigationContainer`'s `onReady`
 * callback. No-op if there's nothing pending, or if `navRef` still isn't
 * ready (link stays pending for a later call).
 */
export const replayPendingDeepLink = async (
  navRef: NavRef | null,
  source: string = 'replay-unknown',
): Promise<void> => {
  if (!pendingDeepLink || !navRef || !navRef.isReady()) return;
  const link = pendingDeepLink;
  pendingDeepLink = null;
  await dispatchDeepLink(link, { navRef }, source);
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
  const handle = async (url: string | null, source: string) => {
    const parsed = parseDeepLink(url);
    if (!parsed) return;
    // Only the two auth-recovery kinds should suppress AuthContext's
    // session-expired toast — a `discovery-outfit` link is not an
    // auth-recovery context, so marking the window for it would wrongly
    // swallow a real session-expired toast landing at the same moment.
    if (AUTH_KINDS.has(parsed.kind as AuthDeepLinkKind)) {
      markAuthDeepLinkSeen();
    }
    await dispatchDeepLink(parsed, { navRef: getNavRef() }, source);
  };

  // Cold-start: check the URL that opened the app, if any.
  Linking.getInitialURL()
    .then(url => handle(url, 'cold-getInitialURL'))
    .catch(err => console.warn('[deepLinkHandler] getInitialURL failed', err));

  // Warm-start: subscribe to subsequent links.
  const sub = Linking.addEventListener('url', event => {
    handle(event.url, 'warm-url-event').catch(err =>
      console.warn('[deepLinkHandler] warm-start dispatch failed', err),
    );
  });

  return () => {
    sub.remove();
  };
};

// ── Push deep-link routing (Phase 1, push-notification system) ──────────────
// Curated, param-free screen allowlist — the mobile mirror of spec §5.1's
// registry. The admin SPA + backend duplicate this list (no shared SDK), so
// keep these names in sync with API_DOCUMENTATION.md. The registry's PUBLIC
// name `Creations` maps to the registered RN route `MyCreations` (the route
// name differs from the contract name); the others map 1:1.

export const CURATED_PUSH_SCREENS = [
  'Home',
  'Schedule',
  'Favourite',
  'Creations',
  'Settings',
] as const;
export type CuratedPushScreen = (typeof CURATED_PUSH_SCREENS)[number];

const PUSH_SCREEN_ROUTE: Record<CuratedPushScreen, keyof AppStackParamList> = {
  Home: 'Home',
  Schedule: 'Schedule',
  Favourite: 'Favourite',
  Creations: 'MyCreations',
  Settings: 'Settings',
};

const isHttpUrl = (url: string): boolean => /^https?:\/\//i.test(url);

const isCuratedScreen = (value: string): value is CuratedPushScreen =>
  (CURATED_PUSH_SCREENS as readonly string[]).includes(value);

/**
 * Resolve an FCM `data` payload to a navigation/open side-effect. FCM data is
 * a flat string map. Rules (spec §5.1):
 *   - kind:'route' + allowlisted screen → navRef.navigate(<mapped route>)
 *   - kind:'external' + http(s) url     → Linking.openURL(url)
 *   - anything unknown / missing        → fallback Home (NEVER crash)
 * No-op (no crash) when the nav tree is not mounted yet.
 */
export const resolveNotificationData = (
  data: Record<string, string> | undefined,
  navRef: NavRef | null,
): void => {
  if (!navRef || !navRef.isReady()) {
    return;
  }
  // Loose cast mirrors AppNavigator's dynamic-target navigate: all curated
  // routes + Home accept undefined params.
  const navigate = navRef.navigate as unknown as (name: string) => void;
  const fallbackHome = () => navigate('Home');

  try {
    if (!data || !data.kind) {
      fallbackHome();
      return;
    }

    // Try-on render result (backend `tryon_render_completed`/`_failed`, see
    // `notification_service._tryon_payload`). The backend's generic
    // `screen:'Creations'` is a route-SAFE fallback — Creations is curated so
    // an old client never crashes — but Creations is the saved-canvas list,
    // unrelated to a rendered try-on photo; it can't show the result. Handle
    // the richer `action`/`composite_url` fields first so a tap actually lands
    // on the rendered image instead of an unrelated screen.
    if (data.type === 'tryon_render' && data.action === 'tryon_result') {
      if (data.status === 'completed' && data.composite_url) {
        navRef.navigate('TryOnResult', { compositeUrl: data.composite_url });
      } else {
        fallbackHome();
      }
      return;
    }

    // Beautify terminal result (backend `beautify_ready`/`beautify_failed`,
    // see `notification_service._beautify_payload`). Same reasoning as the
    // try-on branch above — screen:'Home' is a route-safe curated fallback,
    // but the richer `item_id` field lets a tap land on the result screen
    // instead of a generic tab. No `displayUri` is carried in the payload;
    // EnhanceImage resolves the candidate from the item id on mount (the
    // original is only needed for the hold-to-compare baseline).
    if (data.type === 'beautify_result' && data.action === 'beautify_result') {
      if (data.status === 'ready' && data.item_id) {
        navRef.navigate('EnhanceImage', {
          itemId: data.item_id,
          displayUri: '',
          origin: 'wardrobe',
        });
      } else {
        fallbackHome();
      }
      return;
    }

    if (data.kind === 'route') {
      if (data.screen && isCuratedScreen(data.screen)) {
        navigate(PUSH_SCREEN_ROUTE[data.screen]);
      } else {
        fallbackHome();
      }
      return;
    }
    if (data.kind === 'external' && data.url && isHttpUrl(data.url)) {
      Linking.openURL(data.url).catch(err => {
        console.warn('[deepLinkHandler] openURL failed', err);
      });
      return;
    }
    fallbackHome();
  } catch (err) {
    console.warn('[deepLinkHandler] resolveNotificationData failed', err);
    fallbackHome();
  }
};
