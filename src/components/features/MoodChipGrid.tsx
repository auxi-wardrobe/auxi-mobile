import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { MChip } from '../design-system/lib';
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
          <MChip
            key={chip.id}
            size="m"
            selected={selected}
            testID={`mood-chip-${chip.id}`}
            accessibilityLabel={t(chip.labelKey)}
            onPress={() => {
              if (disabled) {
                return;
              }
              onToggle(chip.id);
            }}
          >
            {t(chip.labelKey)}
          </MChip>
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
});
