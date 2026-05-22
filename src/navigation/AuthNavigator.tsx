/**
 * AU-242 — UAC v2 auth stack.
 *
 * Phase 04 foundation (this commit) registers 11 new routes with
 * placeholder screen bodies. Real bodies land in batches B-D:
 *   - Batch B: Welcome, LanguageSettings, EmailInput, PasswordCreation,
 *              VerifyEmail, Verified
 *   - Batch C: SignIn (replaces legacy LoginScreen)
 *   - Batch D: ForgotPasswordRequest, ForgotPasswordCheckMail,
 *              ResetNewPassword, EmailGoogleNotice
 *
 * The legacy `Login` / `Register` routes are still registered behind
 * `UAC_V2_ENABLED=false`, which lets us ship the foundation without
 * exposing half-built screens to users. Flip the flag on in dev to
 * iterate against the new tree.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { AuthStackParamList } from '../types/navigation';
import { UAC_V2_ENABLED } from '../config/featureFlags';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Throwaway placeholder used until phase 04 batches B-D land. Renders
 * the route name so devs can verify routing without committing to a
 * design yet. Replaced 1:1 by real screen components.
 */
const makePlaceholder = (routeName: string) => () =>
  (
    <View style={styles.placeholder} testID={`uac-placeholder-${routeName}`}>
      <Text style={styles.placeholderText}>{routeName} placeholder</Text>
      <Text style={styles.placeholderHint}>
        UAC v2 screen lands in phase 04 batch B/C/D.
      </Text>
    </View>
  );

// TODO(phase-04-batch-B): replace with real WelcomeScreen (spec 01).
const WelcomePlaceholder = makePlaceholder('Welcome');
// TODO(phase-04-batch-B): replace with LanguageSettingsScreen (spec 02).
const LanguageSettingsPlaceholder = makePlaceholder('LanguageSettings');
// TODO(phase-04-batch-B): replace with EmailInputScreen (spec 03 + 08).
const EmailInputPlaceholder = makePlaceholder('EmailInput');
// TODO(phase-04-batch-B): replace with PasswordCreationScreen (spec 04 + 05).
const PasswordCreationPlaceholder = makePlaceholder('PasswordCreation');
// TODO(phase-04-batch-B): replace with VerifyEmailScreen (spec 06).
const VerifyEmailPlaceholder = makePlaceholder('VerifyEmail');
// TODO(phase-04-batch-D): replace with EmailGoogleNoticeScreen (spec 07).
const EmailGoogleNoticePlaceholder = makePlaceholder('EmailGoogleNotice');
// TODO(phase-04-batch-C): replace with SignInScreen (spec 09).
const SignInPlaceholder = makePlaceholder('SignIn');
// TODO(phase-04-batch-D): replace with ForgotPasswordRequestScreen (spec 10).
const ForgotPasswordRequestPlaceholder = makePlaceholder(
  'ForgotPasswordRequest',
);
// TODO(phase-04-batch-D): replace with ForgotPasswordCheckMailScreen (spec 11).
const ForgotPasswordCheckMailPlaceholder = makePlaceholder(
  'ForgotPasswordCheckMail',
);
// TODO(phase-04-batch-D): replace with ResetNewPasswordScreen (spec 12).
const ResetNewPasswordPlaceholder = makePlaceholder('ResetNewPassword');
// TODO(phase-04-batch-B): replace with VerifiedSuccessScreen (spec 13).
const VerifiedPlaceholder = makePlaceholder('Verified');

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
          <Stack.Screen name="Welcome" component={WelcomePlaceholder} />
          <Stack.Screen
            name="LanguageSettings"
            component={LanguageSettingsPlaceholder}
          />
          <Stack.Screen name="EmailInput" component={EmailInputPlaceholder} />
          <Stack.Screen
            name="PasswordCreation"
            component={PasswordCreationPlaceholder}
          />
          <Stack.Screen name="VerifyEmail" component={VerifyEmailPlaceholder} />
          <Stack.Screen
            name="EmailGoogleNotice"
            component={EmailGoogleNoticePlaceholder}
          />
          <Stack.Screen name="SignIn" component={SignInPlaceholder} />
          <Stack.Screen
            name="ForgotPasswordRequest"
            component={ForgotPasswordRequestPlaceholder}
          />
          <Stack.Screen
            name="ForgotPasswordCheckMail"
            component={ForgotPasswordCheckMailPlaceholder}
          />
          <Stack.Screen
            name="ResetNewPassword"
            component={ResetNewPasswordPlaceholder}
          />
          <Stack.Screen name="Verified" component={VerifiedPlaceholder} />
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

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1d1f23',
    marginBottom: 8,
  },
  placeholderHint: {
    fontSize: 12,
    color: '#7a7f89',
    textAlign: 'center',
  },
});
