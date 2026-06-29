/* eslint-env jest */
// notificationService — device-token lifecycle. Mocks @react-native-firebase
// messaging, apiClient, the analytics helpers, and react-native-localize so the
// pure register/unregister logic is asserted without a native runtime.

const mockRequestPermission = jest.fn();
const mockGetToken = jest.fn();
const mockRegisterRemote = jest.fn().mockResolvedValue(undefined);

jest.mock('@react-native-firebase/messaging', () => {
  const messaging = () => ({
    requestPermission: mockRequestPermission,
    registerDeviceForRemoteMessages: mockRegisterRemote,
    getToken: mockGetToken,
    onTokenRefresh: jest.fn(() => () => {}),
  });
  messaging.AuthorizationStatus = {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  };
  return { __esModule: true, default: messaging };
});

const mockPost = jest.fn().mockResolvedValue({ data: { ok: true } });
const mockDelete = jest.fn().mockResolvedValue({ data: { ok: true } });
jest.mock('../apiClient', () => ({
  apiClient: { post: mockPost, delete: mockDelete },
}));

const mockTrackRequested = jest.fn();
const mockTrackGranted = jest.fn();
const mockTrackDenied = jest.fn();
const mockTrackRegistered = jest.fn();
jest.mock('../analytics', () => ({
  trackPushPermissionRequested: mockTrackRequested,
  trackPushPermissionGranted: mockTrackGranted,
  trackPushPermissionDenied: mockTrackDenied,
  trackDeviceTokenRegistered: mockTrackRegistered,
  trackPushReceived: jest.fn(),
  trackPushOpened: jest.fn(),
}));

jest.mock('react-native-localize', () => ({
  getTimeZone: () => 'Asia/Saigon',
  getLocales: () => [{ languageCode: 'en', countryCode: 'US', languageTag: 'en-US' }],
}));

import {
  registerDeviceForPush,
  unregisterDevice,
  ensurePushPermissionAndRegister,
} from '../notificationService';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetToken.mockResolvedValue('fcm-tok-1');
});

describe('registerDeviceForPush — granted path', () => {
  it('requests permission, gets the token, and POSTs device context', async () => {
    mockRequestPermission.mockResolvedValueOnce(1); // AUTHORIZED
    await registerDeviceForPush();

    expect(mockTrackRequested).toHaveBeenCalledTimes(1);
    expect(mockTrackGranted).toHaveBeenCalledTimes(1);
    expect(mockTrackDenied).not.toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledWith('/notifications/device-token', {
      token: 'fcm-tok-1',
      platform: 'ios', // jest RN preset Platform.OS
      timezone: 'Asia/Saigon',
      app_version: expect.any(String),
    });
    expect(mockTrackRegistered).toHaveBeenCalledTimes(1);
  });
});

describe('registerDeviceForPush — denied path', () => {
  it('does NOT fetch a token or POST when permission is denied', async () => {
    mockRequestPermission.mockResolvedValueOnce(0); // DENIED
    await registerDeviceForPush();

    expect(mockTrackRequested).toHaveBeenCalledTimes(1);
    expect(mockTrackDenied).toHaveBeenCalledTimes(1);
    expect(mockTrackGranted).not.toHaveBeenCalled();
    expect(mockGetToken).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockTrackRegistered).not.toHaveBeenCalled();
  });
});

describe('ensurePushPermissionAndRegister — Settings path', () => {
  it('returns true and registers when granted (provisional counts)', async () => {
    mockRequestPermission.mockResolvedValueOnce(2); // PROVISIONAL
    await expect(ensurePushPermissionAndRegister()).resolves.toBe(true);
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('returns false and does not register when denied', async () => {
    mockRequestPermission.mockResolvedValueOnce(0); // DENIED
    await expect(ensurePushPermissionAndRegister()).resolves.toBe(false);
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('unregisterDevice', () => {
  it('DELETEs the current token (user-scoped) on logout', async () => {
    await unregisterDevice();
    expect(mockDelete).toHaveBeenCalledWith('/notifications/device-token', {
      data: { token: 'fcm-tok-1' },
    });
  });

  it('no-ops (no throw) when no token is available', async () => {
    mockGetToken.mockResolvedValueOnce('');
    await expect(unregisterDevice()).resolves.toBeUndefined();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
