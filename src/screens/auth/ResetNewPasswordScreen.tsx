/**
 * AU-242 Phase 04 — Batch D · Screen 12 (reset password — set new password).
 *
 * Spec: plans/260521-2335-au-242-figma-spec/12-reset-new-password.md
 *
 * User lands here from the password-reset email's deep link. The token
 * arrives via route params (parsed in `services/deepLinkHandler.ts`).
 * They type a new password, the 3-rule checklist updates live, and the
 * submit chevron enables once all 3 rules pass.
 *
 * Errors:
 *   - TOKEN_INVALID / TOKEN_EXPIRED / TOKEN_CONSUMED → show the token
 *     error panel + "Request new link" CTA → routes back to the
 *     ForgotPasswordRequest screen (per brief).
 *   - WEAK_PASSWORD → inline error + criteria highlight.
 *   - Any other error → generic copy.
 *
 * On success → navigate to `Verified` with `source: 'reset'` so the
 * Verified screen can route the user to SignIn (pre-filled email).
 *
 * Password rule set mirrors PasswordCreation (batch B): ≥8 chars,
 * contains a lowercase letter, contains a number.
 *
 * Self-contained: shares no components with batch B's PasswordCreation
 * to keep the batches mergeable. The 3-rule validator + checklist row
 * are intentionally duplicated here; cleanup phase can extract them.
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
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { useResetPasswordMutation } from '../../hooks/auth/useAuthMutations';
import type { AuthStackParamList } from '../../types/navigation';
import { theme } from '../../theme/theme';

type Navigation = NativeStackNavigationProp<
  AuthStackParamList,
  'ResetNewPassword'
>;
type Route = RouteProp<AuthStackParamList, 'ResetNewPassword'>;

interface PasswordRules {
  minChars: boolean;
  lowercase: boolean;
  number: boolean;
  allValid: boolean;
}

const evaluatePassword = (value: string): PasswordRules => {
  const minChars = value.length >= 8;
  const lowercase = /[a-z]/.test(value);
  const number = /[0-9]/.test(value);
  return {
    minChars,
    lowercase,
    number,
    allValid: minChars && lowercase && number,
  };
};

/**
 * Single checklist row. Pending icon is the subtle outline bullet;
 * satisfied flips to the base-color filled bullet. Per spec we change
 * color, not the icon shape (OQ#7 default).
 */
const CriteriaRow: React.FC<{
  satisfied: boolean;
  label: string;
  testID: string;
}> = ({ satisfied, label, testID }) => (
  <View style={criteriaStyles.row}>
    <View
      style={[
        criteriaStyles.bullet,
        satisfied ? criteriaStyles.bulletSatisfied : criteriaStyles.bulletPending,
      ]}
      testID={`${testID}-bullet${satisfied ? '-satisfied' : ''}`}
    />
    <Text
      style={[
        criteriaStyles.label,
        satisfied && criteriaStyles.labelSatisfied,
      ]}
      testID={testID}
    >
      {label}
    </Text>
  </View>
);

const criteriaStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bullet: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  bulletPending: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.uacTextSubtle200,
  },
  bulletSatisfied: {
    backgroundColor: theme.colors.uacTextBase,
  },
  label: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextSubtle100,
  },
  labelSatisfied: {
    color: theme.colors.uacTextBase,
  },
});

export const ResetNewPasswordScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { t } = useTranslation();

  const token = route.params?.token ?? '';
  const carriedEmail = route.params?.email;

  const [password, setPassword] = useState<string>('');
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [tokenInvalid, setTokenInvalid] = useState<boolean>(false);

  const rules = useMemo(() => evaluatePassword(password), [password]);

  const mutation = useResetPasswordMutation();
  const isSubmitting = mutation.isPending;
  const canSubmit = rules.allValid && !isSubmitting && !!token;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmissionError(null);
    mutation.mutate(
      { token, new_password: password },
      {
        onSuccess: () => {
          navigation.navigate('Verified', { source: 'reset' });
        },
        onError: (err) => {
          if (
            err.code === 'TOKEN_INVALID' ||
            err.code === 'TOKEN_EXPIRED' ||
            err.code === 'TOKEN_CONSUMED'
          ) {
            setTokenInvalid(true);
            return;
          }
          if (err.code === 'WEAK_PASSWORD') {
            setSubmissionError(
              t('uac.reset_new_password.error_weak_password') as string,
            );
            return;
          }
          setSubmissionError(
            t('uac.reset_new_password.error_generic') as string,
          );
        },
      },
    );
  };

  // Token error panel — replaces the body when the token is rejected.
  if (tokenInvalid) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('uac.common.back') as string}
            testID="reset-password-back"
            onPress={() => navigation.goBack()}
            style={styles.headerBackHit}
            hitSlop={8}
          >
            <Text style={styles.headerBackChevron}>‹</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.headingBlock}>
            <Text style={styles.heading} testID="reset-password-token-error-heading">
              {t('uac.reset_new_password.section_heading')}
            </Text>
            <Text
              style={[styles.supporting, styles.tokenErrorText]}
              testID="reset-password-token-error"
            >
              {t('uac.reset_new_password.error_token_expired')}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            testID="reset-password-request-new-link"
            accessibilityRole="button"
            accessibilityLabel={
              t('uac.forgot_request.submit_cta') as string
            }
            onPress={() =>
              navigation.navigate('ForgotPasswordRequest', {
                email: carriedEmail ?? '',
              })
            }
            style={({ pressed }) => [
              styles.cta,
              pressed && styles.ctaPressed,
            ]}
          >
            <Text style={styles.ctaLabel}>
              {t('uac.forgot_request.submit_cta')}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('uac.common.back') as string}
          testID="reset-password-back"
          onPress={() => navigation.goBack()}
          style={styles.headerBackHit}
          hitSlop={8}
        >
          <Text style={styles.headerBackChevron}>‹</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headingBlock}>
            <Text style={styles.heading} testID="reset-password-heading">
              {t('uac.reset_new_password.section_heading')}
            </Text>
            <Text style={styles.supporting}>
              {t('uac.reset_new_password.password_label')}
            </Text>
          </View>

          {/* Password field row: outlined input + circular submit chevron */}
          <View style={styles.fieldRow}>
            <View
              style={[
                styles.passwordField,
                submissionError && styles.passwordFieldError,
              ]}
            >
              <TextInput
                testID="reset-password-input"
                accessibilityLabel={
                  t('uac.reset_new_password.password_label') as string
                }
                style={styles.input}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (submissionError) setSubmissionError(null);
                }}
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                editable={!isSubmitting}
                onSubmitEditing={handleSubmit}
              />
              <Pressable
                testID={
                  passwordVisible
                    ? 'reset-password-toggle-visible'
                    : 'reset-password-toggle-hidden'
                }
                accessibilityRole="button"
                accessibilityLabel={
                  passwordVisible
                    ? (t('uac.reset_new_password.hide_password') as string)
                    : (t('uac.reset_new_password.show_password') as string)
                }
                onPress={() => setPasswordVisible((v) => !v)}
                hitSlop={8}
                style={styles.eyeToggle}
              >
                <Text style={styles.eyeToggleLabel}>
                  {passwordVisible
                    ? t('uac.reset_new_password.hide_password')
                    : t('uac.reset_new_password.show_password')}
                </Text>
              </Pressable>
            </View>

            <Pressable
              testID="reset-password-submit"
              accessibilityRole="button"
              accessibilityLabel={
                t('uac.reset_new_password.submit_a11y') as string
              }
              accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.submitChevron,
                !canSubmit && styles.submitChevronDisabled,
                pressed && canSubmit && styles.submitChevronPressed,
              ]}
            >
              <Text style={styles.submitChevronIcon}>›</Text>
            </Pressable>
          </View>

          {/* Password criteria checklist — 3 rules */}
          <View style={styles.checklist}>
            <CriteriaRow
              satisfied={rules.minChars}
              label={t('uac.reset_new_password.criteria_min_chars') as string}
              testID="reset-password-criteria-min-chars"
            />
            <CriteriaRow
              satisfied={rules.lowercase}
              label={t('uac.reset_new_password.criteria_lowercase') as string}
              testID="reset-password-criteria-lowercase"
            />
            <CriteriaRow
              satisfied={rules.number}
              label={t('uac.reset_new_password.criteria_number') as string}
              testID="reset-password-criteria-number"
            />
          </View>

          {submissionError ? (
            <Text
              style={styles.errorText}
              testID="reset-password-error"
            >
              {submissionError}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.uacBackgroundNeutralSubtlest,
  },
  flex: { flex: 1 },
  header: {
    height: theme.spacing.uacHeaderHeight,
    paddingHorizontal: theme.spacing.uacBodyPadding,
    justifyContent: 'flex-end',
    paddingBottom: theme.spacing.uacDimension16,
  },
  headerBackHit: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackChevron: {
    fontSize: 32,
    lineHeight: 32,
    color: theme.colors.uacTextBase,
  },
  body: {
    paddingHorizontal: theme.spacing.uacBodyPadding,
    paddingTop: theme.spacing.uacDimension8,
    paddingBottom: theme.spacing.uacDimension24,
  },
  headingBlock: {
    gap: theme.spacing.uacDimension4,
    marginBottom: theme.spacing.uacDimension16,
  },
  heading: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
  },
  supporting: {
    ...theme.typography.aliases.uacBodyMdRegular,
    color: theme.colors.uacTextBase,
  },
  tokenErrorText: {
    color: theme.colors.uacTextDangerBase,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension16,
    marginBottom: theme.spacing.uacDimension16,
  },
  passwordField: {
    flex: 1,
    height: theme.spacing.uacButtonHeight,
    borderRadius: theme.borderRadius.uacTextField,
    borderWidth: 1,
    borderColor: theme.colors.uacBorderBold200,
    paddingLeft: theme.spacing.uacDimension16,
    paddingRight: theme.spacing.uacDimension8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension4,
  },
  passwordFieldError: {
    borderColor: theme.colors.uacTextDangerBase,
  },
  input: {
    flex: 1,
    ...theme.typography.aliases.uacM3BodyLarge,
    color: theme.colors.uacTextBase,
    padding: 0,
  },
  eyeToggle: {
    minWidth: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.uacDimension8,
  },
  eyeToggleLabel: {
    ...theme.typography.aliases.uacBodyXsMedium,
    color: theme.colors.uacTextSubtle100,
  },
  submitChevron: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.uacBackgroundBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitChevronDisabled: {
    opacity: 0.4,
  },
  submitChevronPressed: {
    opacity: 0.85,
  },
  submitChevronIcon: {
    fontSize: 26,
    lineHeight: 28,
    color: theme.colors.uacTextPrimaryBase,
  },
  checklist: {
    width: 327,
    alignSelf: 'center',
    gap: theme.spacing.uacDimension8,
  },
  errorText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextDangerBase,
    marginTop: theme.spacing.uacDimension16,
  },
  footer: {
    paddingHorizontal: theme.spacing.uacBodyPadding,
    paddingBottom: theme.spacing.uacSafeAreaBottom + theme.spacing.uacDimension16,
    paddingTop: theme.spacing.uacDimension8,
  },
  cta: {
    height: theme.spacing.uacButtonHeight,
    borderRadius: theme.borderRadius.uacButtonCta,
    backgroundColor: theme.colors.uacBackgroundBase,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaLabel: {
    ...theme.typography.aliases.uacBodyMdMedium,
    color: theme.colors.uacTextPrimaryBase,
  },
});

export default ResetNewPasswordScreen;
