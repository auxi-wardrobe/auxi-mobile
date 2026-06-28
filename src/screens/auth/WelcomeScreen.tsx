/**
 * AU-242 Phase 05 — Welcome (auth stack root) with live OAuth wiring.
 *
 * Spec: plans/260521-2335-au-242-figma-spec/01-welcome.md
 * Figma node: 2849:10085
 *
 * Phase 04 batch B shipped the visual scaffold; phase 05 wires the
 * Google + Apple CTAs to the real OAuth flows. Layout untouched.
 *
 * Behaviour summary
 * - "Continue with Google" → Google SDK sheet → POST /api/auth/google
 *   → AuthContext refreshUser → AppNavigator gate swaps to AppStack.
 * - "Continue with Apple" → Apple SDK sheet → POST /api/auth/apple →
 *   same success path. iOS-only via `Platform.OS === 'ios'`.
 * - User cancels SDK sheet → silent return to Welcome (no toast).
 * - Backend 409 EMAIL_LINKED_TO_PASSWORD → navigate to SignIn with the
 *   email prefilled (backend echoes the email in the conflict detail).
 * - Backend 409 EMAIL_LINKED_TO_OTHER_PROVIDER → info toast naming the
 *   provider; user stays on Welcome to pick the other CTA.
 * - OAuth not yet configured (placeholder client IDs) → info toast
 *   "Sign-in is not set up" so the app doesn't crash at the SDK
 *   boundary on builds that haven't received `GoogleService-Info.plist`.
 */
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { toast } from '../../components/design-system/lib';

import { theme } from '../../theme/theme';
import { MacgieLoader } from '../../components/macgie';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import type { AuthStackParamList } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  useAppleSignInMutation,
  useGoogleSignInMutation,
} from '../../hooks/auth/useAuthMutations';
import { appleSignInRequest } from '../../services/oauth/appleSignIn';
import { googleSignInRequest } from '../../services/oauth/googleSignIn';
import { isOAuthCancelled } from '../../services/oauth/oauthErrors';
import { isOAuthConfigured } from '../../services/oauth/oauthConfig';
import { track } from '../../services/analytics';
import {
  isOAuthConflictError,
  type AuthErrorEnvelope,
} from '../../services/authTypes';
import { buildLegalSegments } from '../legal/legalLinkSegments';
import type { LegalDocumentType } from '../../content/legal';

type Navigation = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

// Minimal inline glyphs — keep diff small (no new SVG assets).
// Sizes match the Figma 24×24 trailing-icon slot.
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

const AppleGlyph = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24">
    <Path
      d="M17.05 12.536c-.022-2.404 1.962-3.555 2.05-3.61-1.117-1.632-2.852-1.856-3.467-1.881-1.479-.149-2.886.872-3.638.872-.751 0-1.91-.85-3.139-.827-1.616.024-3.106.94-3.937 2.385-1.678 2.906-.43 7.207 1.21 9.572.8 1.155 1.755 2.45 3.011 2.403 1.21-.049 1.666-.78 3.13-.78 1.464 0 1.875.78 3.16.755 1.305-.025 2.131-1.175 2.928-2.335.923-1.338 1.303-2.633 1.325-2.7-.029-.013-2.54-.974-2.633-3.854Zm-2.388-7.075c.671-.815 1.124-1.946.999-3.07-.967.04-2.137.643-2.832 1.456-.622.722-1.166 1.876-1.019 2.978 1.077.084 2.18-.547 2.852-1.364Z"
      fill={theme.colors.uacTextPrimaryBase}
    />
  </Svg>
);

// `color` defaults to the secondary-button icon tint (color/primary/700) and is
// injected by PillButton, so the envelope stays on-spec via the shared button.
const EnvelopeGlyph = ({
  color = theme.colors.iconPrimary700,
}: {
  color?: string;
}) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11Z"
      stroke={color}
      strokeWidth={1.5}
    />
    <Path
      d="m4 7 7.4 5.55a1 1 0 0 0 1.2 0L20 7"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

const CaretDownGlyph = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M3 4.5 6 7.5l3-3"
      stroke={theme.colors.uacTextBase}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const WelcomeScreen = () => {
  const navigation = useNavigation<Navigation>();
  const { t } = useTranslation();
  const { refreshUser, markOAuthSignIn } = useAuth();
  const googleMutation = useGoogleSignInMutation();
  const appleMutation = useAppleSignInMutation();

  // Which social provider (if any) is mid-authentication. Drives both the
  // disabled state and the inline spinner. A single state value (rather than
  // the mutation's `isPending`) so the busy window spans the WHOLE flow —
  // native SDK sheet → backend verify → refreshUser — instead of only the
  // mutation, which would leave a dead, spinner-less gap after the Google
  // sheet dismisses while the backend round-trip is still in flight.
  const [socialBusy, setSocialBusy] = useState<'google' | 'apple' | null>(null);

  const isAppleAvailable = Platform.OS === 'ios';
  const isBusy = socialBusy !== null;

  const onPressEmail = () => {
    // Mirrors `oauth_sign_in_started` (provider CTA tap on Welcome): the
    // third auth-entry option. `sign_up_started` still fires later, on the
    // EmailInput "Continue" submit, so this captures the earlier intent.
    track('email_sign_in_started', { method: 'email' });
    navigation.navigate('EmailInput', { mode: 'signup' });
  };
  const onPressLanguage = () => {
    // Opening the auth-tier language picker. The actual locale change fires
    // `auth_language_changed` from inside LanguageSettings.
    track('auth_language_button_tapped');
    navigation.navigate('LanguageSettings');
  };

  // Legal footer — split the localised sentence so the Terms / Privacy
  // substrings are tappable (App Store blocker B5). Recomputes on locale
  // change because all three inputs are i18n-resolved.
  const legalSegments = useMemo(
    () =>
      buildLegalSegments(
        t('uac.welcome.legal_text'),
        t('uac.welcome.legal_terms_link'),
        t('uac.welcome.legal_privacy_link'),
      ),
    [t],
  );

  const onPressLegal = (documentType: LegalDocumentType) => {
    // `legal_document_viewed` is fired by LegalDocumentScreen's mount effect
    // (with source='welcome') — don't double-count it here.
    navigation.navigate('LegalDocument', { documentType, source: 'welcome' });
  };

  /**
   * Translate a backend AuthErrorEnvelope into the appropriate UX action:
   * - EMAIL_LINKED_TO_PASSWORD → bounce to SignIn (email prefilled if
   *   backend echoed it in detail; otherwise leave blank).
   * - EMAIL_LINKED_TO_OTHER_PROVIDER → info toast naming the other
   *   provider; user stays on Welcome.
   * - anything else → generic toast.
   */
  const handleAuthError = (err: AuthErrorEnvelope) => {
    if (isOAuthConflictError(err)) {
      if (err.code === 'EMAIL_LINKED_TO_PASSWORD') {
        const email =
          typeof err.detail?.email === 'string'
            ? (err.detail.email as string)
            : '';
        navigation.navigate('SignIn', { email });
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

  const onPressGoogle = async () => {
    if (isBusy) return;
    track('oauth_sign_in_started', { provider: 'google' });
    if (!isOAuthConfigured()) {
      toast.show({
        type: 'info',
        text1: t('uac.welcome.oauth_not_configured'),
      });
      return;
    }
    setSocialBusy('google');
    try {
      const { idToken } = await googleSignInRequest();
      await googleMutation.mutateAsync({ id_token: idToken });
      // Tokens have already been persisted by `signInWithGoogle`. Pull
      // the user record so AuthContext flips AppNavigator over to the
      // AppStack — no manual reset() needed.
      markOAuthSignIn('google');
      await refreshUser();
    } catch (err) {
      if (isOAuthCancelled(err)) return;
      // Mutation errors land here as AuthErrorEnvelope; native SDK
      // failures land here as something else (typically Error).
      if (err && typeof err === 'object' && 'code' in err && 'status' in err) {
        handleAuthError(err as AuthErrorEnvelope);
        return;
      }
      toast.show({
        type: 'error',
        text1: t('uac.welcome.oauth_generic_error'),
      });
    } finally {
      // Clears the spinner on cancel / error. On success the navigator
      // unmounts this screen, so this is a harmless no-op there.
      setSocialBusy(null);
    }
  };

  const onPressApple = async () => {
    if (isBusy) return;
    track('oauth_sign_in_started', { provider: 'apple' });
    if (!isOAuthConfigured()) {
      // OAuth config is currently shared between Google + Apple — until
      // anh confirms Apple Sign-In is provisioned, we surface the same
      // info toast as Google to avoid crashing on tap.
      toast.show({
        type: 'info',
        text1: t('uac.welcome.oauth_not_configured'),
      });
      return;
    }
    setSocialBusy('apple');
    try {
      const { identityToken, name } = await appleSignInRequest();
      await appleMutation.mutateAsync({ identity_token: identityToken, name });
      markOAuthSignIn('apple');
      await refreshUser();
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
      setSocialBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top-right language switcher (spec §1, header position) */}
      <View style={styles.header}>
        <Pressable
          testID="welcome-lang-link"
          accessibilityRole="button"
          accessibilityLabel={t('uac.welcome.language_button')}
          onPress={onPressLanguage}
          style={({ pressed }) => [
            styles.langButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.langText}>
            {t('uac.welcome.language_button')}
          </Text>
          <CaretDownGlyph />
        </Pressable>
      </View>

      <View style={styles.bodyContainer}>
        {/* Hero group — logo + heading + subtitle near the top (Figma node
            3910:22305). Per CEO: the lively MacgieLoader animation (±4° dwelling
            sway + pupil tracking) fills the logo slot, presented as a logo
            (`asLogo` → image a11y "Macgie", no busy/Loading state, no caption).
            `inline` variant keeps it content-sized (no flex stretch). */}
        <View style={styles.heroGroup}>
          <MacgieLoader
            variant="inline"
            size={126}
            asLogo
            testID="welcome-logo"
          />
          <Text style={styles.headline}>{t('uac.welcome.headline')}</Text>
          <Text style={styles.subtitle}>{t('uac.welcome.subtitle')}</Text>
        </View>

        {/* Bottom group — action stack + legal, pinned below the hero via the
            container's space-between (Figma Frame 2108 / legal footer). Plain
            layout wrapper (no style) so the two render as one bottom block. */}
        <View>
          {/* Action stack — pinned to the bottom (Figma Frame 2108). */}
          <View style={styles.actionStack}>
            {/* 3a. Social sub-group (gap 12) */}
            <View style={styles.socialGroup}>
              <Pressable
                testID="welcome-cta-google"
                accessibilityRole="button"
                accessibilityLabel={t('uac.welcome.google_cta')}
                accessibilityState={{
                  disabled: isBusy,
                  busy: socialBusy === 'google',
                }}
                disabled={isBusy}
                onPress={onPressGoogle}
                style={({ pressed }) => [
                  styles.buttonBase,
                  styles.buttonSecondary,
                  (pressed || isBusy) && styles.pressed,
                ]}
              >
                {socialBusy === 'google' ? (
                  <ActivityIndicator
                    testID="welcome-cta-google-spinner"
                    color={theme.colors.uacTextBase}
                  />
                ) : (
                  <>
                    <Text style={styles.buttonLabelDark}>
                      {t('uac.welcome.google_cta')}
                    </Text>
                    <GoogleGlyph />
                  </>
                )}
              </Pressable>

              {isAppleAvailable && (
                <Pressable
                  testID="welcome-cta-apple"
                  accessibilityRole="button"
                  accessibilityLabel={t('uac.welcome.apple_cta')}
                  accessibilityState={{
                    disabled: isBusy,
                    busy: socialBusy === 'apple',
                  }}
                  disabled={isBusy}
                  onPress={onPressApple}
                  style={({ pressed }) => [
                    styles.buttonBase,
                    styles.buttonPrimary,
                    (pressed || isBusy) && styles.pressed,
                  ]}
                >
                  {socialBusy === 'apple' ? (
                    <ActivityIndicator
                      testID="welcome-cta-apple-spinner"
                      color={theme.colors.uacTextPrimaryBase}
                    />
                  ) : (
                    <>
                      <Text style={styles.buttonLabelLight}>
                        {t('uac.welcome.apple_cta')}
                      </Text>
                      <AppleGlyph />
                    </>
                  )}
                </Pressable>
              )}
            </View>

            {/* 3b. "or" divider — line · "or" · line (Figma Frame 2135) */}
            <View style={styles.orDivider}>
              <View style={styles.orDividerLine} />
              <Text style={styles.orDividerLabel}>{t('uac.welcome.or')}</Text>
              <View style={styles.orDividerLine} />
            </View>

            {/* 3c. Email entry — canonical secondary button. */}
            <PillButton
              testID="welcome-cta-email"
              accessibilityLabel={t('uac.welcome.email_cta')}
              title={t('uac.welcome.email_cta')}
              variant="outline"
              disabled={isBusy}
              onPress={onPressEmail}
              style={styles.buttonBase}
              trailing={<EnvelopeGlyph />}
            />
          </View>

          {/* Legal footer — the "Terms of Service" + "Privacy Policy"
            substrings are linkified to the in-app legal screens (App Store
            blocker B5). Split works across all 3 locales because each
            legal_text contains both link substrings verbatim. */}
          <Text style={styles.legalText} testID="welcome-legal-text">
            {legalSegments.map((segment, index) =>
              segment.type === 'text' ? (
                <Text key={`legal-${index}`}>{segment.value}</Text>
              ) : (
                <Text
                  key={`legal-${index}`}
                  testID={
                    segment.type === 'terms'
                      ? 'welcome-legal-terms-link'
                      : 'welcome-legal-privacy-link'
                  }
                  accessibilityRole="link"
                  accessibilityLabel={segment.value}
                  style={styles.legalLink}
                  onPress={() => onPressLegal(segment.type)}
                >
                  {segment.value}
                </Text>
              ),
            )}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.uacBackgroundNeutral50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.uacBodyPadding,
    paddingTop: theme.spacing.uacDimension8,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension4,
    paddingHorizontal: theme.spacing.uacDimension16,
    paddingVertical: theme.spacing.uacDimension8,
    borderRadius: theme.borderRadius.uacButtonText,
  },
  langText: {
    ...theme.typography.aliases.uacBodyXsMedium,
    color: theme.colors.uacTextBase,
  },
  bodyContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.uacBodyPadding,
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.uacDimension24,
  },
  // Logo + heading + subtitle grouped near the top (Figma group top ≈ 171/844).
  // Top inset approximates the Figma offset below the header; gap≈7px in Figma,
  // snapped to the nearest token (uacDimension8) — flagged for the designer gate.
  heroGroup: {
    alignItems: 'center',
    marginTop: theme.spacing.uacDimension24 * 2,
    gap: theme.spacing.uacDimension8,
  },
  headline: {
    ...theme.typography.aliases.uacH1Bold,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
    letterSpacing: -0.72,
  },
  subtitle: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  actionStack: {
    gap: theme.spacing.uacDimension16,
  },
  socialGroup: {
    gap: theme.spacing.uacDimension12, // spec §3a
  },
  buttonBase: {
    height: theme.spacing.uacButtonHeight,
    borderRadius: theme.borderRadius.uacButtonCta,
    paddingHorizontal: theme.spacing.uacButtonPaddingX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.uacDimension8,
  },
  buttonPrimary: {
    backgroundColor: theme.colors.figmaPrimaryButtonBg,
  },
  buttonSecondary: {
    borderWidth: 1.5,
    borderColor: theme.colors.uacBorderBase,
    backgroundColor: 'transparent',
  },
  buttonLabelDark: {
    ...theme.typography.aliases.uacBodyMdMedium,
    color: theme.colors.uacTextBase,
  },
  buttonLabelLight: {
    ...theme.typography.aliases.uacBodyMdMedium,
    color: theme.colors.figmaPrimaryButtonText,
  },
  // "or" divider: line · label · line (Figma Frame 2135, M3 dividers).
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension12,
  },
  orDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.uacBorderBold200,
    opacity: 0.4,
  },
  orDividerLabel: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
  },
  legalText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
    marginTop: theme.spacing.uacDimension16,
  },
  legalLink: {
    ...theme.typography.aliases.uacBodyXsMedium,
    color: theme.colors.uacTextBase,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.7,
  },
});
