/**
 * AU-242 Phase 04 Batch B — Email input.
 *
 * Specs: plans/260521-2335-au-242-figma-spec/03-email-input.md
 *        plans/260521-2335-au-242-figma-spec/08-email-input-error.md
 * Figma nodes: 2849:10143 (idle) + 2849:10205 (error)
 *
 * Single screen handles BOTH idle and error variants — local state
 * `error` toggles inline supporting text. Submit affordance is the
 * inline rounded chevron-right button (right of the field). No
 * bottom CTA, per spec.
 *
 * Flow:
 *   - Validate email format locally (inline regex; no util module
 *     existed prior to this batch — see open Qs).
 *   - Call `useEmailPrecheckMutation`. Backend returns:
 *       * 'google' / 'apple' → navigate `EmailGoogleNotice` (batch C/D).
 *       * 'password' → existing password account → navigate `SignIn`
 *                       (the user logs in). We HONOR the precheck result
 *                       here regardless of how the screen was entered, so
 *                       returning users always reach Sign-In.
 *       * 'none' (admin only — anonymous sees 'password' for enum
 *         safety, so this branch is effectively unreachable) → fall
 *         through to PasswordCreation (signup).
 *   - 429 RATE_LIMITED → error_rate_limited copy.
 *   - NETWORK_ERROR → toast.
 *
 * `mode` param distinguishes signup vs signin entry — when 'signin',
 * tapping submit always lands on SignIn regardless of precheck (the
 * precheck call here is a UX assist for OAuth-only accounts).
 */
import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';

import { theme } from '../../theme/theme';
import { useEmailPrecheckMutation } from '../../hooks/auth/useAuthMutations';
import type { AuthStackParamList } from '../../types/navigation';

type Navigation = NativeStackNavigationProp<AuthStackParamList, 'EmailInput'>;
type Route = RouteProp<AuthStackParamList, 'EmailInput'>;

// Lightweight RFC-5322 subset — KISS, enough for UI gate; backend re-validates.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ChevronLeftGlyph = ({ color = theme.colors.uacTextBase }: { color?: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 6 9 12l6 6"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronRightGlyph = ({ color = theme.colors.uacTextPrimaryBase }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 6l6 6-6 6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const EmailInputScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { t } = useTranslation();

  const mode = route.params?.mode ?? 'signup';

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const precheck = useEmailPrecheckMutation();

  const isValid = EMAIL_RE.test(email.trim());

  const handleChange = useCallback((text: string) => {
    setEmail(text);
    if (error) setError(null); // Clear inline error on edit (spec 08 behavior).
  }, [error]);

  const handleSubmit = useCallback(() => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t('uac.email_input.error_required'));
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError(t('uac.email_input.error_invalid'));
      return;
    }

    // Signin mode short-circuits straight to SignIn — precheck is a
    // UX hint, not a gate.
    if (mode === 'signin') {
      navigation.navigate('SignIn', { email: trimmed });
      return;
    }

    precheck.mutate(
      { email: trimmed },
      {
        onSuccess: (result) => {
          if (result.provider === 'google' || result.provider === 'apple') {
            navigation.navigate('EmailGoogleNotice', { email: trimmed });
            return;
          }
          // `provider:'password'` means the email already has a
          // password-based account → route to SignIn so the user logs in.
          // Anything else (`'none'` — new email, admin-only visibility) →
          // PasswordCreation for signup. Honor the precheck result rather
          // than assuming signup (AU bugfix: existing users could not log in).
          if (result.provider === 'password') {
            navigation.navigate('SignIn', { email: trimmed });
            return;
          }
          navigation.navigate('PasswordCreation', { email: trimmed });
        },
        onError: (err) => {
          if (err.code === 'RATE_LIMITED') {
            setError(t('uac.email_input.error_rate_limited'));
            return;
          }
          if (err.code === 'NETWORK_ERROR') {
            Toast.show({
              type: 'error',
              text1: t('uac.email_input.error_invalid'),
              position: 'bottom',
            });
            return;
          }
          // Validation / unknown: surface inline.
          setError(err.message || t('uac.email_input.error_invalid'));
        },
      },
    );
  }, [email, mode, navigation, precheck, t]);

  const onBack = useCallback(() => navigation.goBack(), [navigation]);

  const hasError = !!error;
  const submitDisabled = precheck.isPending || email.trim().length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex1}
      >
        {/* Header — back chevron left, empty trailing slot (spec) */}
        <View style={styles.header}>
          <Pressable
            testID="email-back-button"
            accessibilityRole="button"
            accessibilityLabel={t('uac.common.back')}
            onPress={onBack}
            style={({ pressed }) => [styles.iconHit, pressed && styles.pressed]}
            hitSlop={8}
          >
            <ChevronLeftGlyph />
          </Pressable>
          <View style={styles.headerSlot} />
        </View>

        <View style={styles.bodyContainer}>
          <Text style={styles.label} testID="email-input-label">
            {t('uac.email_input.label')}
          </Text>

          <View style={styles.formRow}>
            <View
              style={[
                styles.fieldWrap,
                hasError && styles.fieldWrapError,
              ]}
            >
              <TextInput
                testID="email-input-field"
                value={email}
                onChangeText={handleChange}
                placeholder={t('uac.email_input.placeholder')}
                placeholderTextColor={theme.colors.uacTextSubtle200}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                style={styles.input}
              />
            </View>
            <Pressable
              testID="email-submit-button"
              accessibilityRole="button"
              accessibilityLabel={t('uac.email_input.submit_a11y')}
              onPress={handleSubmit}
              disabled={submitDisabled}
              style={({ pressed }) => [
                styles.submitBtn,
                submitDisabled && styles.submitBtnDisabled,
                pressed && !submitDisabled && styles.pressed,
              ]}
            >
              <ChevronRightGlyph
                color={isValid ? theme.colors.uacTextPrimaryBase : theme.colors.uacTextSubtle200}
              />
            </Pressable>
          </View>

          {/* Supporting error text (spec 08) */}
          {hasError && (
            <Text testID="email-input-error" style={styles.errorText}>
              {error}
            </Text>
          )}
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
  header: {
    height: theme.spacing.uacHeaderHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.uacBodyPadding,
  },
  iconHit: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSlot: { width: 47, height: 47 },
  bodyContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.uacBodyPadding,
  },
  label: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
    paddingVertical: theme.spacing.uacDimension8 + 4, // 12px per spec
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension16,
  },
  fieldWrap: {
    flex: 1,
    height: theme.spacing.uacButtonHeight,
    borderWidth: 1,
    borderColor: theme.colors.uacBorderBold200,
    borderRadius: theme.borderRadius.uacTextField,
    paddingHorizontal: theme.spacing.uacDimension16,
    justifyContent: 'center',
    backgroundColor: theme.colors.uacBackgroundNeutralSubtlest,
  },
  fieldWrapError: {
    // Spec note: Figma keeps neutral border in error state. Default to
    // option (1): neutral border + red supporting text only.
    // (We intentionally do NOT switch border to danger to match Figma.)
  },
  input: {
    ...theme.typography.aliases.uacM3BodyLarge,
    color: theme.colors.uacTextBase,
    padding: 0,
    margin: 0,
  },
  submitBtn: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.uacButtonCta,
    backgroundColor: theme.colors.uacBackgroundBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  errorText: {
    ...theme.typography.aliases.uacM3BodySmall,
    color: theme.colors.uacTextDangerBase,
    marginTop: theme.spacing.uacDimension4,
    paddingHorizontal: theme.spacing.uacDimension16,
  },
  pressed: {
    opacity: 0.7,
  },
});
