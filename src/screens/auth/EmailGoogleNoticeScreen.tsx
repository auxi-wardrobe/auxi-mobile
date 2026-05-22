/**
 * AU-242 Phase 04 batch C — Email-Google Notice screen.
 *
 * Spec: `plans/260521-2335-au-242-figma-spec/07-email-google-notice.md`
 *       (node 2849:10267).
 *
 * Purpose:
 *   Inform the user that the email they entered is already linked to an
 *   existing Google account and route them into Google Sign-In instead
 *   of letting them try a password.
 *
 * Reached from:
 *   - EmailInput (signin mode) when emailPrecheck returns provider=google
 *     (authenticated callers only — anonymous users get "password"
 *     fallback per backend enumeration safety).
 *   - SignIn — if /api/login returns OAUTH_ACCOUNT for a google account,
 *     SignInScreen reroutes here.
 *
 * CTA wiring:
 *   The "Continue with Google" button calls `useGoogleSignInMutation`
 *   with an `id_token`. Today there is NO Google Sign-In SDK wired in
 *   `auxi/` (no `@react-native-google-signin/google-signin` package in
 *   package.json), so the CTA surfaces a "not yet available" toast and
 *   logs a TODO. The screen UI is built to spec; the SDK plumbing is a
 *   follow-up (open question in batch C report).
 *
 * Error handling for the mutation (when SDK lands):
 *   - 409 EMAIL_LINKED_TO_PASSWORD / EMAIL_LINKED_TO_OTHER_PROVIDER →
 *     error toast with the conflict copy (the user is on this screen
 *     specifically because of provider=google, so a 409 here means the
 *     backend state changed under us — surface it loudly).
 *   - other errors → generic toast.
 *
 * `testID` discipline (Maestro):
 *   - email-google-notice-back
 *   - email-google-notice-headline
 *   - email-google-notice-body
 *   - email-google-notice-continue
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';

import { theme } from '../../theme/theme';
import IconChevronLeft from '../../assets/images/icon_chevron_left.svg';
import { useGoogleSignInMutation } from '../../hooks/auth/useAuthMutations';
import type { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'EmailGoogleNotice'>;

export const EmailGoogleNoticeScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();

  const googleMutation = useGoogleSignInMutation();
  const submitting = googleMutation.isPending;

  const onContinuePress = () => {
    // TODO(au-242-followup): wire @react-native-google-signin/google-signin
    // here, pull the id_token, and call
    //   googleMutation.mutate({ id_token })
    // For now we surface a toast so QA / dev can see the wiring intent
    // without crashing on a missing SDK.
    Toast.show({
      type: 'info',
      text1: t('uac.email_google_notice.google_cta'),
      text2:
        'Google sign-in SDK not yet wired — see batch C report follow-up.',
      position: 'bottom',
      visibilityTime: 3500,
    });

    if (__DEV__) {
      console.warn(
        '[EmailGoogleNoticeScreen] Google SDK missing — see batch C report.',
      );
    }
    // When the SDK is wired, replace the toast above with:
    //   googleMutation.mutate({ id_token }, {
    //     onError: (err) => {
    //       if (isOAuthConflictError(err)) { ... } else { ... }
    //     },
    //   });
  };

  const onBackPress = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <View style={styles.screen} testID="email-google-notice-screen">
      <View style={styles.header} pointerEvents="box-none">
        <Pressable
          onPress={onBackPress}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('uac.common.back')}
          testID="email-google-notice-back"
          style={styles.backHit}
        >
          <IconChevronLeft width={24} height={24} />
        </Pressable>
        <View style={styles.headerTrailingSlot} />
      </View>

      <View style={styles.body}>
        <View style={styles.textBlock}>
          <Text
            style={styles.headline}
            testID="email-google-notice-headline"
          >
            {t('uac.email_google_notice.headline')}
          </Text>
          <Text style={styles.bodyText} testID="email-google-notice-body">
            {t('uac.email_google_notice.body')}
          </Text>
        </View>

        <Pressable
          onPress={onContinuePress}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel={t('uac.email_google_notice.google_cta')}
          accessibilityState={{ disabled: submitting, busy: submitting }}
          testID="email-google-notice-continue"
          style={({ pressed }) => [
            styles.ctaButton,
            submitting && styles.ctaButtonDisabled,
            pressed && !submitting && styles.ctaButtonPressed,
          ]}
        >
          <Text style={styles.ctaLabel}>
            {t('uac.email_google_notice.google_cta')}
          </Text>
          {/* Google G mark — placeholder square pending brand asset. */}
          <View style={styles.ctaIconSlot} accessible={false}>
            <View style={styles.ctaIconGlyph} />
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const CTA_MAX_WIDTH = 327;

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
    zIndex: 10,
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
  body: {
    flex: 1,
    paddingTop: theme.spacing.uacSafeAreaTop,
    paddingHorizontal: theme.spacing.uacBodyPadding,
    paddingBottom: theme.spacing.uacSafeAreaBottom,
    alignItems: 'center',
    gap: theme.spacing.uacDimension24,
  },
  textBlock: {
    width: '100%',
    maxWidth: 360,
    paddingVertical: theme.spacing.uacDimension4,
    gap: theme.spacing.uacDimension16,
  },
  headline: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
  },
  bodyText: {
    ...theme.typography.aliases.uacBodyMdRegular,
    color: theme.colors.uacTextBase,
  },
  ctaButton: {
    width: '100%',
    maxWidth: CTA_MAX_WIDTH,
    height: theme.spacing.uacButtonHeight,
    borderRadius: theme.borderRadius.uacButtonCta,
    borderWidth: 1.5,
    borderColor: theme.colors.uacBorderBase,
    backgroundColor: theme.colors.uacBackgroundNeutralSubtlest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.uacButtonPaddingX,
    paddingVertical: theme.spacing.uacButtonPaddingY,
    gap: theme.spacing.uacDimension8,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaButtonPressed: {
    opacity: 0.85,
  },
  ctaLabel: {
    ...theme.typography.aliases.uacBodyMdMedium,
    color: theme.colors.uacTextBase,
  },
  ctaIconSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaIconGlyph: {
    // Placeholder for Google G — see open question in batch C report.
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.uacBorderBase,
  },
});

export default EmailGoogleNoticeScreen;
