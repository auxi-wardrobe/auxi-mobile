import React from 'react';
import { StyleSheet, View } from 'react-native';
import { FilterSummaryChip } from '../../components/features/FilterSummaryChip';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { HORIZONTAL_PADDING } from './wardrobe-grid';

// Wardrobe filter/sort summary chips (Figma "wardrobe" / "item(s) selected").
// Two pill chips at the top-right of the grid: the left one summarises the
// active type filter (multi-select), the right one the active sort. Each opens
// its own bottom sheet. The pill itself is `FilterSummaryChip`, shared with the
// Discovery feed's season/tag filters. A third, optional "Analysis" chip
// (label + chart icon) opens the Wardrobe Analysis screen; it's omitted in the
// single-item picker mode, where the user is choosing, not browsing.
interface WardrobeFilterSortBarProps {
  filterLabel: string;
  sortLabel: string;
  onOpenFilter: () => void;
  onOpenSort: () => void;
  filterAccessibilityLabel: string;
  sortAccessibilityLabel: string;
  analysis?: {
    label: string;
    accessibilityLabel: string;
    onPress: () => void;
  };
}

export const WardrobeFilterSortBar = ({
  filterLabel,
  sortLabel,
  onOpenFilter,
  onOpenSort,
  filterAccessibilityLabel,
  sortAccessibilityLabel,
  analysis,
}: WardrobeFilterSortBarProps) => (
  <View style={styles.row}>
    <FilterSummaryChip
      label={filterLabel}
      onPress={onOpenFilter}
      testID="wardrobe-filter-trigger"
      accessibilityLabel={filterAccessibilityLabel}
    />
    <FilterSummaryChip
      label={sortLabel}
      onPress={onOpenSort}
      testID="wardrobe-sort-trigger"
      accessibilityLabel={sortAccessibilityLabel}
    />
    {analysis ? (
      <FilterSummaryChip
        label={analysis.label}
        onPress={analysis.onPress}
        testID="wardrobe-analysis-trigger"
        accessibilityLabel={analysis.accessibilityLabel}
        trailingIcon={
          <Icons.Analysis
            width={16}
            height={16}
            color={theme.colors.figmaTextPrimary}
          />
        }
      />
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 12,
  },
});
