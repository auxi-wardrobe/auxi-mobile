/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import { FlagProvider } from '@unleash/unleash-react-native-sdk';
import { unleashClient } from './src/services/feature-flags';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SidebarProvider } from './src/context/SidebarContext';
import { FavouritesSeenProvider } from './src/context/FavouritesSeenContext';
import { CreationsSeenProvider } from './src/context/CreationsSeenContext';
import { ScheduleProvider } from './src/context/ScheduleContext';
import { WardrobeViewedProvider } from './src/context/WardrobeViewedContext';
import { RootDrawer } from './src/components/layout/RootDrawer';
import { BackgroundScaleProvider } from './src/context/BackgroundScaleContext';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { MToastHost } from './src/components/design-system/lib';
import { initI18n } from './src/i18n/init';
import { theme } from './src/theme/theme';
import { configureGoogleSignIn } from './src/services/oauth/googleSignIn';
import { grantAnalyticsConsent, initAnalytics } from './src/services/analytics';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays "fresh" for 60s so revisiting a screen serves cache instead
      // of refetching on every mount/focus. Per-query staleTime still overrides.
      staleTime: 60_000,
      retry: 1,
    },
  },
});

// Configure the Google Sign-In SDK once at module-load. Idempotent; the
// wrapper guards against double-configure. Apple's SDK is stateless and
// needs no startup hook.
configureGoogleSignIn();

// Bring analytics up. Production honours stored consent — the SDK stays inert
// until the user opts in via Settings → Privacy control. Dev auto-grants so
// events reach the dev Mixpanel project without a consent gesture; note this
// re-grants on every dev restart, overriding a revoke made via the Settings
// toggle within the same dev session. Fire-and-forget either way.
if (__DEV__) {
  grantAnalyticsConsent().catch(err =>
    console.warn('[App] analytics init failed', err),
  );
} else {
  initAnalytics().catch(err =>
    console.warn('[App] analytics init failed', err),
  );
}

function App() {
  // i18next must finish initialising before any screen renders, otherwise
  // `t(...)` returns bare keys until the locale resources land.
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    initI18n()
      .catch(err => {
        console.warn('[App] i18n init failed', err);
      })
      .finally(() => {
        if (mounted) setI18nReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!i18nReady) {
    return (
      <View style={styles.bootstrap}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {/* Unleash feature flags. Placed just inside AuthProvider so the
                whole navigator subtree can read flags via useFeatureFlag, and
                AppNavigator's useUnleashForegroundRefresh runs under it. The
                client is a singleton constructed in services/feature-flags. */}
            <FlagProvider unleashClient={unleashClient}>
              <FavouritesSeenProvider>
                <CreationsSeenProvider>
                  <ScheduleProvider>
                    <WardrobeViewedProvider>
                      <SidebarProvider>
                        {/* Root error boundary — placed inside the providers so the
                            fallback has theme/i18n available, and high enough to catch
                            an unexpected render error anywhere in the navigator tree
                            (recoverable fallback instead of a white screen on review). */}
                        <ErrorBoundary>
                          <BackgroundScaleProvider>
                            <RootDrawer>
                              <AppNavigator />
                            </RootDrawer>
                          </BackgroundScaleProvider>
                        </ErrorBoundary>
                      </SidebarProvider>
                    </WardrobeViewedProvider>
                  </ScheduleProvider>
                </CreationsSeenProvider>
              </FavouritesSeenProvider>
            </FlagProvider>
          </AuthProvider>
        </QueryClientProvider>
        {/* Top-most inside SafeAreaProvider so toasts overlay the navigator and
            all overlays/drawers. Renders nothing until a toast is fired. */}
        <MToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  bootstrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  gestureRoot: {
    flex: 1,
  },
});

export default App;
