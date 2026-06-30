// Web (react-native-web sandbox) no-op stub for the push device-token service.
// RNFirebase messaging is a native module with no web binding; the preview must
// import a surface-compatible shim so AuthContext / Settings / AppNavigator
// build. ensurePushPermissionAndRegister resolves true so the Settings reminder
// toggle vibes cleanly on the sandbox (no "enable in Settings" guidance toast).
export const registerDeviceForPush = async (): Promise<void> => {};
export const unregisterDevice = async (): Promise<void> => {};
export const ensurePushPermissionAndRegister = async (): Promise<boolean> =>
  true;
export const registerTokenRefreshListener = (): (() => void) => () => {};
export const registerPushTapHandlers =
  (_getNavRef?: unknown): (() => void) =>
  () => {};
