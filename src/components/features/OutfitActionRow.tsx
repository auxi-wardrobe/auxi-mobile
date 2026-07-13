import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import IconRemix from '../../assets/images/icon_remix.svg';

// Home action row — [Remix]  ·  [• • • dots]  ·  [Refine suggestions].
// The dots are a set-position indicator (OUTFITS_PER_SET outfits per set).
// "Refine suggestions" opens the context-refine bottom sheet — a deliberate
// tweak affordance. (The old "Show another" tap was dropped: a left-swipe
// already advances/explores, so the forward step needed no button.) All props
// optional so the loading-state caller (no handlers) renders a static
// [Remix] · dots · disabled "Refine suggestions".
type Props = {
  onRemix?: () => void;
  onRefine?: () => void;
  /** Set-position dots: total count + active index (0-based). */
  dotCount?: number;
  activeDot?: number;
  testID?: string;
};

export const OutfitActionRow: React.FC<Props> = ({
  onRemix,
  onRefine,
  dotCount = 3,
  activeDot = 0,
  testID,
}) => {
  const { t } = useTranslation();

  return (
    <View testID={testID} style={styles.row}>
      <TouchableOpacity
        testID="home-remix"
        accessibilityRole="button"
        accessibilityLabel={t('outfitActions.a11y_remix')}
        activeOpacity={0.82}
        onPress={onRemix}
        style={styles.sideSlot}
      >
        <Text style={styles.remixText} numberOfLines={1}>
          {t('outfitActions.remix')}
        </Text>
        <IconRemix width={16} height={16} color={theme.colors.uacTextBase} />
      </TouchableOpacity>

      {/* Set-position dots (Figma Frame 2124) — 4px dots, 8px gap. */}
      <View style={styles.dots} pointerEvents="none">
        {Array.from({ length: Math.max(1, dotCount) }).map((_, i) => (
          <View
            key={`dot-${i}`}
            style={[
              styles.dot,
              i === activeDot ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      <TouchableOpacity
        testID="home-refine"
        accessibilityRole="button"
        accessibilityLabel={t('outfitActions.a11y_refine')}
        activeOpacity={0.82}
        onPress={onRefine}
        disabled={!onRefine}
        style={styles.sideSlot}
      >
        <Text
          style={[
            styles.showAnotherText,
            !onRefine && styles.showAnotherDisabled,
          ]}
          numberOfLines={1}
        >
          {t('outfitActions.refine')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 32,
    width: '100%',
  },
  // Remix (left) / Show another (right): content-sized, gap 8, px 12, pill radius.
  sideSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    paddingHorizontal: theme.spacing.uacDimension12,
    height: 32,
    borderRadius: 16,
  },
  remixText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
  },
  showAnotherText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
  },
  showAnotherDisabled: {
    color: theme.colors.figmaTextSecondary,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    backgroundColor: theme.colors.uacTextBase,
  },
  dotInactive: {
    backgroundColor: theme.colors.figmaDivider,
  },
});
