import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import IconMinusCircle from '../../assets/images/icon_minus_circle.svg';
import IconSparkle from '../../assets/images/icon_sparkle.svg';

type Props = {
  /** Remove the currently-viewed outfit (opens the confirm dialog). */
  onRemove: () => void;
  /** Open the "See this on me" flow for the currently-viewed outfit. */
  onSelfVisualization: () => void;
  testID?: string;
};

// Screen-level sticky action cluster for the Favourite list (CEO 2026-06-27):
// the ⊖ remove + "Self visualization" actions used to repeat inside every
// outfit card. They are now hoisted to a single bar pinned to the bottom of the
// screen so they stay reachable no matter how far the list is scrolled — the
// bar acts on whichever saved outfit is currently snapped into view.
//
// The "add to schedule" button (separate thread) slots between ⊖ remove and
// "Self visualization"; the row is laid out left→right to leave that gap.
export const FavouriteActionBar: React.FC<Props> = ({
  onRemove,
  onSelfVisualization,
  testID,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID={testID}
      style={[styles.container, { paddingBottom: insets.bottom + 12 }]}
    >
      {/* Blurred bar background, same treatment as the header — decorative, must
          not capture touches or it swallows the button taps. */}
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType="light"
        blurAmount={8}
        reducedTransparencyFallbackColor={theme.colors.figmaItemDetailHeaderBg}
        pointerEvents="none"
      />
      <View style={styles.tint} pointerEvents="none" />

      <View style={styles.row}>
        <TouchableOpacity
          testID="favourite-remove-active"
          accessibilityRole="button"
          accessibilityLabel={t('favourite.remove_a11y')}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.removeButton}
          onPress={onRemove}
        >
          <IconMinusCircle
            width={24}
            height={24}
            color={theme.colors.figmaItemDetailDanger}
          />
        </TouchableOpacity>

        <TouchableOpacity
          testID="favourite-self-visualization-active"
          accessibilityRole="button"
          accessibilityLabel={t('favourite.self_visualization')}
          activeOpacity={0.7}
          style={styles.selfVizButton}
          onPress={onSelfVisualization}
        >
          <Text style={styles.selfVizLabel} numberOfLines={1}>
            {t('favourite.self_visualization')}
          </Text>
          <IconSparkle
            width={24}
            height={24}
            color={theme.colors.figmaAiSparkle}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.m,
    // Clip the oversized blur slab to the bar bounds.
    overflow: 'hidden',
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.figmaItemDetailHeaderBg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.l,
  },
  removeButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // White bordered pill (Figma favourite footer) — gives the action definition
  // against the blurred bar now that it no longer sits on a card surface.
  selfVizButton: {
    flex: 1,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
    paddingHorizontal: theme.spacing.l,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: theme.colors.figmaTextDark,
    backgroundColor: theme.colors.white,
  },
  selfVizLabel: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.uacTextBase,
    flexShrink: 1,
  },
});
