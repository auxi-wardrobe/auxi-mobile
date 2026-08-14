import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/layout/Header';
import { MButton } from '../components/design-system/lib';
import { MacgieFace } from '../components/macgie';
import { MacgiePlusWordmark } from '../components/upgrade/MacgiePlusWordmark';
import { Icons } from '../assets/icons';
import EnhanceIcon from '../assets/images/icon_upgrade_enhance.svg';
import SuggestionsIcon from '../assets/images/icon_upgrade_suggestions.svg';
import { theme } from '../theme/theme';
import { AppStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'NotifyMe'>;

type SvgIcon = React.FC<{ width?: number; height?: number; color?: string }>;

// Feature grid — the SAME 6 rows as UpgradeScreen (AU-442 extraction locked
// decision #2: drop the 2 extra Figma rows, "Unlimited Capsule" /
// "Wardrobe analysis" — duplicate-copy placeholder rows Figma didn't finish).
// Reuses the shipped `upgrade.feature_*` i18n keys verbatim (locked decision
// #3: keep the existing "50 enhancements/ month" copy, not Figma's "100").
const FEATURES: Array<{ key: string; icon: SvgIcon }> = [
  { key: 'wardrobe', icon: Icons.Wardrobe },
  { key: 'see_on_me', icon: Icons.Sparkle },
  { key: 'suggestions', icon: SuggestionsIcon },
  { key: 'enhance', icon: EnhanceIcon },
  { key: 'schedule', icon: Icons.Calendar },
  { key: 'canvas', icon: Icons.OutfitCanvas },
];

const FeatureItem: React.FC<{
  icon: SvgIcon;
  title: string;
  subtitle: string;
  testID: string;
}> = ({ icon: Icon, title, subtitle, testID }) => (
  <View style={styles.feature} testID={testID}>
    <View style={styles.featureIcon}>
      <Icon width={16} height={16} color={theme.ds.color.ink} />
    </View>
    <View style={styles.featureText}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureSubtitle}>{subtitle}</Text>
    </View>
  </View>
);

/**
 * NotifyMeScreen — the "Macgie+ is coming soon" follow-up screen (AU-442
 * soft-paywall MVP), reached from `UsageLimitSheet`'s "Upgrade to Macgie+"
 * CTA. Figma node `5078:13760`. Single "Notify me" CTA, no purchase flow —
 * NOT the real RevenueCat paywall (`UpgradeScreen`, deliberately dark via
 * `SHOW_UPGRADE_PAYWALL`); this screen must never route into it.
 *
 * Hero reuses the same MacgieFace + gradient wordmark pattern already shipped
 * on `UpgradeScreen` — the Figma frame's "3-photo collage hero" has no
 * matching reusable component/asset in the app, so this pass substitutes the
 * actual on-system hero rather than inventing new photo assets (flagged for
 * the designer gate).
 *
 * "Notify me" tap is local-only (no network call, per phase-02 spec): label
 * swaps to a confirmed state and the button goes inert in place (AU-442
 * extraction locked decision #4) — no toast, no new component.
 */
export const NotifyMeScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const [notified, setNotified] = useState(false);

  const handleClose = () => {
    navigation.goBack();
  };

  const handleNotify = () => {
    if (notified) return;
    setNotified(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title={t('notifyMe.title')}
        leftIcon={<Icons.Close width={24} height={24} />}
        onBack={handleClose}
        leftTestID="notify-me-close-button"
        leftAccessibilityLabel={t('notifyMe.close')}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — Macgie mark + gradient wordmark + "is coming soon." */}
        <View style={styles.hero}>
          <MacgieFace size={18} />
          <MacgiePlusWordmark fontSize={14} />
        </View>
        <Text style={styles.subtitle}>{t('notifyMe.wordmark_subtitle')}</Text>

        {/* Feature grid */}
        <View style={styles.featureGrid}>
          {FEATURES.map(f => (
            <FeatureItem
              key={f.key}
              icon={f.icon}
              title={t(`upgrade.feature_${f.key}_title`)}
              subtitle={t(`upgrade.feature_${f.key}_subtitle`)}
              testID={`notify-me-feature-${f.key}`}
            />
          ))}
        </View>

        <MButton
          variant="primary"
          disabled={notified}
          onPress={handleNotify}
          testID={notified ? 'notify-me-cta-confirmed' : 'notify-me-cta'}
          accessibilityLabel={
            notified ? t('notifyMe.notify_confirmed') : t('notifyMe.notify_cta')
          }
        >
          {notified ? t('notifyMe.notify_confirmed') : t('notifyMe.notify_cta')}
        </MButton>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  content: {
    paddingHorizontal: theme.spacing.l,
    paddingBottom: theme.spacing.xl,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: theme.spacing.s,
  },
  subtitle: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.ds.color.ink,
    textAlign: 'center',
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.l,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: theme.spacing.l,
    marginBottom: theme.spacing.l,
  },
  feature: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: theme.spacing.s,
  },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: theme.ds.radius.sm,
    backgroundColor: theme.ds.color.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    fontSize: 12,
    lineHeight: 16,
    color: theme.ds.color.ink,
  },
  featureSubtitle: {
    ...theme.typography.aliases.interBodySm,
    fontSize: 12,
    lineHeight: 16,
    color: theme.ds.color.onVariant,
  },
});
