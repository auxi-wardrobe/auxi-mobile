export const GoogleSignin = {
  configure: () => undefined,
  hasPlayServices: async () => true,
  signIn: async () => ({ idToken: 'mock', user: {} }),
  signOut: async () => undefined,
  revokeAccess: async () => undefined,
  isSignedIn: async () => false,
  getCurrentUser: () => null,
  getTokens: async () => ({ idToken: 'mock', accessToken: 'mock' }),
};
export const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  SIGN_IN_REQUIRED: 'SIGN_IN_REQUIRED',
};
export const GoogleSigninButton: any = () => null;
export default { GoogleSignin, statusCodes, GoogleSigninButton };
