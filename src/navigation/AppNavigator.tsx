import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './navigationRef';
import { track } from '../services/analytics';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthNavigator } from './AuthNavigator';
import { HomeScreen } from '../screens/HomeScreen';
import { AppWelcomeScreen } from '../screens/AppWelcomeScreen';
import { ItemDetailScreen } from '../screens/ItemDetailScreen';
import { LocationPermissionScreen } from '../screens/LocationPermissionScreen';
import { OnboardingWardrobeScreen } from '../onboarding/v2/OnboardingWardrobeScreen';
import { OnboardingFitScreen } from '../onboarding/v2/OnboardingFitScreen';
import { OnboardingStylesScreen } from '../onboarding/v2/OnboardingStylesScreen';
import { OnboardingLoadingScreen } from '../onboarding/v2/OnboardingLoadingScreen';
import { OnboardingCompletedScreen } from '../onboarding/v2/OnboardingCompletedScreen';
import { OnboardingOutroScreen } from '../onboarding/v2/OnboardingOutroScreen';
import { useAuth } from '../context/AuthContext';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';
import { MacgieLoader } from '../components/macgie';
import { WardrobeScreen } from '../screens/WardrobeScreen';
import { BodyScreen } from '../screens/BodyScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { FavouriteScreen } from '../screens/FavouriteScreen';
import { FeedbackScreen } from '../screens/FeedbackScreen';
import { SeeThisOnMeScreen } from '../screens/see-this-on-me/SeeThisOnMeScreen';
import { AppStackParamList } from '../types/navigation';
import { DatabaseScreen } from '../screens/DatabaseScreen';
import { OutfitCanvasScreen } from '../screens/OutfitCanvasScreen';
import { DesignSystemScreen } from '../screens/DesignSystemScreen';
import { registerDeepLinkListeners } from '../services/deepLinkHandler';
import { useUnleashForegroundRefresh } from '../hooks/useUnleashForegroundRefresh';

const Stack = createNativeStackNavigator<AppStackParamList>();

export const AppNavigator = () => {
  // Force a flag re-fetch on app foreground (in addition to interval polling).
  // Mounted once here — AppNavigator renders under FlagProvider (see App.tsx).
  useUnleashForegroundRefresh();

  useEffect(() => {
    // Register Linking listeners for the verify-email and reset-password deep
    // links, driving them through the shared navigationRef (also used by the
    // root-level push-drawer menu, which renders outside the container).
    const unregister = registerDeepLinkListeners(() => navigationRef.current);
    return unregister;
  }, []);
  const { user, isLoading } = useAuth();

  // Analytics §3.8 #56 — screen_viewed. Single global listener on
  // NavigationContainer.onStateChange resolves the current route name from the
  // shared navigationRef and fires once per route NAME change. Param-only
  // updates are skipped (same name → no event), `OnboardingLoading` is skipped
  // as a transient (~2s), and identical consecutive screen_name within 500ms
  // is debounced defensively.
  const lastRouteRef = useRef<string | undefined>(undefined);
  const lastFireRef = useRef<number>(0);
  const handleNavStateChange = () => {
    const current = navigationRef.current?.getCurrentRoute()?.name;
    if (!current) {
      return;
    }
    if (current === 'OnboardingLoading') {
      return;
    }
    if (current === lastRouteRef.current) {
      return;
    }
    const now = Date.now();
    if (now - lastFireRef.current < 500) {
      return;
    }
    lastFireRef.current = now;
    const previous = lastRouteRef.current;
    lastRouteRef.current = current;
    track('screen_viewed', {
      screen_name: current,
      ...(previous ? { previous_screen_name: previous } : {}),
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <MacgieLoader testID="app-boot-macgie" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={handleNavStateChange}
      onStateChange={handleNavStateChange}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          user.is_first_login ? (
            <>
              {/* Welcome → LocationPermission → V2 onboarding (Wardrobe →
                  Fit → Styles → Loading → Completed → Outro). */}
              <Stack.Screen name="Welcome" component={AppWelcomeScreen} />
              <Stack.Screen
                name="LocationPermission"
                component={LocationPermissionScreen}
              />
              <Stack.Screen
                name="OnboardingWardrobe"
                component={OnboardingWardrobeScreen}
              />
              <Stack.Screen
                name="OnboardingFit"
                component={OnboardingFitScreen}
              />
              <Stack.Screen
                name="OnboardingStyles"
                component={OnboardingStylesScreen}
              />
              <Stack.Screen
                name="OnboardingLoading"
                component={OnboardingLoadingScreen}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen
                name="OnboardingCompleted"
                component={OnboardingCompletedScreen}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen
                name="OnboardingOutro"
                component={OnboardingOutroScreen}
              />
            </>
          ) : (
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Wardrobe" component={WardrobeScreen} />
              <Stack.Screen name="Favourite" component={FavouriteScreen} />
              <Stack.Screen name="Feedback" component={FeedbackScreen} />
              <Stack.Screen name="Body" component={BodyScreen} />
              <Stack.Screen
                name="SeeThisOnMe"
                component={SeeThisOnMeScreen}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
              <Stack.Screen name="Database" component={DatabaseScreen} />
              <Stack.Screen
                name="OutfitCanvas"
                component={OutfitCanvasScreen}
                options={{ gestureEnabled: false }}
              />
              {/* __DEV__-only Design System reference screen. Registering it
                  unconditionally is harmless — the only entry point (Settings
                  "Version" row) is itself __DEV__-gated, so prod users can't
                  reach it. */}
              <Stack.Screen
                name="DesignSystem"
                component={DesignSystemScreen}
              />
            </>
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
