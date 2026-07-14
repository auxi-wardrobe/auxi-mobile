import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { PurchasesPackage } from 'react-native-purchases';
import { Header } from '../components/layout/Header';
import { PressScale } from '../components/design-system/MMotion';
import { toast } from '../components/design-system/lib';
import { MacgieFace } from '../components/macgie';
import { GradientPillButton } from '../components/upgrade/GradientPillButton';
import { BrandGradientFill } from '../components/upgrade/BrandGradientFill';
import { MacgiePlusWordmark } from '../components/upgrade/MacgiePlusWordmark';
import { Icons } from '../assets/icons';
import EnhanceIcon from '../assets/images/icon_upgrade_enhance.svg';
import SuggestionsIcon from '../assets/images/icon_upgrade_suggestions.svg';
import SecureIcon from '../assets/images/icon_upgrade_secure.svg';
import { theme } from '../theme/theme';
import {
  track,
  trackPurchaseStarted,
  trackPurchaseSucceeded,
  trackPurchaseFailed,
  trackPurchaseRestored,
  type PurchaseFailureReason,
} from '../services/analytics';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  hasMacgiePlusEntitlement,
  isUserCancelled,
} from '../services/revenueCat';
import { useAuth } from '../context/AuthContext';
import { AppStackParamList } from '../types/navigation';
import type { LegalDocumentType } from '../content/legal';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Upgrade'>;
type UpgradeRoute = RouteProp<AppStackParamList, 'Upgrade'>;
type PlanId = 'yearly' | 'monthly';

// Maps our two plan ids onto RevenueCat package identifiers. RevenueCat's
// standard package types are '$rc_annual' / '$rc_monthly'; we match on the
// identifier suffix so a custom offering naming also resolves. The resolved
// package carries the localized `priceString` (AU-418) and is what we purchase.
const findPackage = (
  packages: PurchasesPackage[],
  planId: PlanId,
): PurchasesPackage | undefined => {
  const needle = planId === 'yearly' ? 'annual' : 'monthly';
  const rcType = planId === 'yearly' ? '$rc_annual' : '$rc_monthly';
  return (
    packages.find(p => p.identifier === rcType) ??
    packages.find(p => p.identifier.toLowerCase().includes(needle)) ??
    packages.find(p => p.packageType.toLowerCase().includes(needle))
  );
};

// The plan pre-selected when the paywall opens. Reported as `default_plan` on
// `paywall_viewed` so the view→select funnel knows the starting state.
const DEFAULT_PLAN: PlanId = 'yearly';

type SvgIcon = React.FC<{ width?: number; height?: number; color?: string }>;

// Feature grid (2 columns × 3 rows). `icon` is a bundled SVG; copy comes from
// the `upgrade.feature_*` translation keys so it lifts into i18n cleanly.
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
        <BrandGradientFill />
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
 * plans and the gradient Subscribe CTA.
 *
 * Real IAP via RevenueCat: offerings load on mount and drive the localized
 * plan prices (`priceString`, AU-418); Subscribe purchases the selected package
 * and Restore restores prior purchases. On a successful purchase/restore that
 * carries the `macgie_plus` entitlement the user is flipped to premium
 * optimistically for instant UX — the backend webhook is the durable authority.
 *
 * The whole screen is still gated dark by `SHOW_UPGRADE_PAYWALL` (false) in
 * SettingsScreen, and RC stays unconfigured until a key is provisioned, so this
 * flow is not reachable in production yet.
 */
export const UpgradeScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Navigation>();
  const route = useRoute<UpgradeRoute>();
  const { markPremiumOptimistic, refreshUser } = useAuth();
  const source = route.params?.source ?? 'settings';
  const [plan, setPlan] = useState<PlanId>(DEFAULT_PLAN);

  // Offerings state. `packages` empty + not-loading = offerings failed / none
  // available → the plan cards fall back to the static i18n prices and Subscribe
  // reports a not-configured failure rather than crashing.
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const yearlyPkg = findPackage(packages, 'yearly');
  const monthlyPkg = findPackage(packages, 'monthly');
  const selectedPkg = plan === 'yearly' ? yearlyPkg : monthlyPkg;

  // Load the current offering once on mount. Failure is non-fatal: we keep the
  // static i18n prices and surface a soft error toast.
  useEffect(() => {
    let active = true;
    (async () => {
      setOfferingsLoading(true);
      const offering = await getOfferings();
      if (!active) return;
      if (offering) {
        setPackages(offering.availablePackages);
      } else {
        toast.show({
          type: 'error',
          text1: t('upgrade.offerings_error_title'),
          text2: t('upgrade.offerings_error_body'),
          position: 'bottom',
          visibilityTime: 4000,
        });
      }
      setOfferingsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [t]);

  // Funnel denominator: fire once per focus so view→tap→subscribe conversion is
  // computable. `source` mirrors `upgrade_entry_tapped`; `default_plan` is the
  // initially-selected plan.
  useFocusEffect(
    useCallback(() => {
      track('paywall_viewed', { source, default_plan: DEFAULT_PLAN });
    }, [source]),
  );

  const selectPlan = (next: PlanId) => {
    setPlan(next);
    track('upgrade_plan_selected', { plan: next });
  };

  const handleBack = () => {
    track('paywall_dismissed', { source });
    navigation.goBack();
  };

  // On a successful purchase/restore that carries the entitlement, flip to
  // premium optimistically then reconcile with server truth (webhook-synced
  // is_premium). refreshUser failure is non-fatal — the optimistic flip stands.
  const applyPremium = useCallback(async () => {
    markPremiumOptimistic();
    try {
      await refreshUser();
    } catch {
      /* server reconcile is best-effort; optimistic flip already applied */
    }
  }, [markPremiumOptimistic, refreshUser]);

  const handleSubscribe = async () => {
    track('upgrade_subscribe_tapped', { plan });
    if (purchasing) return;
    // Offerings not loaded / package missing → can't purchase; report as a
    // sanitized failure and bail with a soft error.
    if (!selectedPkg) {
      trackPurchaseStarted(plan);
      trackPurchaseFailed('not_configured');
      toast.show({
        type: 'error',
        text1: t('upgrade.offerings_error_title'),
        text2: t('upgrade.offerings_error_body'),
        position: 'bottom',
        visibilityTime: 4000,
      });
      return;
    }
    trackPurchaseStarted(plan);
    setPurchasing(true);
    try {
      const customerInfo = await purchasePackage(selectedPkg);
      if (hasMacgiePlusEntitlement(customerInfo)) {
        trackPurchaseSucceeded(plan, selectedPkg.product.identifier);
        await applyPremium();
        toast.show({
          type: 'success',
          text1: t('upgrade.purchase_success_title'),
          text2: t('upgrade.purchase_success_body'),
          position: 'bottom',
          visibilityTime: 4000,
        });
        navigation.goBack();
      } else {
        // Purchase resolved but entitlement not active (rare — e.g. deferred /
        // pending). Treat as a store error rather than a success.
        trackPurchaseFailed('store_error');
        toast.show({
          type: 'error',
          text1: t('upgrade.purchase_error_title'),
          text2: t('upgrade.purchase_error_body'),
          position: 'bottom',
          visibilityTime: 4000,
        });
      }
    } catch (err) {
      const reason: PurchaseFailureReason = isUserCancelled(err)
        ? 'user_cancelled'
        : 'store_error';
      trackPurchaseFailed(reason);
      // Don't nag the user with a toast when they deliberately backed out.
      if (reason !== 'user_cancelled') {
        toast.show({
          type: 'error',
          text1: t('upgrade.purchase_error_title'),
          text2: t('upgrade.purchase_error_body'),
          position: 'bottom',
          visibilityTime: 4000,
        });
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async (restoreSource: 'trust_row' | 'legal_row') => {
    track('upgrade_restore_tapped', { source: restoreSource });
    if (restoring) return;
    setRestoring(true);
    try {
      const customerInfo = await restorePurchases();
      const found = hasMacgiePlusEntitlement(customerInfo);
      trackPurchaseRestored(found);
      if (found) {
        await applyPremium();
        toast.show({
          type: 'success',
          text1: t('upgrade.restore_success_title'),
          text2: t('upgrade.restore_success_body'),
          position: 'bottom',
          visibilityTime: 4000,
        });
        navigation.goBack();
      } else {
        toast.show({
          type: 'info',
          text1: t('upgrade.restore_none_title'),
          text2: t('upgrade.restore_none_body'),
          position: 'bottom',
          visibilityTime: 4000,
        });
      }
    } catch {
      // A real store error during restore. Not counted as a restore outcome.
      toast.show({
        type: 'error',
        text1: t('upgrade.purchase_error_title'),
        text2: t('upgrade.purchase_error_body'),
        position: 'bottom',
        visibilityTime: 4000,
      });
    } finally {
      setRestoring(false);
    }
  };

  const openLegalDocument = (documentType: LegalDocumentType) => {
    navigation.navigate('LegalDocument', { documentType, source: 'settings' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header.BackTitle
        title={t('upgrade.title')}
        onBack={handleBack}
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

        {/* Plans — prices come from RevenueCat `priceString` (localized,
            store-authoritative); fall back to the static i18n price only while
            offerings are loading or unavailable. */}
        <View style={styles.plans}>
          <PlanCard
            testID="upgrade-plan-yearly"
            selected={plan === 'yearly'}
            onPress={() => selectPlan('yearly')}
            title={t('upgrade.plan_yearly_title')}
            billing={t('upgrade.plan_yearly_billing')}
            price={
              yearlyPkg?.product.priceString ?? t('upgrade.plan_yearly_price')
            }
            badge={t('upgrade.plan_best_value')}
            saveTag={t('upgrade.plan_yearly_save')}
          />
          <PlanCard
            testID="upgrade-plan-monthly"
            selected={plan === 'monthly'}
            onPress={() => selectPlan('monthly')}
            title={t('upgrade.plan_monthly_title')}
            billing={t('upgrade.plan_monthly_billing')}
            price={
              monthlyPkg?.product.priceString ?? t('upgrade.plan_monthly_price')
            }
          />
        </View>

        {/* Subscribe CTA */}
        <GradientPillButton
          testID="upgrade-subscribe-button"
          accessibilityLabel={t('upgrade.subscribe')}
          onPress={handleSubscribe}
          disabled={purchasing || offeringsLoading}
          rightIcon={purchasing ? undefined : Icons.ChevronRight}
        >
          {purchasing ? (
            <ActivityIndicator color={theme.ds.color.white} />
          ) : (
            t('upgrade.subscribe')
          )}
        </GradientPillButton>

        {/* Trust row */}
        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <SecureIcon width={24} height={24} color={theme.ds.color.ink} />
            <View style={styles.trustTextCol}>
              <Text style={styles.trustTitle}>{t('upgrade.secure_title')}</Text>
              <Text style={styles.trustSubtitle}>
                {t('upgrade.secure_subtitle')}
              </Text>
            </View>
          </View>
          <PressScale
            testID="upgrade-restore-button"
            onPress={() => handleRestore('trust_row')}
            accessibilityLabel={t('upgrade.restore')}
            style={styles.trustItem}
          >
            <Icons.Change width={24} height={24} color={theme.ds.color.ink} />
            <View style={styles.trustTextCol}>
              <Text style={styles.trustTitle}>{t('upgrade.restore')}</Text>
            </View>
          </PressScale>
        </View>

        {/* Legal footer */}
        <View style={styles.legalRow}>
          <PressScale
            testID="upgrade-terms-link"
            onPress={() => openLegalDocument('terms')}
            accessibilityLabel={t('settings.terms_of_service')}
          >
            <Text style={styles.legalLink}>
              {t('settings.terms_of_service')}
            </Text>
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
            onPress={() => handleRestore('legal_row')}
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
    fontSize: 12,
    lineHeight: 16,
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
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: 12,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  bestValueText: {
    ...theme.typography.aliases.poppinsSemiboldXs,
    fontSize: 12,
    lineHeight: 16,
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
    fontSize: 14,
    lineHeight: 18,
    color: theme.ds.color.ink,
  },
  planBilling: {
    ...theme.typography.aliases.poppinsBodySm,
    fontSize: 14,
    lineHeight: 18,
    color: theme.ds.color.onVariant,
  },
  planPriceCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  planPrice: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    fontSize: 14,
    lineHeight: 18,
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
    fontSize: 14,
    lineHeight: 18,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustTextCol: {
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
