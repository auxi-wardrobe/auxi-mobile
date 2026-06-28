/* eslint-env jest */
/**
 * Global jest setup for native modules used across the RN app.
 * Mirrors the metro-time shims so component tests render without a
 * native runtime. Reused by all test files via `setupFiles` in
 * jest.config.js — keep additive so the existing pure-unit tests
 * (e.g. services/__tests__/analytics.test.ts) stay unaffected.
 */

// DS toast service (m-toast-service) — replaces the former
// react-native-toast-message global mock. Screens fire the imperative `toast.*`
// API (toast.show / toast.hide); spy on its methods so tests can assert what was
// shown. `subscribeToast` returns a no-op unsubscribe so <MToastHost/> (the App
// render path) mounts to null without a live subscription.
jest.mock('./src/components/design-system/lib/m-toast-service', () => ({
  __esModule: true,
  toast: {
    show: jest.fn(),
    hide: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
  subscribeToast: jest.fn(() => () => {}),
}));

// react-native-safe-area-context: insets + provider passthrough.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) =>
      React.createElement(React.Fragment, null, children),
    SafeAreaView: ({ children }) =>
      React.createElement(React.Fragment, null, children),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// react-navigation: useNavigation returns a stable spy bag.
jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    // NavigationContainer is rendered by AppNavigator; pass children through so
    // the full-app smoke test (App.test.tsx) can mount the tree.
    NavigationContainer: ({ children }) =>
      React.createElement(React.Fragment, null, children),
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
    }),
    useRoute: () => ({ params: {} }),
    useIsFocused: () => true,
    // Sidebar (mounted inside several screens) reads the focused route name via
    // useNavigationState(selector). Apply the selector to a stub state with one
    // route so the hook returns a deterministic name instead of crashing.
    useNavigationState: selector =>
      selector({ index: 0, routes: [{ name: 'Settings' }] }),
  };
});

// @react-navigation/native-stack ships untranspiled ESM that the react-native
// jest preset does not run through Babel (it's outside transformIgnorePatterns),
// so importing it for real throws "Unexpected token 'export'". Stub the factory:
// Navigator passes children through, Screen renders nothing. Enough for the
// App.test.tsx smoke render to mount without a native stack.
jest.mock('@react-navigation/native-stack', () => {
  const React = require('react');
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }) =>
        React.createElement(React.Fragment, null, children),
      Screen: () => null,
    }),
  };
});

// react-native-keychain: in-memory stub. AuthContext bootstrap reads the token
// bundle on mount (App.test.tsx render path); without this the real native
// module is undefined and logs post-test async errors.
jest.mock('react-native-keychain', () => ({
  __esModule: true,
  setInternetCredentials: jest.fn().mockResolvedValue(true),
  getInternetCredentials: jest.fn().mockResolvedValue(false),
  resetInternetCredentials: jest.fn().mockResolvedValue(true),
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
  ACCESSIBLE: { WHEN_UNLOCKED: 'AccessibleWhenUnlocked' },
}));

// @react-native-google-signin/google-signin: untranspiled ESM (outside the
// preset's transformIgnorePatterns) reached from App.tsx → configureGoogleSignIn.
// Stub the SDK + statusCodes so the OAuth adapters import cleanly.
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({ idToken: null }),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

// @invertase/react-native-apple-authentication: same ESM/transform issue,
// reached via the OAuth error normaliser + apple adapter at import time.
jest.mock('@invertase/react-native-apple-authentication', () => ({
  appleAuth: {
    performRequest: jest.fn().mockResolvedValue({ identityToken: null }),
    Operation: { LOGIN: 1 },
    Scope: { EMAIL: 0, FULL_NAME: 1 },
    Error: { CANCELED: '1001' },
  },
}));

// react-native-localize: backed by the RNLocalize TurboModule, absent in the
// jest runtime. i18n init (App.test.tsx render path) calls getLocales(); return
// a stable English locale so device-language detection resolves deterministically.
jest.mock('react-native-localize', () => ({
  getLocales: () => [
    { languageCode: 'en', countryCode: 'US', languageTag: 'en-US' },
  ],
}));

// @sentry/react-native: untranspiled ESM (outside transformIgnorePatterns) plus
// a native bridge. Reached via services/sentry.ts + weatherService.ts on the
// App render path. Inert stub — weatherService.test.ts re-mocks locally as needed.
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
}));

// react-native-geolocation-service: ESM default export over a native bridge,
// reached via utils/location.ts. Stub auth + position so location reads resolve.
jest.mock('react-native-geolocation-service', () => ({
  __esModule: true,
  default: {
    requestAuthorization: jest.fn().mockResolvedValue('granted'),
    getCurrentPosition: jest.fn(),
  },
}));

// @react-native-async-storage/async-storage: in-memory store (consent flag).
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(key =>
        Promise.resolve(store.has(key) ? store.get(key) : null),
      ),
      setItem: jest.fn((key, value) => {
        store.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn(key => {
        store.delete(key);
        return Promise.resolve();
      }),
    },
  };
});

// mixpanel-react-native: inert stub so the analytics seam imports cleanly.
jest.mock('mixpanel-react-native', () => {
  class People {
    set() {}
    setOnce() {}
    increment() {}
  }
  class Mixpanel {
    init() {
      return Promise.resolve();
    }
    identify() {
      return Promise.resolve();
    }
    track() {}
    reset() {}
    flush() {}
    optInTracking() {}
    optOutTracking() {}
    hasOptedOutTracking() {
      return Promise.resolve(false);
    }
    registerSuperProperties() {}
    setUseIpAddressForGeolocation() {}
    getPeople() {
      return new People();
    }
  }
  return { __esModule: true, Mixpanel };
});
