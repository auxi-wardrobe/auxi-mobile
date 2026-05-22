/**
 * AU-242 Phase 04 Batch B — Welcome (auth stack root).
 *
 * Spec: plans/260521-2335-au-242-figma-spec/01-welcome.md
 * Figma node: 2849:10085
 *
 * Replaces the foundation placeholder. Layout follows the Figma frame
 * verbatim modulo three pragmatic deltas (all from the spec's
 * "Notes / gotchas" section):
 *   1. Brand mark is rendered as text per i18n key `welcome.headline`
 *      so we ship "Auxi" even though the Figma label still reads
 *      "Macgie". Open question for Việt — see open-questions block at
 *      EOF.
 *   2. Google/Apple/Email glyphs are minimal inline SVGs via
 *      `react-native-svg` (no new asset files added — keeps batch B
 *      diff small).
 *   3. Apple button is unconditionally rendered. Android-only hide is
 *      handled at the batch-D platform check, not here.
 *
 * Wiring: route is registered in `AuthNavigator` (foundation). Mutation
 * isn't called here — Welcome is purely a router into the email /
 * Google / Apple paths. Google + Apple CTAs are stubs in this batch;
 * the real OAuth wiring lives in batch C (`useGoogleSignInMutation` /
 * `useAppleSignInMutation`).
 */
import React from 'react';
import {
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

import { theme } from '../../theme/theme';
import type { AuthStackParamList } from '../../types/navigation';

type Navigation = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

// Minimal inline glyphs — keep batch B diff small (no new SVG assets).
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

const EnvelopeGlyph = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11Z"
      stroke={theme.colors.uacTextBase}
      strokeWidth={1.5}
    />
    <Path
      d="m4 7 7.4 5.55a1 1 0 0 0 1.2 0L20 7"
      stroke={theme.colors.uacTextBase}
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

  const onPressEmail = () => navigation.navigate('EmailInput', { mode: 'signup' });
  const onPressLanguage = () => navigation.navigate('LanguageSettings');
  // OAuth stubs — real flow lands in batch C.
  const onPressGoogle = () => navigation.navigate('EmailGoogleNotice', { email: '' });
  const onPressApple = () => navigation.navigate('EmailInput', { mode: 'signin' });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top-right language switcher (spec §1, header position) */}
      <View style={styles.header}>
        <Pressable
          testID="welcome-lang-link"
          accessibilityRole="button"
          accessibilityLabel={t('uac.welcome.language_button')}
          onPress={onPressLanguage}
          style={({ pressed }) => [styles.langButton, pressed && styles.pressed]}
        >
          <Text style={styles.langText}>{t('uac.welcome.language_button')}</Text>
          <CaretDownGlyph />
        </Pressable>
      </View>

      <View style={styles.bodyContainer}>
        {/* Headline replaces Figma's logo + headline duplication: ship the
            i18n string only (logo asset deferred per spec note 1). */}
        <View style={styles.headlineWrap}>
          <Text style={styles.headline}>{t('uac.welcome.headline')}</Text>
        </View>

        {/* Action stack — spec §3 */}
        <View style={styles.actionStack}>
          {/* 3a. Social sub-group (gap 12) */}
          <View style={styles.socialGroup}>
            <Pressable
              testID="welcome-cta-google"
              accessibilityRole="button"
              accessibilityLabel={t('uac.welcome.google_cta')}
              onPress={onPressGoogle}
              style={({ pressed }) => [
                styles.buttonBase,
                styles.buttonSecondary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.buttonLabelDark}>{t('uac.welcome.google_cta')}</Text>
              <GoogleGlyph />
            </Pressable>

            <Pressable
              testID="welcome-cta-apple"
              accessibilityRole="button"
              accessibilityLabel={t('uac.welcome.apple_cta')}
              onPress={onPressApple}
              style={({ pressed }) => [
                styles.buttonBase,
                styles.buttonPrimary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.buttonLabelLight}>{t('uac.welcome.apple_cta')}</Text>
              <AppleGlyph />
            </Pressable>
          </View>

          {/* 3b. Divider (1px, neutral border) */}
          <View style={styles.divider} />

          {/* 3c. Email entry */}
          <Pressable
            testID="welcome-cta-email"
            accessibilityRole="button"
            accessibilityLabel={t('uac.welcome.email_cta')}
            onPress={onPressEmail}
            style={({ pressed }) => [
              styles.buttonBase,
              styles.buttonSecondary,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.buttonLabelDark}>{t('uac.welcome.email_cta')}</Text>
            <EnvelopeGlyph />
          </Pressable>
        </View>

        {/* Legal footer — kept as single Text per spec note (no separate
            link nodes in Figma; PM open Q on linkifying substrings). */}
        <Text style={styles.legalText} testID="welcome-legal-text">
          {t('uac.welcome.legal_text')}
        </Text>
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
  headlineWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headline: {
    ...theme.typography.aliases.uacH1Bold,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
    letterSpacing: -0.72,
  },
  actionStack: {
    gap: theme.spacing.uacDimension16,
  },
  socialGroup: {
    gap: theme.spacing.uacDimension8 + 4, // 12px per spec §3a
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
    backgroundColor: theme.colors.uacBackgroundBase,
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
    color: theme.colors.uacTextPrimaryBase,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.uacBorderBold200,
    opacity: 0.4,
  },
  legalText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
    marginTop: theme.spacing.uacDimension16,
  },
  pressed: {
    opacity: 0.7,
  },
});
