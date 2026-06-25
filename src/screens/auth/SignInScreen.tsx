/**
 * AU-242 Phase 04 batch C — Sign-In screen (returning user, "welcomeback").
 *
 * Spec: `plans/260521-2335-au-242-figma-spec/09-signin.md` (node 2849:10462).
 *
 * Flow:
 *   - EmailInput (signin mode) → emailPrecheck →
 *     - password account  → SignIn (this screen)
 *     - google linked     → EmailGoogleNotice (sibling screen in this batch)
 *   - SignIn submits password against /api/login (useLoginMutation).
 *
 * Error branching (per `useLoginMutation` + AuthErrorEnvelope):
 *   - `INVALID_CREDENTIALS` (401/403) → inline error under password field,
 *     password field highlighted with `uacTextDangerBase` border.
 *   - `EMAIL_NOT_VERIFIED` (403, structured detail.email) → navigate
 *     `VerifyEmail` with email param.
 *   - `OAUTH_ACCOUNT` (403, structured detail.provider) → navigate
 *     `EmailGoogleNotice` with email param. (We only show this for
 *     google today; apple is a future surface.)
 *   - `RATE_LIMITED` → inline rate-limit copy.
 *   - everything else → inline generic copy.
 *
 * Visual fidelity:
 *   - Pre-filled email field is M3 filled variant (gray bg, no border) —
 *     disabled visual.
 *   - Password field is M3 outlined (border, transparent bg) — enabled.
 *   - Eye toggle uses a lightweight glyph (no icon asset shipped yet —
 *     see open question in batch report).
 *   - Submit affordance is an icon-only 56×57 circular button using
 *     ChevronLeft asset rotated 180° per the Figma asset reuse note.
 *
 * `testID` discipline (Maestro):
 *   - signin-back
 *   - signin-email-readonly
 *   - signin-password-input
 *   - signin-password-toggle
 *   - signin-submit
 *   - signin-forgot-link
 *   - signin-error  (state-driven: only present when error visible)
 */
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { theme } from '../../theme/theme';
import { MButton, MInput } from '../../components/design-system/lib';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { useLoginMutation } from '../../hooks/auth/useAuthMutations';
import { track } from '../../services/analytics';
import {
  isEmailNotVerifiedError,
  isOAuthAccountError,
  type AuthErrorEnvelope,
} from '../../services/authTypes';
import type { AuthStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

export const SignInScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { email } = route.params;

  const [password, setPassword] = useState('');
  const [inlineError, setInlineError] = useState<string | null>(null);

  const loginMutation = useLoginMutation();
  const { refreshUser, markSignInCompletion } = useAuth();
  const submitting = loginMutation.isPending;
  const canSubmit = password.length > 0 && !submitting;

  const tr = useMemo(
    () =>
      ({
        sectionHeading: t('uac.signin.section_heading'),
        forgotLink: t('uac.signin.forgot_link'),
        submitA11y: t('uac.signin.submit_a11y'),
        showPassword: t('uac.signin.show_password'),
        hidePassword: t('uac.signin.hide_password'),
        errorInvalid: t('uac.signin.error_invalid_credentials'),
        errorEmailNotVerified: t('uac.signin.error_email_not_verified'),
        errorOauthAccount: t('uac.signin.error_oauth_account', {
          provider: 'Google',
        }),
        errorRateLimited: t('uac.signin.error_rate_limited'),
        errorGeneric: t('uac.signin.error_generic'),
        passwordPlaceholder: t('uac.signin.password_placeholder'),
      } as const),
    [t],
  );

  const handleError = (err: AuthErrorEnvelope) => {
    // OAuth-linked email → reroute to the EmailGoogleNotice screen.
    if (isOAuthAccountError(err) && err.detail.provider === 'google') {
      navigation.navigate('EmailGoogleNotice', { email });
      return;
    }
    // Unverified email → push the user to the verify screen.
    if (isEmailNotVerifiedError(err)) {
      navigation.navigate('VerifyEmail', { email: err.detail.email });
      return;
    }
    // Everything else → inline error message under the password field.
    if (err.code === 'INVALID_CREDENTIALS') {
      setInlineError(tr.errorInvalid);
      return;
    }
    if (err.code === 'RATE_LIMITED') {
      setInlineError(tr.errorRateLimited);
      return;
    }
    setInlineError(tr.errorGeneric);
  };

  const onSubmit = () => {
    if (!canSubmit) return;
    setInlineError(null);
    track('sign_in_started', { method: 'email' });
    loginMutation.mutate(
      { email, password },
      {
        onError: err => {
          track('sign_in_failed', {
            method: 'email',
            error_reason: (err.code || 'unknown').toLowerCase(),
          });
          handleError(err);
        },
        onSuccess: () => {
          // Tokens persisted by loginWithPassword; trigger AuthContext to
          // re-fetch the user so AppNavigator switches to the AppStack.
          // Flag the upcoming identity transition so the identity
          // effect emits `sign_in_completed` (method=email) AFTER
          // identify() resolves.
          markSignInCompletion('email');
          void refreshUser();
        },
      },
    );
  };

  const onForgotPress = () => {
    navigation.navigate('ForgotPasswordRequest', { email });
  };

  const onBackPress = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <SafeAreaView
      style={styles.screen}
      edges={['top', 'bottom']}
      testID="signin-screen"
    >
      {/* Canonical auth header — shared back glyph + safe-area row. */}
      <AuthHeader onBack={onBackPress} backTestID="signin-back" />

      <KeyboardAvoidingView
        style={styles.kbAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionHeading} testID="signin-heading">
            {tr.sectionHeading}
          </Text>

          {/* Read-only email field — M3 filled variant. */}
          <View style={styles.emailField}>
            <Text
              style={styles.emailValue}
              numberOfLines={1}
              testID="signin-email-readonly"
            >
              {email}
            </Text>
          </View>

          {/* Password — DS field with built-in eye toggle. */}
          <MInput
            value={password}
            onChangeText={next => {
              setPassword(next);
              if (inlineError) setInlineError(null);
            }}
            placeholder={tr.passwordPlaceholder}
            accessibilityLabel={tr.passwordPlaceholder}
            secureTextEntry
            showPasswordLabel={tr.showPassword}
            hidePasswordLabel={tr.hidePassword}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={onSubmit}
            testID="signin-password-input"
            editable={!submitting}
          />

          {inlineError ? (
            <Text style={styles.errorText} testID="signin-error">
              {inlineError}
            </Text>
          ) : null}

          {/* Full-width CTA below the field (replaces the circular arrow). */}
          <View style={styles.ctaBlock}>
            <MButton
              onPress={onSubmit}
              disabled={!canSubmit}
              loading={submitting}
              accessibilityLabel={tr.submitA11y}
              testID="signin-submit"
            >
              {tr.submitA11y}
            </MButton>
          </View>

          <Pressable
            onPress={onForgotPress}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel={tr.forgotLink}
            testID="signin-forgot-link"
            style={styles.forgotWrapper}
          >
            <Text style={styles.forgotLink}>{tr.forgotLink}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const FIELD_HEIGHT = 56;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.uacBackgroundNeutralSubtlest,
  },
  kbAvoider: {
    flex: 1,
  },
  body: {
    paddingTop: theme.spacing.uacDimension8,
    paddingHorizontal: theme.spacing.uacBodyPadding,
    paddingBottom: theme.spacing.uacDimension24,
  },
  sectionHeading: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
    paddingVertical: theme.spacing.uacDimension4,
    marginBottom: theme.spacing.uacDimension16,
  },
  emailField: {
    height: FIELD_HEIGHT,
    paddingHorizontal: theme.spacing.uacDimension16,
    backgroundColor: theme.colors.uacColorNeutral100,
    borderRadius: theme.borderRadius.uacTextField,
    justifyContent: 'center',
    marginBottom: theme.spacing.uacDimension16,
  },
  emailValue: {
    ...theme.typography.aliases.uacM3BodyLarge,
    color: theme.colors.uacTextSubtle100,
  },
  ctaBlock: {
    marginTop: theme.spacing.uacDimension16,
  },
  errorText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextDangerBase,
    marginTop: theme.spacing.uacDimension8,
  },
  forgotWrapper: {
    alignSelf: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.uacDimension16,
  },
  forgotLink: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextInfoBase,
    textAlign: 'center',
  },
});

export default SignInScreen;
