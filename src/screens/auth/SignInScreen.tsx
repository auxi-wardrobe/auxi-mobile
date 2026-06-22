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
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { theme } from '../../theme/theme';
import IconChevronLeft from '../../assets/images/icon_chevron_left.svg';
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
  const [passwordVisible, setPasswordVisible] = useState(false);
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

  const passwordBorderColor = inlineError
    ? theme.colors.uacTextDangerBase
    : theme.colors.uacBorderBold200;

  return (
    <View style={styles.screen} testID="signin-screen">
      <View style={styles.header} pointerEvents="box-none">
        <Pressable
          onPress={onBackPress}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('uac.common.back')}
          testID="signin-back"
          style={styles.backHit}
        >
          <IconChevronLeft width={24} height={24} />
        </Pressable>
        <View style={styles.headerTrailingSlot} />
      </View>

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

          {/* Password row — outlined field + circular submit arrow. */}
          <View style={styles.passwordRow}>
            <View
              style={[
                styles.passwordField,
                { borderColor: passwordBorderColor },
              ]}
            >
              <TextInput
                value={password}
                onChangeText={next => {
                  setPassword(next);
                  if (inlineError) setInlineError(null);
                }}
                placeholder={tr.passwordPlaceholder}
                placeholderTextColor={theme.colors.uacTextSubtle200}
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.passwordInput}
                onSubmitEditing={onSubmit}
                returnKeyType="go"
                testID="signin-password-input"
                editable={!submitting}
              />
              <Pressable
                onPress={() => setPasswordVisible(prev => !prev)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={
                  passwordVisible ? tr.hidePassword : tr.showPassword
                }
                testID={
                  passwordVisible
                    ? 'signin-password-toggle-hide'
                    : 'signin-password-toggle-show'
                }
                style={styles.eyeToggle}
              >
                <Text style={styles.eyeGlyph}>
                  {passwordVisible ? tr.hidePassword : tr.showPassword}
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel={tr.submitA11y}
              accessibilityState={{ disabled: !canSubmit, busy: submitting }}
              testID="signin-submit"
              style={({ pressed }) => [
                styles.submitButton,
                !canSubmit && styles.submitButtonDisabled,
                pressed && canSubmit && styles.submitButtonPressed,
              ]}
            >
              <View style={styles.submitArrow}>
                <IconChevronLeft width={24} height={24} />
              </View>
            </Pressable>
          </View>

          {inlineError ? (
            <Text style={styles.errorText} testID="signin-error">
              {inlineError}
            </Text>
          ) : null}

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
    </View>
  );
};

const FIELD_HEIGHT = 56;
const SUBMIT_SIZE = 56;
const BODY_INNER_WIDTH = 360;
const FORGOT_BLOCK_WIDTH = 327;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.uacBackgroundNeutralSubtlest,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: theme.spacing.uacHeaderHeight,
    paddingTop: 45,
    paddingHorizontal: theme.spacing.uacBodyPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: theme.zIndex.sticky,
  },
  backHit: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTrailingSlot: {
    width: 47,
    height: 47,
  },
  kbAvoider: {
    flex: 1,
  },
  body: {
    paddingTop: theme.spacing.uacSafeAreaTop,
    paddingHorizontal: theme.spacing.uacBodyPadding,
    paddingBottom: theme.spacing.uacSafeAreaBottom,
    alignItems: 'center',
  },
  sectionHeading: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
    width: BODY_INNER_WIDTH,
    maxWidth: '100%',
    paddingVertical: theme.spacing.uacDimension4,
    marginBottom: theme.spacing.uacDimension16,
  },
  emailField: {
    width: BODY_INNER_WIDTH,
    maxWidth: '100%',
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
  passwordRow: {
    width: BODY_INNER_WIDTH,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension16,
  },
  passwordField: {
    flex: 1,
    height: FIELD_HEIGHT,
    paddingLeft: theme.spacing.uacDimension16,
    paddingRight: theme.spacing.uacDimension4,
    borderRadius: theme.borderRadius.uacTextField,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.uacBackgroundNeutralSubtlest,
  },
  passwordInput: {
    flex: 1,
    ...theme.typography.aliases.uacM3BodyLarge,
    color: theme.colors.uacTextBase,
    padding: 0,
  },
  eyeToggle: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeGlyph: {
    ...theme.typography.aliases.uacBodyXsMedium,
    color: theme.colors.uacTextSubtle100,
  },
  submitButton: {
    width: SUBMIT_SIZE,
    height: SUBMIT_SIZE,
    borderRadius: SUBMIT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.uacBackgroundBase,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonPressed: {
    opacity: 0.85,
  },
  submitArrow: {
    transform: [{ rotate: '180deg' }],
  },
  errorText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextDangerBase,
    width: BODY_INNER_WIDTH,
    maxWidth: '100%',
    marginTop: theme.spacing.uacDimension8,
  },
  forgotWrapper: {
    width: FORGOT_BLOCK_WIDTH,
    maxWidth: '100%',
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
