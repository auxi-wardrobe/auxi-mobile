import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../theme/theme';
import IconSwipe from '../../assets/images/icon_swipe.svg';

// Home | Grid View — pagination / action row (Figma Frame 2105, 382×32).
// CEO scope decision (AU-253): the left "Remix" text-button is OMITTED
// (Remix = AU-285 Outfit Canvas Remix Editor, a separate unbuilt feature).
// So this row is: 3 pager dots (centre) + "Show another" button (right).
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
  onShowAnother?: () => void;
  showAnotherDisabled?: boolean;
  testID?: string;
};

export const OutfitActionRow: React.FC<Props> = ({
  activeIndex,
  onShowAnother,
  showAnotherDisabled = false,
  testID,
}) => {
  // Clamp the active dot into the 3-dot window so the pager always shows a
  // valid highlighted dot even if the outfit list is longer than 3.
  const activeDot = ((activeIndex % DOT_COUNT) + DOT_COUNT) % DOT_COUNT;

  return (
    <View testID={testID} style={styles.row}>
      {/* Left slot kept empty (Remix omitted) so the dots stay centred via
          space-between, matching the Figma 3-zone layout geometry. */}
      <View style={styles.sideSlot} />

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
  // Mirror the "Show another" footprint so the dots cluster lands centred.
  sideSlot: {
    width: 83,
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
    ...theme.typography.aliases.poppinsXs,
    color: theme.colors.uacTextBase,
  },
});
