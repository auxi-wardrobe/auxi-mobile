import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

const DOT_COUNT = 3;

type Props = {
  activeIndex: number;
  onRemix?: () => void;
  onShowAnother?: () => void;
  showAnotherDisabled?: boolean;
  testID?: string;
};

export const OutfitActionRow: React.FC<Props> = ({
  activeIndex,
  onRemix,
  onShowAnother,
  showAnotherDisabled = false,
  testID,
}) => {
  // Clamp the active dot into the 3-dot window so the pager always shows a
  // valid highlighted dot even if the outfit list is longer than 3.
  const activeDot = ((activeIndex % DOT_COUNT) + DOT_COUNT) % DOT_COUNT;

  return (
    <View testID={testID} style={styles.row}>
      {/* Left slot: Remix button. Its footprint mirrors "Show another" so the
          dot cluster stays centred via space-between (Figma 3-zone geometry). */}
      <TouchableOpacity
        testID={`home-remix-${activeIndex}`}
        accessibilityRole="button"
        accessibilityLabel="Remix this outfit"
        activeOpacity={0.82}
        onPress={onRemix}
        style={styles.sideSlot}
      >
        <Text style={styles.remixText} numberOfLines={1}>
          Remix
        </Text>
        <IconRemix width={16} height={16} color={theme.colors.uacTextBase} />
      </TouchableOpacity>

      <View
        style={styles.dots}
        accessibilityRole="adjustable"
        accessibilityLabel={`Option ${activeDot + 1} of ${DOT_COUNT}`}
      >
        {Array.from({ length: DOT_COUNT }).map((_, index) => (
          <View
            key={`pager-dot-${index}`}
            testID={
              index === activeDot
                ? 'home-pager-dot-active'
                : `home-pager-dot-${index}`
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
        accessibilityLabel="Show another outfit"
        accessibilityState={{ disabled: showAnotherDisabled }}
        activeOpacity={0.82}
        disabled={showAnotherDisabled}
        onPress={onShowAnother}
        style={[styles.showAnother, showAnotherDisabled && styles.disabled]}
      >
        <Text style={styles.showAnotherText} numberOfLines={1}>
          Show another
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
    backgroundColor: theme.colors.figmaInsightPillBg,
  },
  dotActive: {
    backgroundColor: theme.colors.uacTextBase,
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
