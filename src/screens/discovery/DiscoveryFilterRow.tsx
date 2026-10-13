import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FilterSummaryChip } from '../../components/features/FilterSummaryChip';
import { theme } from '../../theme/theme';
import type {
  DiscoveryColorOption,
  DiscoveryItemTypeOption,
  DiscoverySeason,
} from '../../services/discoveryService';
import { HORIZONTAL_PADDING } from './discovery-grid';
import { DiscoveryFilterSheet } from './DiscoveryFilterSheet';
import { useColorLabel } from './DiscoveryColorSwatches';
import {
  DISCOVERY_SEASONS,
  summaryLabel,
  toggleColor,
  toggleItemType,
  toggleSeason,
  toggleTrendTag,
} from './discovery-filter';

/**
 * Localised name for an item type: `discovery.item_types.<code>` when the app
 * has it (e.g. "Chân váy chữ A"), else the English label the backend sent — a
 * new server-side type must never render as a raw key.
 */
export const useItemTypeLabel = () => {
  const { t } = useTranslation();
  return (option: Pick<DiscoveryItemTypeOption, 'code' | 'label'>) =>
    t(`discovery.item_types.${option.code}`, { defaultValue: option.label });
};

interface DiscoveryFilterRowProps {
  /** Committed season selection. Empty === "All season". */
  seasons: DiscoverySeason[];
  onSeasonsChange: (seasons: DiscoverySeason[]) => void;
  /** Committed trend-tag selection. Empty === every tag. */
  selectedTrendTags: string[];
  onTrendTagsChange: (tags: string[]) => void;
  /** Every tag the backend currently serves (`/discovery/trend-tags`). */
  trendTags: string[];
  /** Committed color codes. Empty === every color. */
  selectedColors: string[];
  onColorsChange: (codes: string[]) => void;
  /** Colors the backend currently serves (`/discovery/colors`). */
  colorOptions: DiscoveryColorOption[];
  /** Committed item-type codes. Empty === every item type. */
  selectedItemTypes: string[];
  onItemTypesChange: (codes: string[]) => void;
  /** Item types the backend currently serves (`/discovery/item-types`). */
  itemTypeOptions: DiscoveryItemTypeOption[];
}

/**
 * Discovery filter bar — the same interaction as the wardrobe grid's
 * (`WardrobeFilterSortBar`): summary pills (season, item, tag, color), each
 * opening a bottom sheet of MULTI-select chips committed on "Show". Every axis
 * defaults to "All …" and accepts more than one value at a time.
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
  selectedColors,
  onColorsChange,
  colorOptions,
  selectedItemTypes,
  onItemTypesChange,
  itemTypeOptions,
}) => {
  const { t } = useTranslation();
  const colorLabel = useColorLabel();
  const itemTypeLabel = useItemTypeLabel();
  const [seasonSheetVisible, setSeasonSheetVisible] = useState(false);
  const [itemSheetVisible, setItemSheetVisible] = useState(false);
  const [tagSheetVisible, setTagSheetVisible] = useState(false);
  const [colorSheetVisible, setColorSheetVisible] = useState(false);

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

  const allColorsLabel = t('discovery.filter.all_colors');
  const colorCodes = colorOptions.map(color => color.code);
  // A committed code the backend no longer offers still needs a label; the
  // raw code is the honest fallback (it is also what the chip value is).
  const colorLabelFor = (code: string) => {
    const option = colorOptions.find(color => color.code === code);
    return option ? colorLabel(option) : code;
  };
  const colorSummary = summaryLabel(
    selectedColors,
    colorLabelFor,
    allColorsLabel,
  );

  const allItemTypesLabel = t('discovery.filter.all_item_types');
  const itemTypeCodes = itemTypeOptions.map(option => option.code);
  // Same fallback as colors: a committed code no longer offered shows raw.
  const itemTypeLabelFor = (code: string) => {
    const option = itemTypeOptions.find(o => o.code === code);
    return option ? itemTypeLabel(option) : code;
  };
  const itemTypeSummary = summaryLabel(
    selectedItemTypes,
    itemTypeLabelFor,
    allItemTypesLabel,
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
      {/* No item types served (incl. a backend without the endpoint), no
          pill — an empty sheet would be a dead end. */}
      {itemTypeOptions.length > 0 ? (
        <FilterSummaryChip
          label={itemTypeSummary}
          onPress={() => setItemSheetVisible(true)}
          testID="discovery-item-type-trigger"
          accessibilityLabel={t('discovery.filter.a11y_open_item_type', {
            selection: itemTypeSummary,
          })}
        />
      ) : null}
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
      {/* Same rule as tags: no colors served, no pill. */}
      {colorOptions.length > 0 ? (
        <FilterSummaryChip
          label={colorSummary}
          onPress={() => setColorSheetVisible(true)}
          testID="discovery-color-trigger"
          accessibilityLabel={t('discovery.filter.a11y_open_color', {
            selection: colorSummary,
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
        visible={itemSheetVisible}
        title={t('discovery.filter.item_type_title')}
        allLabel={allItemTypesLabel}
        options={itemTypeOptions.map(option => ({
          value: option.code,
          label: itemTypeLabel(option),
        }))}
        selected={selectedItemTypes}
        onToggle={(current, code) =>
          toggleItemType(current, code, itemTypeCodes)
        }
        onDismiss={() => setItemSheetVisible(false)}
        onApply={onItemTypesChange}
        testIDPrefix="discovery-item-type"
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

      <DiscoveryFilterSheet
        visible={colorSheetVisible}
        title={t('discovery.filter.color_title')}
        allLabel={allColorsLabel}
        options={colorOptions.map(color => ({
          value: color.code,
          label: colorLabel(color),
        }))}
        selected={selectedColors}
        onToggle={(current, code) => toggleColor(current, code, colorCodes)}
        onDismiss={() => setColorSheetVisible(false)}
        onApply={onColorsChange}
        testIDPrefix="discovery-color"
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
