/**
 * AU-242 Phase 04 — Batch D · Screen 10 (forgot password — request email).
 *
 * Spec: plans/260521-2335-au-242-figma-spec/10-forgot-request.md
 *
 * Flow: user lands here from the SignIn screen's "Forgot your password?"
 * link with their email pre-filled. They confirm / edit the email and tap
 * "Send reset password". The mutation always resolves OK (enumeration
 * safe) — we navigate to the check-mail screen regardless of whether the
 * email exists in the DB.
 *
 * AU-315: a Gmail-domain address can't be reset via our email flow — the
 * backend silently skips OAuth-only accounts on /api/auth/forgot-password,
 * so a reset email is never sent ("nothing happens"). Instead of firing the
 * no-op request, we surface inline guidance telling the user to reset their
 * password from within the Gmail / Google account, and we do NOT advance to
 * the check-mail screen (there's no mail to check).
 *
 * Error handling: only RATE_LIMITED (429) surfaces an inline error; any
 * other transport failure shows the generic copy.
 *
 * Self-contained: this batch ships screen UI only — header / button /
 * input primitives are inlined to keep the file independent of work in
 * batches B/C. They can be extracted into `components/auth/*` during the
 * cleanup phase once all batches land.
 */
import React, { useState } from 'react';
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
import { useForgotPasswordMutation } from '../../hooks/auth/useAuthMutations';
import { isGoogleEmail } from '../../utils/email-provider';
import { track } from '../../services/analytics';
import type { AuthStackParamList } from '../../types/navigation';
import { theme } from '../../theme/theme';

type Navigation = NativeStackNavigationProp<
  AuthStackParamList,
  'ForgotPasswordRequest'
>;
type Route = RouteProp<AuthStackParamList, 'ForgotPasswordRequest'>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ForgotPasswordRequestScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { t } = useTranslation();

  const [email, setEmail] = useState<string>(route.params?.email ?? '');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  // AU-315: Gmail accounts can't be reset via our email flow — we show
  // an informational notice (neutral, not an error) instead.
  const [gmailNotice, setGmailNotice] = useState<string | null>(null);

  const mutation = useForgotPasswordMutation();
  const isSubmitting = mutation.isPending;

  const isEmailValid = EMAIL_REGEX.test(email.trim());
  const canSubmit = isEmailValid && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmissionError(null);
    setGmailNotice(null);
    const trimmed = email.trim();

    // AU-315: Gmail-domain emails authenticate via Google — there is no
    // password to reset on our side and the backend no-ops the request.
    // Steer the user to reset within Gmail instead of advancing to a
    // check-mail screen they'd wait on forever.
    if (isGoogleEmail(trimmed)) {
      setGmailNotice(t('uac.forgot_request.gmail_notice') as string);
      return;
    }

    track('forgot_password_requested');
    mutation.mutate(
      { email: trimmed },
      {
        onSuccess: () => {
          // Account-enumeration safe: backend always returns ok regardless of
          // whether the email exists — we always advance to the check-mail
          // screen so attackers can't distinguish registered emails.
          navigation.navigate('ForgotPasswordCheckMail', { email: trimmed });
        },
        onError: err => {
          if (err.code === 'RATE_LIMITED') {
            setSubmissionError(
              t('uac.forgot_request.error_rate_limited') as string,
            );
          } else {
            setSubmissionError(t('uac.forgot_request.error_generic') as string);
          }
        },
      },
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* Canonical auth header — shared back glyph + safe-area row. */}
      <AuthHeader
        testID="forgot-request-header"
        onBack={() => navigation.goBack()}
        backTestID="forgot-request-back"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          {/* Heading + supporting text */}
          <View style={styles.headingBlock}>
            <Text style={styles.heading} testID="forgot-request-heading">
              {t('uac.forgot_request.section_heading')}
            </Text>
            <Text style={styles.supporting}>
              {t('uac.forgot_request.body')}
            </Text>
          </View>

          {/* Email field — DS input. */}
          <MInput
            testID="forgot-request-email-input"
            accessibilityLabel={t('uac.forgot_request.email_label') as string}
            value={email}
            onChangeText={text => {
              setEmail(text);
              if (submissionError) setSubmissionError(null);
              if (gmailNotice) setGmailNotice(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="done"
            editable={!isSubmitting}
            onSubmitEditing={handleSubmit}
          />

          {submissionError ? (
            <Text style={styles.errorText} testID="forgot-request-error">
              {submissionError}
            </Text>
          ) : null}

          {gmailNotice ? (
            <Text
              style={styles.noticeText}
              testID="forgot-request-gmail-notice"
            >
              {gmailNotice}
            </Text>
          ) : null}
        </ScrollView>

        {/* Primary CTA — bottom-anchored */}
        <View style={styles.footer}>
          <MButton
            testID="forgot-request-submit"
            accessibilityLabel={t('uac.forgot_request.submit_cta') as string}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!canSubmit}
          >
            {t('uac.forgot_request.submit_cta') as string}
          </MButton>
        </View>
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
  errorText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextDangerBase,
    marginTop: theme.spacing.uacDimension8,
  },
  noticeText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextInfoBase,
    marginTop: theme.spacing.uacDimension8,
  },
  footer: {
    paddingHorizontal: theme.spacing.uacBodyPadding,
    paddingBottom: theme.spacing.uacDimension16,
    paddingTop: theme.spacing.uacDimension8,
  },
});

export default ForgotPasswordRequestScreen;
