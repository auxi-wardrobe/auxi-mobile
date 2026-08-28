import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MButton } from '../../components/design-system/lib';
import { MacgieLoader } from '../../components/macgie';
import { discoveryOutfitDetailStyles as styles } from './discoveryOutfitDetailStyles';

/** Full-bleed loading spinner while the outfit fetch is in flight. */
export const DiscoveryDetailLoading: React.FC = () => (
  <View style={styles.centerState}>
    <MacgieLoader testID="discovery-detail-loading" />
  </View>
);

/**
 * 404 state — `discoveryService.getOutfit` resolves `null` for BOTH a
 * missing and an unpublished outfit (identical envelope, by backend design),
 * so this copy never claims either specifically. `onBrowse` is the "graceful
 * fallback" the deep-link plan calls for (phase 09 §3): toast + navigate back
 * to the feed, driven from here rather than the deep-link handler itself
 * (route-then-resolve — one network path, works identically cold or warm).
 */
export const DiscoveryDetailUnavailable: React.FC<{ onBrowse: () => void }> = ({
  onBrowse,
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.centerState} testID="discovery-detail-unavailable">
      <Text style={styles.stateTitle}>{t('discovery.outfit_unavailable_title')}</Text>
      <Text style={styles.stateBody}>{t('discovery.outfit_unavailable_body')}</Text>
      <View style={styles.retryWrap}>
        <MButton
          variant="secondary"
          onPress={onBrowse}
          testID="discovery-detail-browse-btn"
          accessibilityLabel={t('discovery.browse_discovery_cta')}
        >
          {t('discovery.browse_discovery_cta')}
        </MButton>
      </View>
    </View>
  );
};

/** Genuine transport failure (network/5xx) — distinct from the 404 above. */
export const DiscoveryDetailError: React.FC<{ onRetry: () => void }> = ({
  onRetry,
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.centerState} testID="discovery-detail-error">
      <Text style={styles.stateTitle}>{t('discovery.error_title')}</Text>
      <Text style={styles.stateBody}>{t('common.try_again_moment')}</Text>
      <View style={styles.retryWrap}>
        <MButton
          variant="secondary"
          onPress={onRetry}
          testID="discovery-detail-retry"
          accessibilityLabel={t('common.a11y_retry_load')}
        >
          {t('common.retry')}
        </MButton>
      </View>
    </View>
  );
};
