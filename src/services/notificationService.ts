// Push device-token lifecycle (Phase 1 of the push-notification system).
// Owns: contextual permission request → FCM token → register with the backend;
// token-refresh re-register; unregister on logout; FCM tap/foreground handlers.
// The ONLY module that talks to @react-native-firebase/messaging.
//
// Web: a no-op stub ships as notificationService.web.ts — RNFirebase is a
// native module with no web binding, and the react-native-web sandbox must
// build (.claude/rules/web-preview-on-system-required.md). Keep the two files'
// public surface identical.

import { Platform } from 'react-native';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import { getTimeZone } from 'react-native-localize';
import type { NavigationContainerRef } from '@react-navigation/native';
import { apiClient } from './apiClient';
import type { AppStackParamList } from '../types/navigation';
import {
  trackPushPermissionRequested,
  trackPushPermissionGranted,
  trackPushPermissionDenied,
  trackDeviceTokenRegistered,
  trackPushReceived,
  trackPushOpened,
} from './analytics';
import { resolveNotificationData } from './deepLinkHandler';

type NavRef = NavigationContainerRef<AppStackParamList>;

// App version for diagnostics. Mirrors SettingsScreen's APP_VERSION constant;
// react-native-device-info is not installed, so this is a hand-maintained
// literal rather than a runtime read.
const APP_VERSION = '0.0.1';

const DEVICE_TOKEN_PATH = '/notifications/device-token';

/** Granted OR provisionally granted both count as "we may send pushes". */
const isPermissionGranted = (
  status: FirebaseMessagingTypes.AuthorizationStatus,
): boolean =>
  status === messaging.AuthorizationStatus.AUTHORIZED ||
  status === messaging.AuthorizationStatus.PROVISIONAL;

/** Request OS permission once; fires the requested/granted/denied events. */
const requestPushPermission = async (): Promise<boolean> => {
  trackPushPermissionRequested();
  const status = await messaging().requestPermission();
  const granted = isPermissionGranted(status);
  if (granted) {
    trackPushPermissionGranted();
  } else {
    trackPushPermissionDenied();
  }
  return granted;
};

/** Fetch the current FCM token and upsert it on the backend (keyed by token). */
const registerCurrentToken = async (): Promise<void> => {
  if (Platform.OS === 'ios') {
    // No-op if already registered; required before getToken on iOS.
    await messaging().registerDeviceForRemoteMessages();
  }
  const token = await messaging().getToken();
  if (!token) {
    return;
  }
  await apiClient.post(DEVICE_TOKEN_PATH, {
    token,
    platform: Platform.OS,
    timezone: getTimeZone(),
    app_version: APP_VERSION,
  });
  trackDeviceTokenRegistered();
};

/**
 * Request permission + register, reporting whether permission ended up
 * granted. The Settings reminder-enable path calls this so the UI can guide
 * the user to OS Settings if they declined. Never throws.
 */
export const ensurePushPermissionAndRegister = async (): Promise<boolean> => {
  try {
    const granted = await requestPushPermission();
    if (!granted) {
      return false;
    }
    await registerCurrentToken();
    return true;
  } catch (err) {
    console.warn('[notificationService] ensurePushPermissionAndRegister', err);
    return false;
  }
};

/**
 * Login path: request permission → FCM token → POST device-token. Idempotent
 * (server upserts on token). Fire-and-forget — never throws.
 */
export const registerDeviceForPush = async (): Promise<void> => {
  await ensurePushPermissionAndRegister();
};

/**
 * Subscribe to FCM token rotation. FCM may rotate a token at any time; re-
 * register so the backend never holds a stale token. Returns an unsubscribe.
 */
export const registerTokenRefreshListener = (): (() => void) =>
  messaging().onTokenRefresh(() => {
    registerCurrentToken().catch(err =>
      console.warn('[notificationService] token-refresh re-register failed', err),
    );
  });

/**
 * Logout: remove this device's token so the signed-out user stops receiving
 * pushes here. DELETE is user-scoped server-side (404 hides ownership). Never
 * throws.
 */
export const unregisterDevice = async (): Promise<void> => {
  try {
    const token = await messaging().getToken();
    if (!token) {
      return;
    }
    await apiClient.delete(DEVICE_TOKEN_PATH, { data: { token } });
  } catch (err) {
    console.warn('[notificationService] unregisterDevice failed', err);
  }
};

/** notification.type rides FCM data; default 'unknown' (no PII). */
const messageType = (
  msg: FirebaseMessagingTypes.RemoteMessage | null,
): string => (msg?.data?.type as string) || 'unknown';

/**
 * Wire FCM tap + foreground handlers (mirrors registerDeepLinkListeners):
 *   - getInitialNotification → cold-start tap (app was quit)
 *   - onNotificationOpenedApp → background tap (app was backgrounded)
 *   - onMessage → foreground delivery (count only; no auto-nav)
 * Caller passes a navRef factory (the nav container mounts asynchronously).
 * Returns an unsubscribe for the warm listeners.
 */
export const registerPushTapHandlers = (
  getNavRef: () => NavRef | null,
): (() => void) => {
  const route = (msg: FirebaseMessagingTypes.RemoteMessage) => {
    trackPushOpened(messageType(msg));
    resolveNotificationData(
      msg.data as Record<string, string> | undefined,
      getNavRef(),
    );
  };

  // Cold start: a tap that launched the app from quit.
  messaging()
    .getInitialNotification()
    .then(msg => {
      if (msg) {
        route(msg);
      }
    })
    .catch(err =>
      console.warn('[notificationService] getInitialNotification failed', err),
    );

  // Background → foreground tap.
  const unsubOpened = messaging().onNotificationOpenedApp(msg => {
    if (msg) {
      route(msg);
    }
  });

  // Foreground delivery: count it; do NOT auto-navigate — the user is already
  // in the app. (A visible in-app banner is a Phase-2 refinement.)
  const unsubForeground = messaging().onMessage(async msg => {
    trackPushReceived(messageType(msg));
  });

  return () => {
    unsubOpened();
    unsubForeground();
  };
};
