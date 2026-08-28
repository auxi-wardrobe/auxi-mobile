import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MButton } from '../../components/design-system/lib';
import { Shimmer } from '../../components/features/Shimmer';
import { TILE_WIDTH } from './discovery-grid';
import { discoveryFeedStyles as styles } from './discoveryFeedStyles';

const TILE_HEIGHT = TILE_WIDTH * (4 / 3);

/** First-load skeleton — 6 shimmer tiles filling out the 2-column grid. */
export const DiscoveryFeedLoadingGrid: React.FC = () => (
  <View style={styles.grid}>
    {Array.from({ length: 6 }).map((_, index) => (
      <Shimmer
        key={`discovery-loading-tile-${index}`}
        width={TILE_WIDTH}
        height={TILE_HEIGHT}
        testID={`discovery-loading-tile-${index}`}
      />
    ))}
  </View>
);

/** Pagination-in-flight footer for the FlatList. */
export const DiscoveryFeedLoadingMoreFooter: React.FC = () => (
  <View style={styles.footerLoading}>
    <Shimmer width={TILE_WIDTH} height={TILE_HEIGHT} testID="discovery-loading-more" />
  </View>
);

/** Transport failure — distinct from the "no outfits" empty state below. */
export const DiscoveryFeedError: React.FC<{ onRetry: () => void }> = ({
  onRetry,
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.centerState} testID="discovery-error-state">
      <Text style={styles.stateTitle}>{t('discovery.error_title')}</Text>
      <Text style={styles.stateBody}>{t('common.try_again_moment')}</Text>
      <View style={styles.retryWrap}>
        <MButton
          variant="secondary"
          onPress={onRetry}
          testID="discovery-retry"
          accessibilityLabel={t('common.a11y_retry_load')}
        >
          {t('common.retry')}
        </MButton>
      </View>
    </View>
  );
};

/**
 * Empty result set — copy is distinct depending on whether a filter is
 * active ("no matches") vs the unfiltered feed genuinely having no published
 * outfits yet (phase 07 requirement).
 */
export const DiscoveryFeedEmpty: React.FC<{ isFilterActive: boolean }> = ({
  isFilterActive,
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.centerState} testID="discovery-empty-state">
      <Text style={styles.stateTitle}>
        {isFilterActive
          ? t('discovery.empty_filtered_title')
          : t('discovery.empty_title')}
      </Text>
      <Text style={styles.stateBody}>
        {isFilterActive
          ? t('discovery.empty_filtered_body')
          : t('discovery.empty_body')}
      </Text>
    </View>
  );
};
