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
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { MButton, MInput } from '../../components/design-system/lib';
import { AuthHeader } from '../../components/auth/AuthHeader';
import { useResetPasswordMutation } from '../../hooks/auth/useAuthMutations';
import { track } from '../../services/analytics';
import type { AuthStackParamList } from '../../types/navigation';
import { theme } from '../../theme/theme';
import { PasswordCriteriaChecklist } from '../../components/auth/PasswordCriteriaChecklist';
import { validatePassword } from '../../utils/password-rules';

type Navigation = NativeStackNavigationProp<
  AuthStackParamList,
  'ResetNewPassword'
>;
type Route = RouteProp<AuthStackParamList, 'ResetNewPassword'>;

export const ResetNewPasswordScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { t } = useTranslation();

  const token = route.params?.token ?? '';
  const carriedEmail = route.params?.email;

  const [password, setPassword] = useState<string>('');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [tokenInvalid, setTokenInvalid] = useState<boolean>(false);

  const { isValid: allRulesPass } = useMemo(
    () => validatePassword(password),
    [password],
  );
  const criteriaLabels = useMemo(
    () => ({
      length: t('uac.reset_new_password.criteria_min_chars') as string,
      lowercase: t('uac.reset_new_password.criteria_lowercase') as string,
      digit: t('uac.reset_new_password.criteria_number') as string,
    }),
    [t],
  );

  const mutation = useResetPasswordMutation();
  const isSubmitting = mutation.isPending;
  const canSubmit = allRulesPass && !isSubmitting && !!token;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmissionError(null);
    mutation.mutate(
      { token, new_password: password },
      {
        onSuccess: () => {
          track('password_reset_completed');
          navigation.navigate('Verified', { source: 'reset' });
        },
        onError: err => {
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
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        {/* Canonical auth header — shared back glyph + safe-area row. */}
        <AuthHeader
          onBack={() => navigation.goBack()}
          backTestID="reset-password-back"
        />

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.headingBlock}>
            <Text
              style={styles.heading}
              testID="reset-password-token-error-heading"
            >
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
          <MButton
            testID="reset-password-request-new-link"
            accessibilityLabel={t('uac.forgot_request.submit_cta') as string}
            onPress={() =>
              navigation.navigate('ForgotPasswordRequest', {
                email: carriedEmail ?? '',
              })
            }
          >
            {t('uac.forgot_request.submit_cta') as string}
          </MButton>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* Canonical auth header — shared back glyph + safe-area row. */}
      <AuthHeader
        onBack={() => navigation.goBack()}
        backTestID="reset-password-back"
      />

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

          {/* Password — DS field with built-in eye toggle. */}
          <View style={styles.fieldRow}>
            <MInput
              testID="reset-password-input"
              accessibilityLabel={
                t('uac.reset_new_password.password_label') as string
              }
              value={password}
              onChangeText={text => {
                setPassword(text);
                if (submissionError) setSubmissionError(null);
              }}
              secureTextEntry
              showPasswordLabel={
                t('uac.reset_new_password.show_password') as string
              }
              hidePasswordLabel={
                t('uac.reset_new_password.hide_password') as string
              }
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              editable={!isSubmitting}
              onSubmitEditing={handleSubmit}
            />
          </View>

          {/* Password criteria checklist — shared with PasswordCreation */}
          <View style={styles.checklist}>
            <PasswordCriteriaChecklist
              password={password}
              labels={criteriaLabels}
              testIDPrefix="reset-password-criteria"
            />
          </View>

          {submissionError ? (
            <Text style={styles.errorText} testID="reset-password-error">
              {submissionError}
            </Text>
          ) : null}

          {/* Full-width CTA below the criteria (replaces the inline chevron). */}
          <View style={styles.ctaWrap}>
            <MButton
              testID="reset-password-submit"
              accessibilityLabel={
                t('uac.reset_new_password.submit_a11y') as string
              }
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={!canSubmit}
            >
              {t('uac.reset_new_password.submit_a11y') as string}
            </MButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.uacBackgroundNeutralSubtlest,
  },
  flex: { flex: 1 },
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
    marginBottom: theme.spacing.uacDimension16,
  },
  checklist: {
    gap: theme.spacing.uacDimension8,
  },
  errorText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextDangerBase,
    marginTop: theme.spacing.uacDimension16,
  },
  ctaWrap: {
    marginTop: theme.spacing.uacDimension24,
  },
  footer: {
    paddingHorizontal: theme.spacing.uacBodyPadding,
    paddingBottom: theme.spacing.uacDimension16,
    paddingTop: theme.spacing.uacDimension8,
  },
});

export default ResetNewPasswordScreen;
