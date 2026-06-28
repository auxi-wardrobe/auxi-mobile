/**
 * AU-242 Phase 04 Batch B — Password creation.
 *
 * Specs: plans/260521-2335-au-242-figma-spec/04-password-creation-typing.md
 *        plans/260521-2335-au-242-figma-spec/05-password-creation-valid.md
 * Figma nodes: 2849:10296 (typing) + 2849:10379 (valid)
 *
 * One screen, two states — internal `password` value drives the 3
 * criteria booleans + submit-enable. No mode prop; the diff between
 * specs 04 and 05 is purely runtime state.
 *
 * Criteria (verbatim from spec):
 *   - At least 8 characters
 *   - Contains a lowercase letter
 *   - Contains a number
 *
 * On submit (`useRegisterMutation`):
 *   - 201 + `verification_required: true` (real/email mode) → cache
 *           `pendingVerifyEmail` and navigate to `VerifyEmail`. The user
 *           verifies via the emailed magic link.
 *   - 201 + `verification_required: false` / `auto_verified: true` (dev
 *           "mock email" mode — account already verified server-side) →
 *           skip VerifyEmail and complete sign-in directly via
 *           `AuthContext.login(...)`, so the AppNavigator `user` gate lands
 *           the user in the app. If that auto-login fails, fall back to
 *           `SignIn` with the email prefilled (never strand / crash).
 *   - 409 EMAIL_ALREADY_EXISTS → navigate `SignIn` with email param.
 *   - 422 WEAK_PASSWORD → inline highlight + i18n error.
 *   - 429 RATE_LIMITED → inline copy.
 *   - NETWORK_ERROR → toast.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from '../../components/design-system/lib';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { theme } from '../../theme/theme';
import { MButton, MInput } from '../../components/design-system/lib';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { useAuth } from '../../context/AuthContext';
import { useRegisterMutation } from '../../hooks/auth/useAuthMutations';
import { track } from '../../services/analytics';
import type { AuthStackParamList } from '../../types/navigation';
import { PasswordCriteriaChecklist } from '../../components/auth/PasswordCriteriaChecklist';
import { validatePassword } from '../../utils/password-rules';

type Navigation = NativeStackNavigationProp<
  AuthStackParamList,
  'PasswordCreation'
>;
type Route = RouteProp<AuthStackParamList, 'PasswordCreation'>;

export const PasswordCreationScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { t } = useTranslation();
  const { setPendingVerifyEmail, login } = useAuth();
  const register = useRegisterMutation();

  const email = route.params?.email ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const criteriaLabels = useMemo(
    () => ({
      length: t('uac.password_creation.criteria_min_chars'),
      lowercase: t('uac.password_creation.criteria_lowercase'),
      digit: t('uac.password_creation.criteria_number'),
    }),
    [t],
  );
  const { isValid: allMet } = useMemo(
    () => validatePassword(password),
    [password],
  );

  const handleChange = useCallback(
    (text: string) => {
      setPassword(text);
      if (error) setError(null);
    },
    [error],
  );

  const handleSubmit = useCallback(() => {
    if (!allMet || register.isPending) return;
    track('sign_up_submitted', { method: 'email' });
    register.mutate(
      { email, password },
      {
        onSuccess: async data => {
          // The backend tells us whether this account still needs email
          // verification. In the real/email flow `verification_required`
          // is true and the user must click the magic link. In dev "mock
          // email" mode the account is already verified at registration
          // (`verification_required: false` / `auto_verified: true`) — in
          // that case we skip the VerifyEmail screen and complete sign-in
          // directly so the user lands in the app.
          const alreadyVerified =
            data.verification_required === false || data.auto_verified === true;

          if (alreadyVerified) {
            // Funnel terminus for the auto-verified branch: the deep-link
            // `sign_up_completed` (services/deepLinkHandler.ts) never fires
            // here because no email arrives, so emit it now to keep the
            // activation funnel intact, plus a branch marker.
            track('sign_up_auto_verified', { method: 'email' });
            track('sign_up_completed', { method: 'email' });
            try {
              // Reuse the existing login path — persists tokens, sets
              // `user`, and lets AuthContext's identity effect emit
              // `sign_in_completed`. AppNavigator's `user` gate then
              // switches to the app/onboarding stack.
              await login({ email, password });
            } catch {
              // Auto-login fell over (e.g. transient network). Don't crash
              // or strand the user on this screen — hand off to SignIn with
              // the email prefilled so they can complete sign-in manually.
              navigation.navigate('SignIn', { email });
            }
            return;
          }

          // Real mode: verification required. Belt-and-braces — ensure
          // VerifyEmail can read this even if AuthContext.register() wasn't
          // the caller (we used the raw mutation here, not the context
          // wrapper).
          setPendingVerifyEmail(email);
          navigation.navigate('VerifyEmail', { email });
        },
        onError: err => {
          track('sign_up_failed', {
            method: 'email',
            error_reason: (err.code || 'unknown').toLowerCase(),
          });
          switch (err.code) {
            case 'EMAIL_ALREADY_EXISTS':
              navigation.navigate('SignIn', { email });
              return;
            case 'WEAK_PASSWORD':
              setError(t('uac.password_creation.error_weak_password'));
              return;
            case 'RATE_LIMITED':
              setError(t('uac.email_input.error_rate_limited'));
              return;
            case 'NETWORK_ERROR':
              toast.show({
                type: 'error',
                text1: t('uac.password_creation.error_generic'),
                position: 'bottom',
              });
              return;
            default:
              setError(err.message || t('uac.password_creation.error_generic'));
          }
        },
      },
    );
  }, [
    allMet,
    email,
    password,
    register,
    navigation,
    setPendingVerifyEmail,
    login,
    t,
  ]);

  const submitDisabled = !allMet || register.isPending;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex1}
      >
        {/* Canonical auth header — shared back glyph + safe-area row. */}
        <AuthHeader
          onBack={() => navigation.goBack()}
          backTestID="password-back-button"
        />

        <View style={styles.bodyContainer}>
          {/* Email label + read-only filled field (specs §1+§2) */}
          <Text style={styles.label} testID="password-email-label">
            {t('uac.password_creation.email_label')}
          </Text>
          <View style={styles.readonlyField}>
            <Text style={styles.readonlyValue} testID="password-email-value">
              {email}
            </Text>
          </View>

          {/* Password — DS field with built-in eye toggle. */}
          <View style={styles.fieldSpacing}>
            <MInput
              testID="password-input-field"
              accessibilityLabel={t('uac.password_creation.password_label')}
              value={password}
              onChangeText={handleChange}
              placeholder={t('uac.password_creation.password_label')}
              secureTextEntry
              showPasswordLabel={t('uac.password_creation.show_password')}
              hidePasswordLabel={t('uac.password_creation.hide_password')}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
          </View>

          {/* Criteria checklist (specs §4) — shared with ResetNewPassword */}
          <View style={styles.criteriaList}>
            <PasswordCriteriaChecklist
              password={password}
              labels={criteriaLabels}
              testIDPrefix="password-criteria"
            />
          </View>

          {error && (
            <Text testID="password-form-error" style={styles.errorText}>
              {error}
            </Text>
          )}

          {/* Full-width CTA below the criteria (replaces the inline chevron). */}
          <View style={styles.ctaWrap}>
            <MButton
              testID="password-submit-button"
              accessibilityLabel={t('uac.password_creation.submit_a11y')}
              onPress={handleSubmit}
              loading={register.isPending}
              disabled={submitDisabled}
            >
              {t('uac.password_creation.submit_a11y')}
            </MButton>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.uacBackgroundNeutralSubtlest,
  },
  flex1: { flex: 1 },
  bodyContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.uacBodyPadding,
  },
  label: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
    paddingVertical: theme.spacing.uacDimension8 + 4,
  },
  readonlyField: {
    height: theme.spacing.uacButtonHeight,
    borderRadius: theme.borderRadius.uacTextField,
    backgroundColor: theme.colors.uacColorNeutral100,
    paddingHorizontal: theme.spacing.uacDimension16,
    justifyContent: 'center',
  },
  readonlyValue: {
    ...theme.typography.aliases.uacM3BodyLarge,
    color: theme.colors.uacTextSubtle100,
  },
  fieldSpacing: {
    marginTop: theme.spacing.uacDimension16,
  },
  ctaWrap: {
    marginTop: theme.spacing.uacDimension24,
  },
  criteriaList: {
    marginTop: theme.spacing.uacDimension16 + 4, // 20px
  },
  errorText: {
    ...theme.typography.aliases.uacM3BodySmall,
    color: theme.colors.uacTextDangerBase,
    marginTop: theme.spacing.uacDimension16,
  },
});
