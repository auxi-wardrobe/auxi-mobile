import React, { useEffect, useRef } from 'react';
import {
  NavigationContainer,
  type NavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthNavigator } from './AuthNavigator';
import { HomeScreen } from '../screens/HomeScreen';
import { AppWelcomeScreen } from '../screens/AppWelcomeScreen';
import { ItemDetailScreen } from '../screens/ItemDetailScreen';
import { GenderPreferenceScreen } from '../screens/GenderPreferenceScreen';
import { StylePreferenceScreen } from '../screens/StylePreferenceScreen';
import { StylePickerScreen } from '../screens/StylePickerScreen';
import { LocationPermissionScreen } from '../screens/LocationPermissionScreen';
import { OnboardingWardrobeScreen } from '../onboarding/v2/OnboardingWardrobeScreen';
import { OnboardingFitScreen } from '../onboarding/v2/OnboardingFitScreen';
import { OnboardingStylesScreen } from '../onboarding/v2/OnboardingStylesScreen';
import { OnboardingLoadingScreen } from '../onboarding/v2/OnboardingLoadingScreen';
import { OnboardingCompletedScreen } from '../onboarding/v2/OnboardingCompletedScreen';
import { OnboardingOutroScreen } from '../onboarding/v2/OnboardingOutroScreen';
import { ONBOARDING_V2_ENABLED } from '../config/featureFlags';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native'; // Import View and StyleSheet
import { theme } from '../theme/theme';
import { WardrobeScreen } from '../screens/WardrobeScreen';
import { BodyScreen } from '../screens/BodyScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AppStackParamList } from '../types/navigation';
import { DatabaseScreen } from '../screens/DatabaseScreen';
import { OutfitCanvasScreen } from '../screens/OutfitCanvasScreen';
import { registerDeepLinkListeners } from '../services/deepLinkHandler';

const Stack = createNativeStackNavigator<AppStackParamList>();

export const AppNavigator = () => {
  // Ref to the NavigationContainer so deepLinkHandler can navigate
  // imperatively in response to Linking events.
  const navRef = useRef<NavigationContainerRef<AppStackParamList> | null>(null);

  useEffect(() => {
    // Register Linking listeners for the verify-email and
    // reset-password deep links. The handler uses the same
    // AppStackParamList shape exposed here.
    const unregister = registerDeepLinkListeners(() => navRef.current);
    return unregister;
  }, []);
  const { user, isLoading, forceOnboarding } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // `forceOnboarding` is a dev-only client override (see AuthContext)
          // that re-shows the Onboarding stack after first completion so QA
          // can replay onboarding without a new account. It is cleared by
          // completeOnboarding() on real completion.
          user.is_first_login || forceOnboarding ? (
            <>
              {/* Welcome + LocationPermission are shared by both onboarding
                  flows (D9 keeps this order). The middle steps switch on
                  ONBOARDING_V2_ENABLED: V2 redesign routes when ON, legacy
                  V05 routes when OFF (instant rollback by flipping the flag). */}
              <Stack.Screen name="Welcome" component={AppWelcomeScreen} />
              <Stack.Screen
                name="LocationPermission"
                component={LocationPermissionScreen}
              />
              {ONBOARDING_V2_ENABLED ? (
                <>
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
                  <Stack.Screen
                    name="GenderPreference"
                    component={GenderPreferenceScreen}
                  />
                  <Stack.Screen
                    name="StylePreference"
                    component={StylePreferenceScreen}
                  />
                  <Stack.Screen
                    name="StylePicker"
                    component={StylePickerScreen}
                  />
                </>
              )}
            </>
          ) : (
            <>
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="Wardrobe" component={WardrobeScreen} />
              <Stack.Screen name="Body" component={BodyScreen} />
              <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
              <Stack.Screen name="Database" component={DatabaseScreen} />
              <Stack.Screen
                name="OutfitCanvas"
                component={OutfitCanvasScreen}
                options={{ gestureEnabled: false }}
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
