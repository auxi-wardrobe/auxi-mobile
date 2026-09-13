import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MButton } from '../../components/design-system/lib';
import { Shimmer } from '../../components/features/Shimmer';
import { GRID_COLUMNS, TILE_WIDTH } from './discovery-grid';
import { discoveryFeedStyles as styles } from './discoveryFeedStyles';

// Uneven on purpose: the skeleton announces the masonry that is about to
// land, so a column of identical boxes would be a small lie about the layout.
// Ratios are height-as-multiple-of-column-width, laid out column by column.
const SKELETON_COLUMNS = [
  [1.25, 0.85, 1.1],
  [0.9, 1.35, 1.0],
];

const FOOTER_TILE_HEIGHT = TILE_WIDTH * (4 / 3);

/** First-load skeleton — 6 shimmer tiles filling out the masonry columns. */
export const DiscoveryFeedLoadingGrid: React.FC = () => (
  <View style={styles.grid}>
    {SKELETON_COLUMNS.slice(0, GRID_COLUMNS).map((column, columnIndex) => (
      <View
        key={`discovery-loading-column-${columnIndex}`}
        style={styles.masonryColumn}
      >
        {column.map((ratio, rowIndex) => {
          const index = columnIndex + rowIndex * GRID_COLUMNS;
          return (
            <Shimmer
              key={`discovery-loading-tile-${index}`}
              width={TILE_WIDTH}
              height={Math.round(TILE_WIDTH * ratio)}
              testID={`discovery-loading-tile-${index}`}
            />
          );
        })}
      </View>
    ))}
  </View>
);

/** Pagination-in-flight footer for the feed. */
export const DiscoveryFeedLoadingMoreFooter: React.FC = () => (
  <View style={styles.footerLoading}>
    <Shimmer
      width={TILE_WIDTH}
      height={FOOTER_TILE_HEIGHT}
      testID="discovery-loading-more"
    />
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
