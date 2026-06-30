import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './navigationRef';
import { track } from '../services/analytics';
import { createAppStack } from './createStack';
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
import { PersonalizationSettingsScreen } from '../screens/settings/PersonalizationSettingsScreen';
import { PrivacySettingsScreen } from '../screens/settings/PrivacySettingsScreen';
import { AboutSettingsScreen } from '../screens/settings/AboutSettingsScreen';
import { FavouriteScreen } from '../screens/FavouriteScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { FeedbackScreen } from '../screens/FeedbackScreen';
import { SeeThisOnMeScreen } from '../screens/see-this-on-me/SeeThisOnMeScreen';
import { AppStackParamList } from '../types/navigation';
import { DatabaseScreen } from '../screens/DatabaseScreen';
import { OutfitCanvasScreen } from '../screens/OutfitCanvasScreen';
import { MyCreationsScreen } from '../screens/MyCreationsScreen';
import { DesignSystemScreen } from '../screens/DesignSystemScreen';
import { LegalDocumentScreen } from '../screens/legal/LegalDocumentScreen';
import { registerDeepLinkListeners } from '../services/deepLinkHandler';
import {
  registerPushTapHandlers,
  registerTokenRefreshListener,
} from '../services/notificationService';
import {
  getPendingNavIntent,
  setPendingNavIntent,
} from '../services/reviewOverrides';

const Stack = createAppStack<AppStackParamList>();

export const AppNavigator = () => {
  useEffect(() => {
    // Register Linking listeners for the verify-email and reset-password deep
    // links, driving them through the shared navigationRef (also used by the
    // root-level push-drawer menu, which renders outside the container).
    const unregisterLinks = registerDeepLinkListeners(
      () => navigationRef.current,
    );
    // Push notification taps (cold-start / background) route through the same
    // navigationRef; token-refresh re-registers the device so the backend never
    // holds a stale FCM token.
    const unregisterTaps = registerPushTapHandlers(() => navigationRef.current);
    const unregisterRefresh = registerTokenRefreshListener();
    return () => {
      unregisterLinks();
      unregisterTaps();
      unregisterRefresh();
    };
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

  // Web-review only: once the navigator is ready, jump to the screen a shared
  // `?screen=` link requested. Cleared after the first apply so it never fights
  // later user navigation. No-op outside the sandbox — the intent is only ever
  // set from the web entry (index.web.tsx).
  const applyPendingScreenIntent = () => {
    const intent = getPendingNavIntent();
    if (!intent || !navigationRef.isReady()) {
      return;
    }
    setPendingNavIntent(null);
    // Loose cast: the target name is dynamic (resolved from the share
    // registry), so we bypass the per-route param typing here.
    const navigate = navigationRef.navigate as unknown as (
      name: string,
      params?: object,
    ) => void;
    if (intent.kind === 'auth') {
      navigate('Auth', { screen: intent.name });
    } else {
      navigate(intent.name);
    }
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
      onReady={() => {
        applyPendingScreenIntent();
        handleNavStateChange();
      }}
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
              {/* Root destinations reached from the sidebar drawer — these are
                  where the user starts exploring, not steps in a back-stack, so
                  the iOS swipe-right-to-go-back gesture is disabled on them
                  (OutfitCanvas below is likewise disabled). */}
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ gestureEnabled: false }}
              />
              {/* Settings sub-pages — pushed drill-downs (back chevron +
                  swipe-back enabled, since they ARE in a back-stack). */}
              <Stack.Screen
                name="PersonalizationSettings"
                component={PersonalizationSettingsScreen}
              />
              <Stack.Screen
                name="PrivacySettings"
                component={PrivacySettingsScreen}
              />
              <Stack.Screen
                name="AboutSettings"
                component={AboutSettingsScreen}
              />
              {/* Personalization retake. The onboarding step screens + the
                  completed/review screen are shared with the first-login stack;
                  here they run in `flow:'retake'` (step screens disable
                  swipe-back — exit is guarded by an explicit discard confirm). */}
              <Stack.Screen
                name="OnboardingCompleted"
                component={OnboardingCompletedScreen}
              />
              <Stack.Screen
                name="OnboardingWardrobe"
                component={OnboardingWardrobeScreen}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen
                name="OnboardingFit"
                component={OnboardingFitScreen}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen
                name="OnboardingStyles"
                component={OnboardingStylesScreen}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen
                name="Wardrobe"
                component={WardrobeScreen}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen name="Favourite" component={FavouriteScreen} />
              <Stack.Screen
                name="Schedule"
                component={ScheduleScreen}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen
                name="Feedback"
                component={FeedbackScreen}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen name="Body" component={BodyScreen} />
              <Stack.Screen
                name="SeeThisOnMe"
                component={SeeThisOnMeScreen}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen
                name="ItemDetail"
                component={ItemDetailScreen}
                options={{ presentation: 'modal' }}
              />
              <Stack.Screen name="Database" component={DatabaseScreen} />
              <Stack.Screen
                name="OutfitCanvas"
                component={OutfitCanvasScreen}
                options={{ gestureEnabled: false }}
              />
              <Stack.Screen name="MyCreations" component={MyCreationsScreen} />
              {/* __DEV__-only Design System reference screen. Registering it
                  unconditionally is harmless — the only entry point (Settings
                  "Version" row) is itself __DEV__-gated, so prod users can't
                  reach it. */}
              <Stack.Screen
                name="DesignSystem"
                component={DesignSystemScreen}
              />
              {/* In-app Terms / Privacy — App Store blocker B5. Reached from
                  Settings while authenticated. */}
              <Stack.Screen
                name="LegalDocument"
                component={LegalDocumentScreen}
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
