const noop: any = () => undefined;
export const init = noop;
export const captureException = noop;
export const captureMessage = noop;
export const addBreadcrumb = noop;
export const setUser = noop;
export const setTag = noop;
export const setTags = noop;
export const setContext = noop;
export const setExtra = noop;
export const wrap = (c: any) => c;
export const withScope = (cb: any) =>
  cb({ setTag: noop, setTags: noop, setContext: noop, setLevel: noop, setExtra: noop });
export const flush = async () => true;
export const close = async () => true;
export class ReactNativeTracing {}
export class ReactNavigationInstrumentation {}
export const reactNavigationIntegration = () => ({ registerNavigationContainer: noop });
export const mobileReplayIntegration = () => ({});
export const reactNativeTracingIntegration = () => ({});
export const getCurrentScope = () => ({ setTag: noop, setUser: noop, setContext: noop });
export default {
  init, captureException, captureMessage, addBreadcrumb, setUser, setTag,
  setTags, setContext, setExtra, wrap, withScope, flush, close,
  ReactNativeTracing, ReactNavigationInstrumentation, reactNavigationIntegration,
  mobileReplayIntegration, reactNativeTracingIntegration, getCurrentScope,
};
