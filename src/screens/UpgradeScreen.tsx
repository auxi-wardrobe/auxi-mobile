import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Header } from '../components/layout/Header';
import { PressScale } from '../components/design-system/MMotion';
import { toast } from '../components/design-system/lib';
import { MacgieFace } from '../components/macgie';
import { GradientPillButton } from '../components/upgrade/GradientPillButton';
import { MacgiePlusWordmark } from '../components/upgrade/MacgiePlusWordmark';
import { Icons } from '../assets/icons';
import { theme } from '../theme/theme';
import { track } from '../services/analytics';
import { AppStackParamList } from '../types/navigation';
import type { LegalDocumentType } from '../content/legal';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Upgrade'>;
type PlanId = 'yearly' | 'monthly';

type SvgIcon = React.FC<{ width?: number; height?: number; color?: string }>;

// Feature grid (2 columns × 3 rows). `icon` is a bundled SVG; copy comes from
// the `upgrade.feature_*` translation keys so it lifts into i18n cleanly.
const FEATURES: Array<{ key: string; icon: SvgIcon }> = [
  { key: 'wardrobe', icon: Icons.Wardrobe },
  { key: 'see_on_me', icon: Icons.Sparkle },
  { key: 'suggestions', icon: Icons.GetDressed },
  { key: 'enhance', icon: Icons.Remix },
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

const PlanCard: React.FC<{
  selected: boolean;
  onPress: () => void;
  title: string;
  billing: string;
  price: string;
  badge?: string;
  saveTag?: string;
  testID: string;
}> = ({ selected, onPress, title, billing, price, badge, saveTag, testID }) => (
  <PressScale
    testID={testID}
    onPress={onPress}
    accessibilityLabel={`${title} ${price}`}
    style={[styles.plan, selected ? styles.planSelected : styles.planIdle]}
  >
    {badge ? (
      <View style={styles.bestValueBadge}>
        <Text style={styles.bestValueText}>{badge}</Text>
      </View>
    ) : null}
    <View style={styles.planRow}>
      <View
        style={[styles.radio, selected && styles.radioSelected]}
        testID={`${testID}-radio${selected ? '-selected' : ''}`}
      >
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={styles.planLabel}>
        <Text style={styles.planTitle}>{title}</Text>
        <Text style={styles.planBilling}>{billing}</Text>
      </View>
      <View style={styles.planPriceCol}>
        <Text style={styles.planPrice}>{price}</Text>
        {saveTag ? (
          <View style={styles.saveTag}>
            <Text style={styles.saveTagText}>{saveTag}</Text>
          </View>
        ) : null}
      </View>
    </View>
  </PressScale>
);

/**
 * Upgrade — the Macgie+ paywall (reached from the Settings "Upgrade to Macgie+"
 * pill). Brand wordmark hero, a 6-item feature grid, selectable Yearly/Monthly
 * plans and the gradient Subscribe CTA. There is no billing backend yet (see
 * CLAUDE.md), so Subscribe / Restore surface a toast placeholder; the plan
 * selection is local state.
 */
export const UpgradeScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const [plan, setPlan] = useState<PlanId>('yearly');

  const selectPlan = (next: PlanId) => {
    setPlan(next);
    track('upgrade_plan_selected', { plan: next });
  };

  const handleSubscribe = () => {
    track('upgrade_subscribe_tapped', { plan });
    toast.show({
      type: 'info',
      text1: t('upgrade.coming_soon_title'),
      text2: t('upgrade.coming_soon_body'),
      position: 'bottom',
      visibilityTime: 4000,
    });
  };

  const handleRestore = () => {
    track('upgrade_restore_tapped');
    toast.show({
      type: 'info',
      text1: t('upgrade.coming_soon_title'),
      text2: t('upgrade.restore_body'),
      position: 'bottom',
      visibilityTime: 4000,
    });
  };

  const openLegalDocument = (documentType: LegalDocumentType) => {
    navigation.navigate('LegalDocument', { documentType, source: 'settings' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header.BackTitle
        title={t('upgrade.title')}
        onBack={navigation.goBack}
        leftTestID="upgrade-back-button"
        leftAccessibilityLabel={t('settings.a11y_back')}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero — cat mark + "Upgrade to" + gradient wordmark + paws */}
        <View style={styles.hero}>
          <MacgieFace size={18} />
          <Text style={styles.heroLead}>{t('upgrade.hero_lead')}</Text>
          <MacgiePlusWordmark fontSize={14} />
          <Text style={styles.paws}>🐾</Text>
        </View>
        <Text style={styles.subtitle}>{t('upgrade.subtitle')}</Text>

        {/* Feature grid */}
        <View style={styles.featureGrid}>
          {FEATURES.map(f => (
            <FeatureItem
              key={f.key}
              icon={f.icon}
              title={t(`upgrade.feature_${f.key}_title`)}
              subtitle={t(`upgrade.feature_${f.key}_subtitle`)}
              testID={`upgrade-feature-${f.key}`}
            />
          ))}
        </View>

        {/* Plans */}
        <View style={styles.plans}>
          <PlanCard
            testID="upgrade-plan-yearly"
            selected={plan === 'yearly'}
            onPress={() => selectPlan('yearly')}
            title={t('upgrade.plan_yearly_title')}
            billing={t('upgrade.plan_yearly_billing')}
            price={t('upgrade.plan_yearly_price')}
            badge={t('upgrade.plan_best_value')}
            saveTag={t('upgrade.plan_yearly_save')}
          />
          <PlanCard
            testID="upgrade-plan-monthly"
            selected={plan === 'monthly'}
            onPress={() => selectPlan('monthly')}
            title={t('upgrade.plan_monthly_title')}
            billing={t('upgrade.plan_monthly_billing')}
            price={t('upgrade.plan_monthly_price')}
          />
        </View>

        {/* Subscribe CTA */}
        <GradientPillButton
          testID="upgrade-subscribe-button"
          accessibilityLabel={t('upgrade.subscribe')}
          onPress={handleSubscribe}
          rightIcon={Icons.ChevronRight}
        >
          {t('upgrade.subscribe')}
        </GradientPillButton>

        {/* Trust row */}
        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <Text style={styles.trustTitle}>{t('upgrade.secure_title')}</Text>
            <Text style={styles.trustSubtitle}>
              {t('upgrade.secure_subtitle')}
            </Text>
          </View>
          <PressScale
            testID="upgrade-restore-button"
            onPress={handleRestore}
            accessibilityLabel={t('upgrade.restore')}
            style={styles.trustItem}
          >
            <Text style={styles.trustTitle}>{t('upgrade.restore')}</Text>
          </PressScale>
        </View>

        {/* Legal footer */}
        <View style={styles.legalRow}>
          <PressScale
            testID="upgrade-terms-link"
            onPress={() => openLegalDocument('terms')}
            accessibilityLabel={t('settings.terms_of_service')}
          >
            <Text style={styles.legalLink}>{t('settings.terms_of_service')}</Text>
          </PressScale>
          <PressScale
            testID="upgrade-privacy-link"
            onPress={() => openLegalDocument('privacy')}
            accessibilityLabel={t('settings.privacy_policy')}
          >
            <Text style={styles.legalLink}>{t('settings.privacy_policy')}</Text>
          </PressScale>
          <PressScale
            testID="upgrade-restore-link"
            onPress={handleRestore}
            accessibilityLabel={t('upgrade.restore')}
          >
            <Text style={styles.legalLink}>{t('upgrade.restore')}</Text>
          </PressScale>
        </View>
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
  heroLead: {
    ...theme.typography.aliases.poppinsSemiboldXsSm, // Poppins SemiBold 14/20
    color: theme.ds.color.ink,
  },
  paws: {
    fontSize: 14,
  },
  subtitle: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.ds.color.onVariant,
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
    ...theme.typography.aliases.poppinsBodySm,
    fontSize: 12,
    lineHeight: 16,
    color: theme.ds.color.onVariant,
  },
  plans: {
    gap: 12,
    marginBottom: theme.spacing.l,
  },
  plan: {
    borderRadius: theme.ds.radius.md,
    borderWidth: 1.5,
    paddingVertical: theme.spacing.m,
    paddingHorizontal: theme.spacing.m,
  },
  planIdle: {
    borderColor: theme.ds.color.warm100,
    backgroundColor: theme.ds.color.white,
  },
  planSelected: {
    borderColor: theme.ds.color.tan,
    backgroundColor: theme.ds.color.cream,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -12,
    left: theme.spacing.m,
    backgroundColor: '#7C4DFF',
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  bestValueText: {
    ...theme.typography.aliases.poppinsSemiboldXs,
    color: theme.ds.color.white,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.ds.color.tanStroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: theme.ds.color.ink,
    backgroundColor: theme.ds.color.ink,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.ds.color.white,
  },
  planLabel: {
    flex: 1,
    gap: 2,
  },
  planTitle: {
    ...theme.typography.aliases.uacH4Bold,
    fontSize: 20,
    lineHeight: 26,
    color: theme.ds.color.ink,
  },
  planBilling: {
    ...theme.typography.aliases.poppinsBodySm,
    color: theme.ds.color.onVariant,
  },
  planPriceCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  planPrice: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.ds.color.ink,
  },
  saveTag: {
    backgroundColor: theme.ds.color.ink,
    borderRadius: theme.borderRadius.m,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  saveTagText: {
    ...theme.typography.aliases.poppinsSemiboldXs,
    color: theme.ds.color.white,
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.l,
    marginBottom: theme.spacing.m,
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  trustTitle: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    fontSize: 12,
    lineHeight: 16,
    color: theme.ds.color.ink,
  },
  trustSubtitle: {
    ...theme.typography.aliases.poppinsBodySm,
    fontSize: 12,
    lineHeight: 16,
    color: theme.ds.color.onVariant,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.s,
  },
  legalLink: {
    ...theme.typography.aliases.poppinsBodySm,
    fontSize: 12,
    lineHeight: 16,
    color: theme.ds.color.onVariant,
  },
});
