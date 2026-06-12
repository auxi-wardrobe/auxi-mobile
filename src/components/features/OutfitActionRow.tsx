import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import IconSwipe from '../../assets/images/icon_swipe.svg';
import IconRemix from '../../assets/images/icon_remix.svg';

// Home | Grid View — pagination / action row (Figma Frame 2105, 382×32).
// 3-zone space-between row: [Remix button | 3 pager dots | "Show another"].
// CEO re-enabled the left "Remix" text-button (overrides the earlier AU-253
// "Remix omitted" scope decision). Pressing it opens the Outfit Canvas
// (AU-285 Remix editor) via the `onRemix` callback threaded from HomeScreen.
//
// Both buttons share one Figma component (Text button, State=Enable, Icon=Yes,
// Size=32): same height/typography/gap/padding/radius — they differ only by
// label + icon. Remix uses icon_remix.svg; "Show another" uses icon_swipe.svg.
//
// Pager = 3-option carousel ("swipe left/right to rotate within 3 options").
// The active dot is dark (icon/neutral/base), inactive dots are muted — the
// rendered Figma frame shows dot 1 filled dark, dots 2/3 light grey.
//
// "Show another" renders at opacity 0.5 when disabled (Figma State=Disable
// on the 1/3 frame). We drive that off the `disabled` prop so the edge state
// matches the design while the button stays functional when enabled.

const DEFAULT_DOT_COUNT = 3;

type Props = {
  // AU-303: `activeIndex` is now the HORIZONTAL outfitIndex within the active
  // set (0..2), NOT the flat sheet index. Dots track which of the set's 3
  // outfits is currently shown.
  activeIndex: number;
  // AU-303: number of outfits in this set (1..3) — a trailing partial set
  // renders fewer dots so the pager reflects the real option count.
  dotCount?: number;
  onRemix?: () => void;
  onShowAnother?: () => void;
  showAnotherDisabled?: boolean;
  testID?: string;
};

export const OutfitActionRow: React.FC<Props> = ({
  activeIndex,
  dotCount = DEFAULT_DOT_COUNT,
  onRemix,
  onShowAnother,
  showAnotherDisabled = false,
  testID,
}) => {
  const { t } = useTranslation();
  const count = Math.max(1, dotCount);
  // Clamp the active dot into the dot window so the pager always shows a valid
  // highlighted dot.
  const activeDot = ((activeIndex % count) + count) % count;

  return (
    <View testID={testID} style={styles.row}>
      {/* Left slot: Remix button. Its footprint mirrors "Show another" so the
          dot cluster stays centred via space-between (Figma 3-zone geometry). */}
      <TouchableOpacity
        testID={`home-remix-${activeIndex}`}
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

      <View
        style={styles.dots}
        accessibilityRole="adjustable"
        accessibilityLabel={t('outfitActions.a11y_option_of', {
          index: activeDot + 1,
          count,
        })}
      >
        {Array.from({ length: count }).map((_, index) => (
          <View
            key={`pager-dot-${index}`}
            testID={
              index === activeDot
                ? `home-pagination-dot-${index}-active`
                : `home-pagination-dot-${index}`
            }
            style={[styles.dot, index === activeDot && styles.dotActive]}
          />
        ))}
      </View>

      <TouchableOpacity
        testID={
          showAnotherDisabled
            ? 'home-show-another-disabled'
            : 'home-show-another'
        }
        accessibilityRole="button"
        accessibilityLabel={t('outfitActions.a11y_show_another')}
        accessibilityState={{ disabled: showAnotherDisabled }}
        activeOpacity={0.82}
        disabled={showAnotherDisabled}
        onPress={onShowAnother}
        style={[styles.showAnother, showAnotherDisabled && styles.disabled]}
      >
        <Text style={styles.showAnotherText} numberOfLines={1}>
          {t('outfitActions.show_another')}
        </Text>
        <IconSwipe width={24} height={24} color={theme.colors.uacTextBase} />
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
  // Remix button (Figma left Button, 83×32): flush-left content, gap 8, px 12,
  // pill radius — matches the "Show another" component geometry. Fixed width 83
  // preserves the Figma 3-zone spacing so the dot cluster stays centred.
  sideSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 83,
    gap: theme.spacing.s,
    paddingHorizontal: theme.spacing.uacDimension12,
    height: 32,
    borderRadius: theme.borderRadius.round,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  dot: {
    width: theme.spacing.xs,
    height: theme.spacing.xs,
    borderRadius: theme.spacing.xs / 2,
    // AU-303: inactive dot icon/primary/subtle_300 (#c6bcb1).
    backgroundColor: theme.colors.figmaDotInactive,
  },
  dotActive: {
    // AU-303: active dot icon/primary/bold_500 (#5b5550 = figmaChipBg, same hex).
    backgroundColor: theme.colors.figmaChipBg,
  },
  showAnother: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
    height: 32,
    paddingHorizontal: theme.spacing.uacDimension12,
    borderRadius: theme.borderRadius.round,
  },
  disabled: {
    opacity: 0.5,
  },
  showAnotherText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
  },
  remixText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
  },
});
