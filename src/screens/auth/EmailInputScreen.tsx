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
 *   - AU-313 reverted: previously a Gmail-domain address was steered straight
 *     to `EmailGoogleNotice` BEFORE the precheck. That domain heuristic was
 *     wrong — it forced EVERY gmail.com user onto the Google sign-in path with
 *     no way to use a password, even gmail accounts that have a password. The
 *     DATABASE now decides at LOGIN time: `POST /api/login` returns
 *     `403 OAUTH_ACCOUNT { provider: 'google' }` only for genuinely
 *     Google-linked, password-less accounts, and `SignInScreen` catches that
 *     and routes to `EmailGoogleNotice`. So gmail flows normally through the
 *     password path here.
 *   - Call `useEmailPrecheckMutation`. The precheck is
 *     enumeration-safe for legacy/signup callers. In signin mode this screen
 *     sends `intent: 'signin'`, so the backend can return the real provider
 *     under rate limits and avoid dead-end password/account-creation screens.
 *     Routing:
 *       * 'google' / 'apple' → navigate `EmailGoogleNotice` (OAuth path).
 *       * signup + 'none' → `PasswordCreation`.
 *       * signup + 'password' → `SignIn` (email already exists).
 *       * signin + 'none' → inform via Toast + bounce to Welcome.
 *       * signin + 'password' → `SignIn`.
 *   - 429 RATE_LIMITED → error_rate_limited copy.
 *   - NETWORK_ERROR → inline error (error_network copy, NOT "invalid email").
 *
 * AU-356 fix: previously a 'password' precheck result unconditionally routed
 * to `SignIn`, which (because of enumeration safety) blocked EVERY new signup
 * email — e.g. viettran@macgie.com — from ever reaching the password step.
 *
 * `mode` param distinguishes signup vs signin entry. Both modes run the
 * precheck so we can route OAuth-linked emails to the Google/Apple path.
 */
import React, { useCallback, useState } from 'react';
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
import { useEmailPrecheckMutation } from '../../hooks/auth/useAuthMutations';
import { track } from '../../services/analytics';
import type { AuthStackParamList } from '../../types/navigation';
import { resolveEmailInputRoute } from './email-input-routing';

type Navigation = NativeStackNavigationProp<AuthStackParamList, 'EmailInput'>;
type Route = RouteProp<AuthStackParamList, 'EmailInput'>;

// Lightweight RFC-5322 subset — KISS, enough for UI gate; backend re-validates.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EmailInputScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { t } = useTranslation();

  const mode = route.params?.mode ?? 'signup';

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const precheck = useEmailPrecheckMutation();

  const handleChange = useCallback(
    (text: string) => {
      setEmail(text);
      if (error) setError(null); // Clear inline error on edit (spec 08 behavior).
    },
    [error],
  );

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

    precheck.mutate(
      { email: trimmed, intent: 'signin' },
      {
        onSuccess: result => {
          const routeDecision = resolveEmailInputRoute(mode, result.provider);

          if (routeDecision.kind === 'email-provider-notice') {
            navigation.navigate('EmailGoogleNotice', { email: trimmed });
            return;
          }

          if (routeDecision.kind === 'password-creation') {
            track('sign_up_started', { method: 'email' });
            navigation.navigate('PasswordCreation', { email: trimmed });
            return;
          }

          if (routeDecision.kind === 'unknown-signin-email') {
            toast.show({
              type: 'info',
              text1: t('uac.email_input.error_no_account'),
              position: 'bottom',
              visibilityTime: 4000,
            });
            navigation.navigate('Welcome');
            return;
          }
          navigation.navigate('SignIn', { email: trimmed });
        },
        onError: err => {
          if (err.code === 'RATE_LIMITED') {
            setError(t('uac.email_input.error_rate_limited'));
            return;
          }
          if (err.code === 'NETWORK_ERROR') {
            // Connection / backend failure — surface INLINE via MInput.error
            // (the screen stays mounted here, so no Toast is needed). Must NOT
            // reuse the "invalid email" copy — that misleads the user into
            // thinking their address is wrong when it's really the network.
            setError(t('uac.email_input.error_network'));
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
        {/* Canonical auth header — shared back glyph + safe-area row. */}
        <AuthHeader onBack={onBack} backTestID="email-back-button" />

        <View style={styles.bodyContainer}>
          <Text style={styles.label} testID="email-input-label">
            {t('uac.email_input.label')}
          </Text>

          {/* DS field — inline error routed into MInput.error (spec 08). */}
          <MInput
            testID="email-input-field"
            accessibilityLabel={t('uac.email_input.label')}
            value={email}
            onChangeText={handleChange}
            placeholder={t('uac.email_input.placeholder')}
            error={hasError ? (error as string) : undefined}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />

          {/* Full-width CTA below the field (replaces the inline chevron). */}
          <View style={styles.ctaWrap}>
            <MButton
              testID="email-submit-button"
              accessibilityLabel={t('uac.email_input.submit_a11y')}
              onPress={handleSubmit}
              loading={precheck.isPending}
              disabled={submitDisabled}
            >
              {t('uac.email_input.submit_a11y')}
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
    paddingVertical: theme.spacing.uacDimension8 + 4, // 12px per spec
  },
  ctaWrap: {
    marginTop: theme.spacing.uacDimension24,
  },
});
