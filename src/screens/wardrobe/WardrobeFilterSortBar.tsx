import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from '../../components/primitives/PressableScale';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { HORIZONTAL_PADDING } from './wardrobe-grid';

// Wardrobe filter/sort summary chips (Figma "wardrobe" / "item(s) selected").
// Two pill chips at the top-right of the grid: the left one summarises the
// active type filter (multi-select), the right one the active sort. Each opens
// its own bottom sheet. A leading chevron-down signals "tap to open options".
interface SummaryChipProps {
  label: string;
  onPress: () => void;
  testID: string;
  accessibilityLabel: string;
}

const SummaryChip = ({
  label,
  onPress,
  testID,
  accessibilityLabel,
}: SummaryChipProps) => (
  <PressableScale
    onPress={onPress}
    style={styles.chip}
    activeOpacity={0.85}
    testID={testID}
    accessibilityLabel={accessibilityLabel}
  >
    <Icons.ChevronDown
      width={16}
      height={16}
      color={theme.colors.figmaTextPrimary}
    />
    <Text style={styles.chipText} numberOfLines={1}>
      {label}
    </Text>
  </PressableScale>
);

interface WardrobeFilterSortBarProps {
  filterLabel: string;
  sortLabel: string;
  onOpenFilter: () => void;
  onOpenSort: () => void;
  filterAccessibilityLabel: string;
  sortAccessibilityLabel: string;
}

export const WardrobeFilterSortBar = ({
  filterLabel,
  sortLabel,
  onOpenFilter,
  onOpenSort,
  filterAccessibilityLabel,
  sortAccessibilityLabel,
}: WardrobeFilterSortBarProps) => (
  <View style={styles.row}>
    <SummaryChip
      label={filterLabel}
      onPress={onOpenFilter}
      testID="wardrobe-filter-trigger"
      accessibilityLabel={filterAccessibilityLabel}
    />
    <SummaryChip
      label={sortLabel}
      onPress={onOpenSort}
      testID="wardrobe-sort-trigger"
      accessibilityLabel={sortAccessibilityLabel}
    />
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
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    maxWidth: 200,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.figmaInsightPillBg,
  },
  chipText: {
    ...theme.typography.aliases.interMediumSm,
    color: theme.colors.figmaTextPrimary,
    flexShrink: 1,
  },
});
