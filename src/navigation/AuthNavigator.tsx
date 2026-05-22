/**
 * AU-242 — UAC v2 auth stack.
 *
 * Phase 04 integration: placeholder screen bodies created by the
 * foundation commit are now replaced 1:1 with the real screen
 * components landed in batches B/C/D. Route names, param shapes
 * (in `types/navigation.ts`), and the legacy `Login` / `Register`
 * fallback path are unchanged so the feature flag still works.
 *
 * Real screens by batch:
 *   - Batch B (signup primary): Welcome, EmailInput, PasswordCreation,
 *                                VerifyEmail, Verified
 *   - Batch C (signin):          SignIn, EmailGoogleNotice
 *   - Batch D (reset + lang):    LanguageSettings, ForgotPasswordRequest,
 *                                ForgotPasswordCheckMail, ResetNewPassword
 *
 * The legacy `Login` / `Register` routes are still registered behind
 * `UAC_V2_ENABLED=false`. Cleanup phase will delete them once the
 * flag is permanently on.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { AuthStackParamList } from '../types/navigation';
import { UAC_V2_ENABLED } from '../config/featureFlags';

// UAC v2 screens — wired post-phase-04 integration.
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { LanguageSettingsScreen } from '../screens/auth/LanguageSettingsScreen';
import { EmailInputScreen } from '../screens/auth/EmailInputScreen';
import { PasswordCreationScreen } from '../screens/auth/PasswordCreationScreen';
import { VerifyEmailScreen } from '../screens/auth/VerifyEmailScreen';
import { EmailGoogleNoticeScreen } from '../screens/auth/EmailGoogleNoticeScreen';
import { SignInScreen } from '../screens/auth/SignInScreen';
import { ForgotPasswordRequestScreen } from '../screens/auth/ForgotPasswordRequestScreen';
import { ForgotPasswordCheckMailScreen } from '../screens/auth/ForgotPasswordCheckMailScreen';
import { ResetNewPasswordScreen } from '../screens/auth/ResetNewPasswordScreen';
import { VerifiedScreen } from '../screens/auth/VerifiedScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  const initialRoute: keyof AuthStackParamList = UAC_V2_ENABLED
    ? 'Welcome'
    : 'Login';

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {UAC_V2_ENABLED ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen
            name="LanguageSettings"
            component={LanguageSettingsScreen}
          />
          <Stack.Screen name="EmailInput" component={EmailInputScreen} />
          <Stack.Screen
            name="PasswordCreation"
            component={PasswordCreationScreen}
          />
          <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          <Stack.Screen
            name="EmailGoogleNotice"
            component={EmailGoogleNoticeScreen}
          />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen
            name="ForgotPasswordRequest"
            component={ForgotPasswordRequestScreen}
          />
          <Stack.Screen
            name="ForgotPasswordCheckMail"
            component={ForgotPasswordCheckMailScreen}
          />
          <Stack.Screen
            name="ResetNewPassword"
            component={ResetNewPasswordScreen}
          />
          <Stack.Screen name="Verified" component={VerifiedScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};
