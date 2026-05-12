/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { initSentry, Sentry } from './src/services/sentry';
import App from './App';
import { name as appName } from './app.json';

// Initialise Sentry as early as possible so errors during App import / first
// render are captured. `Sentry.wrap` enables performance instrumentation and
// touch tracking on the root component.
initSentry();

AppRegistry.registerComponent(appName, () => Sentry.wrap(App));
