/**
 * AU-242 Phase 04 Batch B — Verify email (post-signup waiting state).
 *
 * Spec: plans/260521-2335-au-242-figma-spec/06-verify-email.md
 * Figma node: 2849:10276
 *
 * Layout:
 *   - Brand mark + headline + 3-line body block.
 *   - "Open email app" primary CTA.
 *   - "Resend verification email (NNs)" secondary CTA with 60s
 *     cooldown timer (local interval — does NOT persist across
 *     screen unmount; that's an open product Q).
 *   - "Waiting for email to be verified" status + spinner (animated
 *     via Animated rotate).
 *   - "Logout" text button top-right.
 *
 * Verification itself happens off-screen — the user taps the magic
 * link in their email which lands in the deep-link handler (foundation),
 * which calls `useVerifyEmailMutation` and navigates to Verified. This
 * screen is purely the waiting room.
 *
 * `pendingVerifyEmail` from AuthContext is the source of truth; route
 * param `email` is a belt-and-braces fallback for cold-starts.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';

import { theme } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useResendVerificationMutation } from '../../hooks/auth/useAuthMutations';
import { track } from '../../services/analytics';
import type { AuthStackParamList } from '../../types/navigation';

type Route = RouteProp<AuthStackParamList, 'VerifyEmail'>;

// Per spec note (open Q 9): final cooldown duration TBD. 60s is the
// sensible default — same as typical OTP flows. Centralise here so a
// future PM call only edits one number.
const RESEND_COOLDOWN_SECONDS = 60;

const SpinnerGlyph = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
      stroke={theme.colors.uacTextSubtle200}
      strokeWidth={1.75}
      strokeLinecap="round"
    />
  </Svg>
);

export const VerifyEmailScreen = () => {
  const route = useRoute<Route>();
  const { t } = useTranslation();
  const { pendingVerifyEmail, logout } = useAuth();
  const resend = useResendVerificationMutation();

  const email = pendingVerifyEmail ?? route.params?.email ?? '';
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  // Spinner animation. Loop a 1.2s rotation.
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const spinStyle = {
    transform: [
      {
        rotate: spin.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        }),
      },
    ],
  };

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown(s => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const onOpenMail = useCallback(async () => {
    // iOS: message:// opens Mail. Android: prefer the mailto: scheme.
    const url = Platform.OS === 'ios' ? 'message://' : 'mailto:';
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Toast.show({
          type: 'info',
          text1: t('uac.verify_email.title'),
          text2: t('uac.verify_email.body_line_c'),
          position: 'bottom',
        });
      }
    } catch {
      // Swallow — user can still resend.
    }
  }, [t]);

  const onResend = useCallback(() => {
    if (cooldown > 0 || resend.isPending || !email) return;
    track('email_verification_resent');
    resend.mutate(
      { email },
      {
        onSuccess: () => {
          setCooldown(RESEND_COOLDOWN_SECONDS);
          Toast.show({
            type: 'success',
            text1: t('uac.verify_email.resend_success'),
            position: 'bottom',
          });
        },
        onError: () => {
          Toast.show({
            type: 'error',
            text1: t('uac.verify_email.resend_failure'),
            position: 'bottom',
          });
        },
      },
    );
  }, [cooldown, email, resend, t]);

  const onLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      // AuthContext logs internally; nothing to do here.
    }
  }, [logout]);

  const resendDisabled = cooldown > 0 || resend.isPending;
  const resendLabel =
    cooldown > 0
      ? t('uac.verify_email.resend_cta_cooldown', {
          seconds: String(cooldown).padStart(2, '0'),
        })
      : t('uac.verify_email.resend_cta');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Logout top-right text button (spec §header) */}
      <View style={styles.topBar}>
        <Pressable
          testID="verify-logout-button"
          accessibilityRole="button"
          accessibilityLabel={t('uac.verify_email.logout_cta')}
          onPress={onLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
        >
          <Text style={styles.logoutText}>
            {t('uac.verify_email.logout_cta')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {/* Brand mark placeholder — same Group42 asset as Welcome.
            For batch B we render a sized box so layout matches Figma;
            real asset import lands when batch-D consolidates the
            shared logo component. */}
        <View style={styles.heroIllustration} testID="verify-hero-mark" />

        <Text style={styles.title} testID="verify-title">
          {t('uac.verify_email.title')}
        </Text>

        <Text style={styles.bodyLine} testID="verify-body-line-a">
          {t('uac.verify_email.body_line_a')}
        </Text>
        <Text style={styles.emailLine} testID="verify-body-email">
          {email}
        </Text>
        <Text style={styles.bodyLine} testID="verify-body-line-c">
          {t('uac.verify_email.body_line_c')}
        </Text>

        {/* Button stack */}
        <View style={styles.buttonStack}>
          <Pressable
            testID="verify-open-mail-button"
            accessibilityRole="button"
            accessibilityLabel={t('uac.verify_email.open_mail_app_cta')}
            onPress={onOpenMail}
            style={({ pressed }) => [
              styles.buttonBase,
              styles.buttonPrimary,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.buttonLabelLight}>
              {t('uac.verify_email.open_mail_app_cta')}
            </Text>
          </Pressable>
          <Pressable
            testID={
              resendDisabled
                ? 'verify-resend-button-cooldown'
                : 'verify-resend-button'
            }
            accessibilityRole="button"
            accessibilityLabel={resendLabel}
            onPress={onResend}
            disabled={resendDisabled}
            style={({ pressed }) => [
              styles.buttonBase,
              styles.buttonSecondary,
              resendDisabled && styles.buttonDisabled,
              pressed && !resendDisabled && styles.pressed,
            ]}
          >
            <Text style={styles.buttonLabelDark}>{resendLabel}</Text>
          </Pressable>
        </View>

        {/* Polling status row */}
        <View style={styles.statusRow}>
          <Text style={styles.statusText} testID="verify-status-text">
            {t('uac.verify_email.status_waiting')}
          </Text>
          <Animated.View style={spinStyle} testID="verify-status-spinner">
            <SpinnerGlyph />
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.uacBackgroundNeutralSubtlest,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.uacBodyPadding,
    paddingTop: theme.spacing.uacDimension16,
  },
  logoutBtn: {
    paddingHorizontal: theme.spacing.uacDimension16,
    paddingVertical: theme.spacing.uacDimension8,
    borderRadius: theme.borderRadius.uacButtonText,
  },
  logoutText: {
    ...theme.typography.aliases.uacBodyXsMedium,
    color: theme.colors.uacTextBase,
  },
  body: {
    flex: 1,
    paddingHorizontal: theme.spacing.uacBodyPadding,
    paddingTop: theme.spacing.uacDimension24 * 4, // ≈100px below status bar
    alignItems: 'center',
  },
  heroIllustration: {
    width: 130,
    height: 90,
    marginBottom: theme.spacing.uacDimension24,
    backgroundColor: theme.colors.uacColorNeutral100,
    borderRadius: theme.borderRadius.uacPanel,
  },
  title: {
    ...theme.typography.aliases.uacH4Bold,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
    marginBottom: theme.spacing.uacDimension24,
  },
  bodyLine: {
    ...theme.typography.aliases.uacBodyMdRegular,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  emailLine: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  buttonStack: {
    width: '100%',
    marginTop: theme.spacing.uacDimension24,
    gap: theme.spacing.uacDimension8 + 4, // 12px
  },
  buttonBase: {
    height: theme.spacing.uacButtonHeight,
    borderRadius: theme.borderRadius.uacButtonCta,
    paddingHorizontal: theme.spacing.uacButtonPaddingX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: theme.colors.figmaPrimaryButtonBg,
  },
  buttonSecondary: {
    borderWidth: 1.5,
    borderColor: theme.colors.uacBorderBase,
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabelLight: {
    ...theme.typography.aliases.uacBodyMdMedium,
    color: theme.colors.figmaPrimaryButtonText,
  },
  buttonLabelDark: {
    ...theme.typography.aliases.uacBodyMdMedium,
    color: theme.colors.uacTextBase,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.uacDimension8 + 4, // 12px
    marginTop: theme.spacing.uacDimension24,
  },
  statusText: {
    ...theme.typography.aliases.uacBodyMdRegular,
    color: theme.colors.uacTextSubtle200,
  },
  pressed: {
    opacity: 0.7,
  },
});
