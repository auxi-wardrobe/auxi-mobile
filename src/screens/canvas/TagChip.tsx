/**
 * Mood/energy tag chip for the Outfit Canvas — label + remove "×". Extracted
 * verbatim from OutfitCanvasScreen (carries its own styles).
 *
 * Figma: bg background/primary/subtle_100 (#e0d2c4), radius 6, height 32,
 * padding 8/12, gap 4, text Inter Regular 12/16 #070707.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';

export const TagChip = ({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.tagChip}>
      <Text style={styles.tagChipLabel}>{label}</Text>
      <Pressable
        testID={`canvas-tag-remove-${label}`}
        onPress={onRemove}
        hitSlop={8}
        style={styles.tagChipRemove}
        accessibilityLabel={t('outfitCanvas.a11y_remove_tag', { label })}
      >
        <Text style={styles.tagChipX}>×</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    backgroundColor: theme.colors.figmaInsightPillBg,
    borderRadius: theme.borderRadius.chip,
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.uacDimension12,
    gap: theme.spacing.xs,
  },
  tagChipLabel: {
    ...theme.typography.aliases.uacBodyXsRegular, // Inter Regular 12/16
    color: theme.colors.figmaTextDark,
  },
  tagChipRemove: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagChipX: {
    fontSize: 14,
    lineHeight: 16,
    color: theme.colors.figmaTextDark,
  },
});
