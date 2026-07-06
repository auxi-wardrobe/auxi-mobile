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
 * CTA wiring (AU-313):
 *   The "Continue with Google" button drives the LIVE Google OAuth flow —
 *   the same path the Welcome screen uses for its Google CTA:
 *     Google SDK sheet → id_token → POST /api/auth/google
 *       → AuthContext.refreshUser → AppNavigator swaps to the AppStack.
 *   The Google Sign-In SDK is wired in `auxi/`
 *   (`@react-native-google-signin/google-signin` + `services/oauth/*`), so
 *   this screen no longer surfaces a "not yet wired" placeholder toast.
 *
 * Error handling for the mutation:
 *   - User cancels the SDK sheet → silent return (no toast).
 *   - 409 EMAIL_LINKED_TO_PASSWORD → bounce to SignIn with the email
 *     prefilled (the account actually has a password — let them log in).
 *   - 409 EMAIL_LINKED_TO_OTHER_PROVIDER → info toast naming the provider.
 *   - OAuth not yet provisioned on this build → info toast (no crash).
 *   - other errors → generic toast.
 *
 * `testID` discipline (Maestro):
 *   - email-google-notice-back
 *   - email-google-notice-headline
 *   - email-google-notice-body
 *   - email-google-notice-continue
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { toast } from '../../components/design-system/lib';

import { theme } from '../../theme/theme';
import { DotsLoader } from '../../components/atoms/DotsLoader';
import IconChevronLeft from '../../assets/images/icon_chevron_left.svg';
import { useGoogleSignInMutation } from '../../hooks/auth/useAuthMutations';
import { useAuth } from '../../context/AuthContext';
import { googleSignInRequest } from '../../services/oauth/googleSignIn';
import { saveProfilePhoto } from '../../services/profilePhoto';
import { isOAuthCancelled } from '../../services/oauth/oauthErrors';
import { isOAuthConfigured } from '../../services/oauth/oauthConfig';
import { track } from '../../services/analytics';
import {
  isOAuthConflictError,
  type AuthErrorEnvelope,
} from '../../services/authTypes';
import type { AuthStackParamList } from '../../types/navigation';

const GoogleGlyph = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24">
    <Path
      d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.51h3.227c1.887-1.74 2.986-4.298 2.986-7.351Z"
      fill="#4285F4"
    />
    <Path
      d="M12 22c2.7 0 4.964-.895 6.618-2.422l-3.227-2.51c-.895.6-2.04.955-3.391.955-2.605 0-4.81-1.76-5.595-4.122H3.072v2.59A9.997 9.997 0 0 0 12 22Z"
      fill="#34A853"
    />
    <Path
      d="M6.405 13.9a6 6 0 0 1 0-3.8V7.51H3.072a10.01 10.01 0 0 0 0 8.98L6.405 13.9Z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.977c1.468 0 2.785.504 3.823 1.495l2.864-2.864C16.96 3.014 14.695 2 12 2A9.997 9.997 0 0 0 3.072 7.51L6.405 10.1C7.19 7.738 9.395 5.977 12 5.977Z"
      fill="#EA4335"
    />
  </Svg>
);

type Props = NativeStackScreenProps<AuthStackParamList, 'EmailGoogleNotice'>;

export const EmailGoogleNoticeScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { t } = useTranslation();
  const { email } = route.params;

  const { refreshUser, markOAuthSignIn } = useAuth();
  const googleMutation = useGoogleSignInMutation();
  // Single busy flag spans the WHOLE flow (SDK sheet → backend → refreshUser),
  // not just the mutation — mirrors the Welcome screen so there's no
  // spinner-less gap after the Google sheet dismisses.
  const [submitting, setSubmitting] = useState(false);

  /**
   * Translate a backend AuthErrorEnvelope into the appropriate UX action.
   * Mirrors WelcomeScreen.handleAuthError — kept inline rather than shared
   * to keep this batch's diff contained.
   */
  const handleAuthError = (err: AuthErrorEnvelope) => {
    if (isOAuthConflictError(err)) {
      if (err.code === 'EMAIL_LINKED_TO_PASSWORD') {
        const linkedEmail =
          typeof err.detail?.email === 'string'
            ? (err.detail.email as string)
            : email;
        navigation.navigate('SignIn', { email: linkedEmail });
        return;
      }
      // EMAIL_LINKED_TO_OTHER_PROVIDER
      toast.show({
        type: 'info',
        text1: t('uac.welcome.oauth_conflict_other_provider', {
          provider: err.detail.provider,
        }),
      });
      return;
    }
    toast.show({
      type: 'error',
      text1: t('uac.welcome.oauth_generic_error'),
    });
  };

  const onContinuePress = async () => {
    if (submitting) return;
    track('oauth_sign_in_started', { provider: 'google' });
    if (!isOAuthConfigured()) {
      // Build hasn't received the OAuth client IDs / plist yet — surface a
      // toast instead of crashing at the native SDK boundary.
      toast.show({
        type: 'info',
        text1: t('uac.welcome.oauth_not_configured'),
      });
      return;
    }
    setSubmitting(true);
    try {
      const { idToken, photoUrl } = await googleSignInRequest();
      await googleMutation.mutateAsync({ id_token: idToken });
      // Tokens persisted by `signInWithGoogle`; pull the user so AuthContext
      // flips AppNavigator over to the AppStack.
      markOAuthSignIn('google');
      const signedInUser = await refreshUser();
      // Cache the Google avatar for the Settings profile header (the backend
      // has no photo field, so this is the only place it can be captured).
      if (photoUrl && signedInUser?.email) {
        saveProfilePhoto(signedInUser.email, photoUrl);
      }
    } catch (err) {
      if (isOAuthCancelled(err)) return;
      if (err && typeof err === 'object' && 'code' in err && 'status' in err) {
        handleAuthError(err as AuthErrorEnvelope);
        return;
      }
      toast.show({
        type: 'error',
        text1: t('uac.welcome.oauth_generic_error'),
      });
    } finally {
      // On success the navigator unmounts this screen, so this is a harmless
      // no-op there; on cancel / error it clears the spinner.
      setSubmitting(false);
    }
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
          <Text style={styles.headline} testID="email-google-notice-headline">
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
          {submitting ? (
            <DotsLoader
              testID="email-google-notice-continue-spinner"
              color={theme.colors.uacTextBase}
            />
          ) : (
            <>
              <Text style={styles.ctaLabel}>
                {t('uac.email_google_notice.google_cta')}
              </Text>
              <GoogleGlyph />
            </>
          )}
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
    // Secondary button is no-fill; transparent lets the screen surface show
    // through (was uacBackgroundNeutralSubtlest, identical on this screen but
    // off-spec for the shared secondary-button definition).
    backgroundColor: theme.colors.transparent,
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
});

export default EmailGoogleNoticeScreen;
