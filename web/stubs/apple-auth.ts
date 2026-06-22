export const appleAuth = {
  isSupported: false,
  Operation: { LOGIN: 1, REFRESH: 2, LOGOUT: 3, IMPLICIT: 0 },
  Scope: { EMAIL: 0, FULL_NAME: 1 },
  Error: { CANCELED: 1001, FAILED: 1000, INVALID_RESPONSE: 1002 },
  State: { AUTHORIZED: 1 },
  performRequest: async () => ({}),
  getCredentialStateForUser: async () => 0,
  onCredentialRevoked: () => () => undefined,
};
export const AppleButton: any = () => null;
export default { appleAuth, AppleButton };
