/**
 * AU-242 Phase 04 — Batch D · Screen 11 (forgot password — check mail).
 *
 * Spec: plans/260521-2335-au-242-figma-spec/11-forgot-check-mail.md
 *
 * Confirmation screen — no inputs. Displays the destination email + a
 * spam-folder hint and routes back to the SignIn screen on CTA.
 *
 * Per spec resolution: Figma defines a single primary CTA "Back to
 * Login" (NOT "Open mail app"). Shipping the Figma-faithful version.
 *
 * The destination email is rendered inside a styled, non-interactive
 * box visually identical to the M3 filled text field but is NOT a
 * `TextInput` — preventing focus/keyboard appearance per spec.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import type { AuthStackParamList } from '../../types/navigation';
import { theme } from '../../theme/theme';

type Navigation = NativeStackNavigationProp<
  AuthStackParamList,
  'ForgotPasswordCheckMail'
>;
type Route = RouteProp<AuthStackParamList, 'ForgotPasswordCheckMail'>;

export const ForgotPasswordCheckMailScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { t } = useTranslation();

  const email = route.params?.email ?? '';

  const handleBackToLogin = () => {
    // Reset to SignIn pre-filled with the email so the user can re-enter
    // the password once the reset email lands. Using `navigate` to let
    // React Nav re-use the existing SignIn instance if it's already in
    // the stack (typical flow: SignIn -> ForgotRequest -> CheckMail).
    navigation.navigate('SignIn', { email });
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header} testID="forgot-checkmail-header">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('uac.common.back') as string}
          testID="forgot-checkmail-back"
          onPress={() => navigation.goBack()}
          style={styles.headerBackHit}
          hitSlop={8}
        >
          <Text style={styles.headerBackChevron}>‹</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        {/* Heading + supporting text */}
        <View style={styles.headingBlock}>
          <Text style={styles.heading} testID="forgot-checkmail-heading">
            {t('uac.forgot_check_mail.section_heading')}
          </Text>
          {/* Note: copy contains a deliberate double space per Figma spec */}
          <Text style={styles.supporting}>
            {t('uac.forgot_check_mail.body_line_a')}
          </Text>
        </View>

        {/* Email readout — non-interactive box, NOT a TextInput */}
        <View style={styles.emailReadout} accessibilityRole="text">
          <Text
            style={styles.emailValue}
            testID="forgot-checkmail-email-value"
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {email}
          </Text>
        </View>

        {/* Spam-folder hint */}
        <Text style={styles.spamHint} testID="forgot-checkmail-spam-hint">
          {t('uac.forgot_check_mail.body_line_c')}
        </Text>
      </ScrollView>

      {/* Primary CTA — Back to Login (no icon variant per Figma) */}
      <View style={styles.footer}>
        <Pressable
          testID="forgot-checkmail-back-to-login"
          accessibilityRole="button"
          accessibilityLabel={
            t('uac.forgot_check_mail.back_to_login_cta') as string
          }
          onPress={handleBackToLogin}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaLabel}>
            {t('uac.forgot_check_mail.back_to_login_cta')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.uacBackgroundNeutralSubtlest,
  },
  header: {
    height: theme.spacing.uacHeaderHeight,
    paddingHorizontal: theme.spacing.uacBodyPadding,
    justifyContent: 'flex-end',
    paddingBottom: theme.spacing.uacDimension16,
  },
  headerBackHit: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackChevron: {
    fontSize: 32,
    lineHeight: 32,
    color: theme.colors.uacTextBase,
  },
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
  emailReadout: {
    height: theme.spacing.uacButtonHeight,
    borderRadius: theme.borderRadius.uacTextField,
    backgroundColor: theme.colors.uacColorNeutral100,
    paddingHorizontal: theme.spacing.uacDimension16,
    justifyContent: 'center',
    marginBottom: theme.spacing.uacDimension16,
  },
  emailValue: {
    ...theme.typography.aliases.uacM3BodyLarge,
    color: theme.colors.uacTextSubtle100,
  },
  spamHint: {
    ...theme.typography.aliases.uacBodyMdRegular,
    color: theme.colors.uacTextBase,
  },
  footer: {
    paddingHorizontal: theme.spacing.uacBodyPadding,
    paddingBottom: theme.spacing.uacSafeAreaBottom + theme.spacing.uacDimension16,
    paddingTop: theme.spacing.uacDimension8,
  },
  cta: {
    height: theme.spacing.uacButtonHeight,
    borderRadius: theme.borderRadius.uacButtonCta,
    backgroundColor: theme.colors.uacBackgroundBase,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaLabel: {
    ...theme.typography.aliases.uacBodyMdMedium,
    color: theme.colors.uacTextPrimaryBase,
  },
});

export default ForgotPasswordCheckMailScreen;
