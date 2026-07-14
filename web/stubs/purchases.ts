// Web (react-native-web sandbox) no-op stub for react-native-purchases.
// RevenueCat's RN SDK is a native module with no meaningful web binding for our
// flow; the preview must import a surface-compatible shim so services/revenueCat
// and UpgradeScreen build. All methods no-op / reject softly — the RC service
// only ever runs configure() on iOS anyway (Platform.OS guard), so on web it
// stays unconfigured and every helper short-circuits before touching this stub.

export const LOG_LEVEL = {
  VERBOSE: 'VERBOSE',
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
} as const;

// Types the RC service imports. `unknown` keeps the stub type-safe — the
// sandbox never exercises these paths (Platform.OS !== 'ios' keeps RC
// unconfigured), so no real shape is needed.
export type CustomerInfo = unknown;
export type PurchasesOffering = unknown;
export type PurchasesOfferings = unknown;
export type PurchasesPackage = unknown;

const Purchases = {
  setLogLevel: (_level?: unknown): void => {},
  configure: (_config?: unknown): void => {},
  logIn: async (_appUserID?: string) => ({
    customerInfo: null,
    created: false,
  }),
  logOut: async () => null,
  getOfferings: async () => ({ current: null }),
  purchasePackage: async (_pkg?: unknown) => ({
    customerInfo: null,
    productIdentifier: '',
  }),
  restorePurchases: async () => null,
  getCustomerInfo: async () => null,
};

export default Purchases;
