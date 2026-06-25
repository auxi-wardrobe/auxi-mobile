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
 *   - AU-313: a Gmail-domain address (gmail.com / googlemail.com) is steered
 *     straight to `EmailGoogleNotice` (the Google sign-in path that mirrors
 *     the Apple flow) BEFORE the precheck call — Gmail accounts authenticate
 *     via Google OAuth, not a password, and the precheck is enumeration-safe
 *     so it can't tell us "google" for an anonymous caller anyway.
 *   - Otherwise call `useEmailPrecheckMutation`. The precheck is
 *     enumeration-safe: ANONYMOUS callers (every public caller on this
 *     screen) ALWAYS get `provider: 'password'` regardless of real linkage —
 *     only authenticated admin/self lookups see the true value. So routing
 *     branches on `mode`, NOT on the provider value (except the OAuth hint):
 *       * 'google' / 'apple' → navigate `EmailGoogleNotice` (OAuth path).
 *       * signup mode, any other provider → happy path → `PasswordCreation`.
 *         The genuinely-already-registered case is detected server-side at
 *         register time (409 EMAIL_ALREADY_EXISTS → routed to SignIn there),
 *         the only enumeration-safe place to catch it.
 *       * signin mode, 'none' → inform via Toast + bounce to Welcome.
 *       * signin mode, otherwise → `SignIn` (returning user logs in).
 *   - 429 RATE_LIMITED → error_rate_limited copy.
 *   - NETWORK_ERROR → toast.
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
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';

import IconChevronRight from '../../assets/images/icon_chevron_right.svg';
import { theme } from '../../theme/theme';
import { useEmailPrecheckMutation } from '../../hooks/auth/useAuthMutations';
import { isGoogleEmail } from '../../utils/email-provider';
import { track } from '../../services/analytics';
import type { AuthStackParamList } from '../../types/navigation';

type Navigation = NativeStackNavigationProp<AuthStackParamList, 'EmailInput'>;
type Route = RouteProp<AuthStackParamList, 'EmailInput'>;

// Lightweight RFC-5322 subset — KISS, enough for UI gate; backend re-validates.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ChevronLeftGlyph = ({
  color = theme.colors.uacTextBase,
}: {
  color?: string;
}) => (
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


export const EmailInputScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { t } = useTranslation();

  const mode = route.params?.mode ?? 'signup';

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const precheck = useEmailPrecheckMutation();

  const isValid = EMAIL_RE.test(email.trim());

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

    // AU-313: Gmail addresses go straight to the Google sign-in path
    // (mirrors the Apple flow). Decided client-side on the domain — the
    // precheck is enumeration-safe and won't report "google" to an
    // anonymous caller, so this is the only reliable Gmail signal we have.
    if (isGoogleEmail(trimmed)) {
      navigation.navigate('EmailGoogleNotice', { email: trimmed });
      return;
    }

    precheck.mutate(
      { email: trimmed },
      {
        onSuccess: result => {
          if (result.provider === 'google' || result.provider === 'apple') {
            navigation.navigate('EmailGoogleNotice', { email: trimmed });
            return;
          }

          // AU-356: the precheck is enumeration-safe — an ANONYMOUS caller
          // (every public sign-up / sign-in here) ALWAYS receives
          // `provider: 'password'` regardless of whether the email actually
          // exists. Only authenticated admin/self lookups ever see the real
          // `'none' | 'google' | 'apple'`. So in signup mode we must NOT treat
          // `'password'` as "account exists, go log in" — that wrongly bounced
          // brand-new users (e.g. viettran@macgie.com) to SignIn and blocked
          // them from reaching the password-creation step. The genuine
          // already-registered case is caught server-side at register time
          // (409 EMAIL_ALREADY_EXISTS → PasswordCreationScreen routes to
          // SignIn), which is the only enumeration-safe place to detect it.
          //
          // Routing therefore branches on `mode`, not on the (unreliable for
          // anonymous callers) provider value:
          if (mode === 'signup') {
            // Signup happy path: any non-OAuth result → create a password.
            // This is the moment the user commits to a new account.
            track('sign_up_started', { method: 'email' });
            navigation.navigate('PasswordCreation', { email: trimmed });
            return;
          }

          // signin mode below.
          // `'none'` is only reachable for authenticated callers, but handle
          // it defensively: the user expected to log in and there's no
          // account. Inform via a Toast (an inline error would die with this
          // unmounting screen) and bounce back to Welcome so they can pick a
          // sign-up path or try a different email.
          if (result.provider === 'none') {
            Toast.show({
              type: 'info',
              text1: t('uac.email_input.error_no_account'),
              position: 'bottom',
              visibilityTime: 4000,
            });
            navigation.navigate('Welcome');
            return;
          }
          // signin + `'password'` (or any other value) → existing
          // password-based account → route to SignIn so the user logs in.
          navigation.navigate('SignIn', { email: trimmed });
        },
        onError: err => {
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
            <View style={[styles.fieldWrap, hasError && styles.fieldWrapError]}>
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
              <IconChevronRight
                width={20}
                height={20}
                color={
                  isValid
                    ? theme.colors.figmaPrimaryButtonIcon
                    : theme.colors.uacTextSubtle200
                }
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
    backgroundColor: theme.colors.figmaPrimaryButtonBg,
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
