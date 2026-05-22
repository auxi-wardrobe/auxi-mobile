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
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { initI18n } from './src/i18n/init';
import { theme } from './src/theme/theme';

const queryClient = new QueryClient();

function App() {
  // i18next must finish initialising before any screen renders, otherwise
  // `t(...)` returns bare keys until the locale resources land.
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    initI18n()
      .catch((err) => {
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
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
        <Toast />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  bootstrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
});

export default App;
