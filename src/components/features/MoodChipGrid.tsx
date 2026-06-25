import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { MoodChipDef } from './mood-chips';

/**
 * Multi-select mood chip grid for MoodFeedbackSheet (AU-318 Phase 3).
 * Chip tokens per phase spec: inactive `figmaCardTag`, selected `figmaChipBg`.
 */
interface MoodChipGridProps {
  chips: MoodChipDef[];
  selectedIds: ReadonlySet<string>;
  disabled: boolean;
  onToggle: (id: string) => void;
}

export const MoodChipGrid: React.FC<MoodChipGridProps> = ({
  chips,
  selectedIds,
  disabled,
  onToggle,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.chipGrid}>
      {chips.map(chip => {
        const selected = selectedIds.has(chip.id);

        return (
          <TouchableOpacity
            key={chip.id}
            testID={`mood-chip-${chip.id}`}
            accessibilityRole="button"
            accessibilityLabel={t(chip.labelKey)}
            accessibilityState={{ selected, disabled }}
            activeOpacity={0.82}
            disabled={disabled}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onToggle(chip.id)}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {t(chip.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  chip: {
    minHeight: 44, // chip size M
    borderRadius: theme.borderRadius.round, // pill
    paddingHorizontal: theme.spacing.m,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.figmaInsightPillBg, // default #E0D2C4
  },
  chipSelected: {
    backgroundColor: theme.colors.figmaChipBg, // selected #5B5550
  },
  chipText: {
    // Chip size M (44px height) → 14px font per chip sizing spec.
    ...theme.typography.aliases.archivoBody,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.figmaText, // dark on default tan
  },
  chipTextSelected: {
    color: theme.colors.white, // white on selected
  },
});
