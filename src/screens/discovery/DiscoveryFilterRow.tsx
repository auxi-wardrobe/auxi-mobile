import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MChip } from '../../components/design-system/lib';
import { theme } from '../../theme/theme';
import type { DiscoverySeason } from '../../services/discoveryService';

const SEASONS: DiscoverySeason[] = ['spring', 'summer', 'fall', 'winter'];

interface DiscoveryFilterRowProps {
  /** `null` = the "All" season chip is selected. */
  season: DiscoverySeason | null;
  onSeasonChange: (season: DiscoverySeason | null) => void;
  /** `null` = no trend-tag filter active. */
  trendTag: string | null;
  onTrendTagChange: (tag: string | null) => void;
  trendTags: string[];
}

/**
 * Season chips (4 fixed + "All") + trend-tag chips derived from
 * `useDiscoveryTrendTags()`. Single-select per axis, combinable across axes
 * (season AND tag can both be active) — two independent horizontal-scroll
 * rows so neither axis's chip count crowds the other.
 */
export const DiscoveryFilterRow: React.FC<DiscoveryFilterRowProps> = ({
  season,
  onSeasonChange,
  trendTag,
  onTrendTagChange,
  trendTags,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <MChip
          selected={season === null}
          onPress={() => onSeasonChange(null)}
          testID="discovery-chip-season-all"
          accessibilityLabel={t('discovery.filter.all')}
        >
          {t('discovery.filter.all')}
        </MChip>
        {SEASONS.map(value => (
          <MChip
            key={value}
            selected={season === value}
            onPress={() => onSeasonChange(season === value ? null : value)}
            testID={`discovery-chip-season-${value}`}
            accessibilityLabel={t(`discovery.filter.season_${value}`)}
          >
            {t(`discovery.filter.season_${value}`)}
          </MChip>
        ))}
      </ScrollView>

      {trendTags.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {trendTags.map(tag => (
            <MChip
              key={tag}
              selected={trendTag === tag}
              onPress={() => onTrendTagChange(trendTag === tag ? null : tag)}
              testID={`discovery-chip-tag-${tag}`}
              accessibilityLabel={tag}
            >
              {tag}
            </MChip>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.m,
  },
});
