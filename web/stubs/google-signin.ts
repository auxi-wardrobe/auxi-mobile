/**
 * Web stub for @react-native-google-signin/google-signin.
 *
 * Implements real Google OAuth via the Google Identity Services (GIS)
 * One Tap API so the web-preview login screen works the same as native.
 *
 * GCC prerequisite: the JS origin(s) used by the web preview must be added
 * to the Authorized JavaScript Origins for the web client in Google Cloud
 * Console (APIs & Services → Credentials → the web client ID). At minimum:
 *   - https://auxi-web-review.pages.dev
 * Add individual preview subdomains if needed, or keep logging in from
 * the main URL and letting the shared cookie propagate.
 */

type GISCredentialResponse = { credential: string };
type GISPromptNotification = {
  isNotDisplayed(): boolean;
  isSkippedMoment(): boolean;
  isDismissedMoment(): boolean;
};
interface GISAccounts {
  id: {
    initialize(config: {
      client_id: string;
      callback: (r: GISCredentialResponse) => void;
      cancel_on_tap_outside?: boolean;
    }): void;
    prompt(fn?: (n: GISPromptNotification) => void): void;
    cancel(): void;
  };
}
declare global {
  interface Window {
    google?: { accounts: GISAccounts };
  }
}

export const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
};

let _clientId = '';
let _scriptPromise: Promise<void> | null = null;

function loadGIS(): Promise<void> {
  if (typeof window !== 'undefined' && window.google?.accounts) {
    return Promise.resolve();
  }
  if (_scriptPromise) return _scriptPromise;
  _scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      // Reset so a retry (e.g. after network recovery) can re-attempt the load.
      _scriptPromise = null;
      reject(new Error('GIS script failed to load'));
    };
    document.head.appendChild(s);
  });
  return _scriptPromise;
}

/**
 * True when running on a dynamic preview subdomain (e.g. abc123.auxi-web-review.pages.dev).
 * GIS can't run there — JS origin isn't pre-registered in GCC. We redirect to
 * the main URL instead so GIS fires on a fixed registered origin.
 */
function isPreviewSubdomain(): boolean {
  if (typeof location === 'undefined') return false;
  const h = location.hostname;
  return (
    h !== 'auxi-web-review.pages.dev' &&
    h.endsWith('.auxi-web-review.pages.dev')
  );
}

export const GoogleSignin = {
  configure: (
    cfg: {
      webClientId?: string;
      iosClientId?: string;
      offlineAccess?: boolean;
    } = {},
  ): void => {
    if (cfg.webClientId) _clientId = cfg.webClientId;
  },

  hasPlayServices: async () => true,

  signIn: async (): Promise<{
    type: string;
    data: { idToken: string; user: { photo: string | null } };
  }> => {
    // Preview subdomains have random prefixes and can't be pre-registered as
    // GCC JS origins. Route the login to the fixed main URL; after login there
    // the shared cookie (Domain=auxi-web-review.pages.dev) propagates back here.
    //
    // We must navigate window.top (the outer DeviceFrame), not just `location`
    // (which only moves the iframe). GIS One Tap is blocked in cross-origin iframes,
    // so login must happen with the main URL as the top-level context.
    if (isPreviewSubdomain()) {
      const dest = new URL('https://auxi-web-review.pages.dev');
      // Return to the outer DeviceFrame URL so after login the DeviceFrame
      // re-renders and its iframe auto-auths via the shared cookie.
      let returnUrl = typeof location !== 'undefined' ? location.origin : '';
      try {
        if (
          typeof window !== 'undefined' &&
          window.top &&
          window.top !== window
        ) {
          returnUrl = window.top.location.href;
        }
      } catch {
        /* cross-origin top — shouldn't reach here for *.auxi-web-review.pages.dev */
      }
      if (returnUrl) dest.searchParams.set('return', returnUrl);
      try {
        if (
          typeof window !== 'undefined' &&
          window.top &&
          window.top !== window
        ) {
          window.top.location.href = dest.toString();
        } else {
          location.replace(dest.toString());
        }
      } catch {
        location.replace(dest.toString());
      }
      return new Promise<never>(() => {}); // navigation takes over
    }

    await loadGIS();
    return new Promise((resolve, reject) => {
      const g = typeof window !== 'undefined' ? window.google : undefined;
      if (!g) {
        reject(Object.assign(new Error('GIS unavailable'), { code: statusCodes.SIGN_IN_CANCELLED }));
        return;
      }
      if (!_clientId) {
        reject(Object.assign(new Error('GoogleSignin.configure() missing webClientId'), { code: statusCodes.SIGN_IN_CANCELLED }));
        return;
      }

      let settled = false;
      const once = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };

      // Cancel any in-flight prompt from a prior signIn call before re-initializing.
      g.accounts.id.cancel();
      g.accounts.id.initialize({
        client_id: _clientId,
        cancel_on_tap_outside: true,
        callback: (response: GISCredentialResponse) => {
          once(() =>
            resolve({
              type: 'success',
              data: { idToken: response.credential, user: { photo: null } },
            }),
          );
        },
      });

      g.accounts.id.prompt((notification: GISPromptNotification) => {
        if (notification.isNotDisplayed() || notification.isDismissedMoment()) {
          // User-initiated cancellation — caller silences the error via isOAuthCancelled().
          once(() =>
            reject(Object.assign(new Error('Cancelled'), { code: statusCodes.SIGN_IN_CANCELLED })),
          );
        } else if (notification.isSkippedMoment()) {
          // Browser throttled One Tap (cooldown heuristic) — not a user action.
          // Reject with a distinct code so the caller can show a retry prompt
          // instead of a "login cancelled" toast.
          once(() =>
            reject(Object.assign(new Error('Suppressed'), { code: 'GIS_SUPPRESSED' })),
          );
        }
      });
    });
  },

  signOut: async (): Promise<void> => {
    if (typeof window !== 'undefined') window.google?.accounts.id.cancel();
  },
  revokeAccess: async (): Promise<void> => undefined,
  isSignedIn: async () => false,
  getCurrentUser: () => null,
  getTokens: async () => ({ idToken: '', accessToken: '' }),
};

export const GoogleSigninButton: any = () => null;
export default { GoogleSignin, statusCodes, GoogleSigninButton };
