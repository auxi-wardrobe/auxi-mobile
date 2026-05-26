/* eslint-env jest */
/**
 * Global jest setup for native modules used across the RN app.
 * Mirrors the metro-time shims so component tests render without a
 * native runtime. Reused by all test files via `setupFiles` in
 * jest.config.js — keep additive so the existing pure-unit tests
 * (e.g. services/__tests__/analytics.test.ts) stay unaffected.
 */

// react-native-toast-message: default export with .show / .hide spies.
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: {
    show: jest.fn(),
    hide: jest.fn(),
  },
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
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
  }),
  useRoute: () => ({ params: {} }),
  useIsFocused: () => true,
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
