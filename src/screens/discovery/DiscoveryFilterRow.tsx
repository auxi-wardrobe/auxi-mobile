import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FilterSummaryChip } from '../../components/features/FilterSummaryChip';
import { theme } from '../../theme/theme';
import type { DiscoverySeason } from '../../services/discoveryService';
import { HORIZONTAL_PADDING } from './discovery-grid';
import { DiscoveryFilterSheet } from './DiscoveryFilterSheet';
import {
  DISCOVERY_SEASONS,
  summaryLabel,
  toggleSeason,
  toggleTrendTag,
} from './discovery-filter';

interface DiscoveryFilterRowProps {
  /** Committed season selection. Empty === "All season". */
  seasons: DiscoverySeason[];
  onSeasonsChange: (seasons: DiscoverySeason[]) => void;
  /** Committed trend-tag selection. Empty === every tag. */
  selectedTrendTags: string[];
  onTrendTagsChange: (tags: string[]) => void;
  /** Every tag the backend currently serves (`/discovery/trend-tags`). */
  trendTags: string[];
}

/**
 * Discovery filter bar — the same interaction as the wardrobe grid's
 * (`WardrobeFilterSortBar`): two summary pills, each opening a bottom sheet of
 * MULTI-select chips committed on "Show". Season defaults to "All season" and
 * tags to "All tags"; both axes accept more than one value at a time.
 *
 * Replaces the two horizontal chip rows this screen shipped with, which were
 * single-select per axis and off-pattern next to the wardrobe.
 */
export const DiscoveryFilterRow: React.FC<DiscoveryFilterRowProps> = ({
  seasons,
  onSeasonsChange,
  selectedTrendTags,
  onTrendTagsChange,
  trendTags,
}) => {
  const { t } = useTranslation();
  const [seasonSheetVisible, setSeasonSheetVisible] = useState(false);
  const [tagSheetVisible, setTagSheetVisible] = useState(false);

  const seasonLabelFor = (season: DiscoverySeason) =>
    t(`discovery.filter.season_${season}`);
  const allSeasonsLabel = t('discovery.filter.all_seasons');
  const allTagsLabel = t('discovery.filter.all_tags');

  const seasonLabel = summaryLabel(seasons, seasonLabelFor, allSeasonsLabel);
  const tagLabel = summaryLabel(
    selectedTrendTags,
    tag => tag,
    allTagsLabel,
  );

  return (
    <View style={styles.row}>
      <FilterSummaryChip
        label={seasonLabel}
        onPress={() => setSeasonSheetVisible(true)}
        testID="discovery-season-trigger"
        accessibilityLabel={t('discovery.filter.a11y_open_season', {
          selection: seasonLabel,
        })}
      />
      {/* The tag pill only exists once the backend has served some tags —
          an empty sheet would be a dead end. */}
      {trendTags.length > 0 ? (
        <FilterSummaryChip
          label={tagLabel}
          onPress={() => setTagSheetVisible(true)}
          testID="discovery-tag-trigger"
          accessibilityLabel={t('discovery.filter.a11y_open_tag', {
            selection: tagLabel,
          })}
        />
      ) : null}

      <DiscoveryFilterSheet
        visible={seasonSheetVisible}
        title={t('discovery.filter.season_title')}
        allLabel={allSeasonsLabel}
        options={DISCOVERY_SEASONS.map(season => ({
          value: season,
          label: seasonLabelFor(season),
        }))}
        selected={seasons}
        onToggle={toggleSeason}
        onDismiss={() => setSeasonSheetVisible(false)}
        onApply={onSeasonsChange}
        testIDPrefix="discovery-season"
      />

      <DiscoveryFilterSheet
        visible={tagSheetVisible}
        title={t('discovery.filter.tag_title')}
        allLabel={allTagsLabel}
        options={trendTags.map(tag => ({ value: tag, label: tag }))}
        selected={selectedTrendTags}
        onToggle={(current, tag) => toggleTrendTag(current, tag, trendTags)}
        onDismiss={() => setTagSheetVisible(false)}
        onApply={onTrendTagsChange}
        testIDPrefix="discovery-tag"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: theme.spacing.xs,
  },
});
