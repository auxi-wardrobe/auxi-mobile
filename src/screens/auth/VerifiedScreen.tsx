/**
 * AU-242 Phase 04 Batch B — Verified! (terminal success).
 *
 * Spec: plans/260521-2335-au-242-figma-spec/13-verified-success.md
 * Figma node: 2849:10099
 *
 * Convergence point for BOTH:
 *   - Signup email verification (`source: 'signup'`)
 *   - Password reset (`source: 'reset'`)
 *
 * Single component; behavior diff lives in the Continue handler:
 *   - signup → if AuthContext has a user (deep-link verify mutation
 *     already established the session), navigate to Home via root
 *     stack. Otherwise pop to Welcome and let the user sign in.
 *   - reset → navigate to SignIn with pre-filled email (if any).
 *
 * No header, no back button — terminal screen. iOS swipe-back is
 * suppressed via `gestureEnabled: false` configured in AuthNavigator
 * (foundation). On Android, hardware back is best-effort no-op (RN
 * gesture handler default).
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { theme } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import type { AuthStackParamList } from '../../types/navigation';

type Navigation = NativeStackNavigationProp<AuthStackParamList, 'Verified'>;
type Route = RouteProp<AuthStackParamList, 'Verified'>;

export const VerifiedScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { t } = useTranslation();
  const { user, pendingVerifyEmail } = useAuth();

  const source = route.params?.source ?? 'signup';

  const onContinue = useCallback(() => {
    if (source === 'reset') {
      // After password reset, fall through to SignIn with last-known
      // email (if AuthContext stashed it during the forgot flow).
      navigation.navigate('SignIn', { email: pendingVerifyEmail ?? '' });
      return;
    }
    // signup branch
    if (user) {
      // Session already restored by verify-email mutation. Reset the
      // auth stack — the root AppNavigator's `user` gate will swap
      // to the main stack on the next render.
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        }),
      );
      return;
    }
    // No session — back to Welcome so the user can sign in fresh.
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      }),
    );
  }, [source, user, pendingVerifyEmail, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.hero}>
        {/* Same Group42 illustration placeholder as VerifyEmail —
            real asset is consolidated in batch-D logo component. */}
        <View style={styles.illustration} testID="verified-illustration" />

        <Text style={styles.headline} testID="verified-headline">
          {t('uac.verified.headline')}
        </Text>
        <Text style={styles.body} testID="verified-body">
          {t('uac.verified.body')}
        </Text>
      </View>

      <View style={styles.ctaWrap}>
        <Pressable
          testID={`verified-continue-button-${source}`}
          accessibilityRole="button"
          accessibilityLabel={t('uac.verified.continue_cta')}
          onPress={onContinue}
          style={({ pressed }) => [styles.ctaBtn, pressed && styles.pressed]}
        >
          <Text style={styles.ctaLabel}>{t('uac.verified.continue_cta')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.uacBackgroundNeutral50,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.uacBodyPadding,
  },
  illustration: {
    width: 130,
    height: 90,
    marginBottom: theme.spacing.uacDimension24,
    backgroundColor: theme.colors.uacColorNeutral100,
    borderRadius: theme.borderRadius.uacPanel,
  },
  headline: {
    ...theme.typography.aliases.uacH4Bold,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
    marginBottom: 3, // unusually tight gap per spec note
  },
  body: {
    ...theme.typography.aliases.uacBodyMdRegular,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  ctaWrap: {
    paddingHorizontal: theme.spacing.uacBodyPadding,
    paddingBottom: theme.spacing.uacDimension24,
  },
  ctaBtn: {
    height: theme.spacing.uacButtonHeight,
    borderRadius: theme.borderRadius.uacButtonCta,
    backgroundColor: theme.colors.figmaPrimaryButtonBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    ...theme.typography.aliases.uacBodyMdMedium,
    color: theme.colors.figmaPrimaryButtonText,
  },
  pressed: {
    opacity: 0.7,
  },
});
