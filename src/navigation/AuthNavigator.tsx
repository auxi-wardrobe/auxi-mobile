/**
 * AU-242 — UAC v2 auth stack.
 *
 * The 11-route UAC flow is the only auth experience (the legacy
 * Login/Register fallback was removed once V2 became permanent —
 * MVP stage, no feature flags).
 *
 * Real screens by batch:
 *   - Batch B (signup primary): Welcome, EmailInput, PasswordCreation,
 *                                VerifyEmail, Verified
 *   - Batch C (signin):          SignIn, EmailGoogleNotice
 *   - Batch D (reset + lang):    LanguageSettings, ForgotPasswordRequest,
 *                                ForgotPasswordCheckMail, ResetNewPassword
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthStackParamList } from '../types/navigation';

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
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
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
    </Stack.Navigator>
  );
};
