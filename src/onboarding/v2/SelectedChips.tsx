/**
 * Onboarding V2 — "You selected" chip cluster (Figma node 2849:8477 Frame 2089).
 *
 * Shared by the Loading and Completed screens. Renders the user's picks as a
 * wrapping row of greige chips. Pure presentational: the caller passes the
 * resolved display labels (see `selectionChipLabels` in `onboarding/config`),
 * so wire values never leak into the UI.
 *
 * Tokens (extraction §3.5): chip bg `figmaChipBg` (#5b5550, background/primary/
 * bold_500), radius `chip` (6, border-radius/sm), padX 12 / padY 8, label
 * Inter Regular 12/16 (`uacBodyXsRegular`) in `figmaCaptionPillBg` (#eee6df).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';

interface SelectedChipsProps {
  /** Pre-resolved display labels (never wire values). */
  labels: string[];
  testID?: string;
}

export const SelectedChips: React.FC<SelectedChipsProps> = ({
  labels,
  testID,
}) => (
  <View style={styles.row} testID={testID}>
    {labels.map((label, index) => (
      <View key={`${label}-${index}`} style={styles.chip}>
        <Text style={styles.chipLabel}>{label}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
  },
  chip: {
    backgroundColor: theme.colors.figmaChipBg,
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingVertical: theme.spacing.s,
  },
  chipLabel: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.white,
  },
});
