/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { initSentry, Sentry } from './src/services/sentry';
import App from './App';
import { name as appName } from './app.json';

// Initialise Sentry as early as possible so errors during App import / first
// render are captured. `Sentry.wrap` enables performance instrumentation and
// touch tracking on the root component.
initSentry();

// Background/quit data-message handler. MUST be registered at the top level
// (outside the React tree) or FCM logs a missing-handler warning. The OS
// renders any `notification` payload itself; tap routing for background/quit is
// handled once foregrounded by registerPushTapHandlers. Keep minimal + crash-safe.
messaging().setBackgroundMessageHandler(async () => {});

AppRegistry.registerComponent(appName, () => Sentry.wrap(App));
