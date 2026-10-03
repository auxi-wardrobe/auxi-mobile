import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { PressableScale } from '../primitives/PressableScale';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';

/**
 * The pill that summarises a multi-select filter and opens its bottom sheet
 * (Figma "wardrobe" / "item(s) selected"). A leading chevron-down signals
 * "tap to open options"; the label is whatever the current selection reads as
 * ("All season", "Summer, Winter").
 *
 * Shared by the wardrobe grid (`WardrobeFilterSortBar`) and the Discovery feed
 * (`DiscoveryFilterRow`) so the two filters stay the same component rather
 * than two lookalikes that drift apart.
 *
 * Action variant (`trailingIcon`): the same pill with no chevron and an icon
 * after the label — the wardrobe "Analysis" entry (Figma "wardrobe"), which
 * opens a screen rather than a sheet but sits in the same chip row.
 */
interface FilterSummaryChipProps {
  label: string;
  onPress: () => void;
  testID: string;
  accessibilityLabel: string;
  /** Replaces the leading chevron with an icon after the label. */
  trailingIcon?: React.ReactNode;
}

export const FilterSummaryChip = ({
  label,
  onPress,
  testID,
  accessibilityLabel,
  trailingIcon,
}: FilterSummaryChipProps) => (
  <PressableScale
    onPress={onPress}
    style={styles.chip}
    activeOpacity={0.85}
    testID={testID}
    accessibilityLabel={accessibilityLabel}
  >
    {trailingIcon ? null : <Icons.ChevronDown width={16} height={16} />}
    <Text style={styles.chipText} numberOfLines={1}>
      {label}
    </Text>
    {trailingIcon}
  </PressableScale>
);

const styles = StyleSheet.create({
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
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextPrimary,
    flexShrink: 1,
  },
});
