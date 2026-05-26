/* eslint-env jest */
/* Jest mocks for the native modules imported by src/services/analytics.ts.
 * The bare `react-native` preset does not stub these, so importing the
 * analytics seam in a test would otherwise hit native code and throw.
 * Mocks are intentionally minimal — enough to keep imports resolvable and
 * the no-network track() contract testable. */

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
