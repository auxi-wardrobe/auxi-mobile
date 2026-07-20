import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../theme/theme';
import type { WardrobeItem } from '../../../services/wardrobeService';
import { resolveWardrobeItemImage } from '../capsule-format';

interface CapsuleItemTileProps {
  item: WardrobeItem;
  size: number;
  /** Selection state (add flow). */
  selected?: boolean;
  /** Item already in the capsule → dimmed + tag, not selectable. */
  disabled?: boolean;
  /** Localized "Already in capsule" tag text (only shown when disabled). */
  alreadyLabel?: string;
  onPress?: () => void;
  testID: string;
  accessibilityLabel?: string;
}

/**
 * Square wardrobe-item tile used across the capsule detail grid + add-selection
 * grids. Renders the best available image (studio → png → url). When `disabled`
 * it dims and shows the "Already in capsule" tag; when `selected` it shows a
 * check badge.
 */
export const CapsuleItemTile: React.FC<CapsuleItemTileProps> = ({
  item,
  size,
  selected,
  disabled,
  alreadyLabel,
  onPress,
  testID,
  accessibilityLabel,
}) => {
  const uri = resolveWardrobeItemImage(item);
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      testID={selected ? `${testID}-selected` : testID}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel ?? item.name ?? 'Wardrobe item'}
      style={[
        styles.tile,
        { width: size, height: size },
        disabled && styles.tileDisabled,
        selected && styles.tileSelected,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.image} />
      )}
      {selected && (
        <View style={styles.checkBadge}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      )}
      {disabled && alreadyLabel ? (
        <View style={styles.alreadyTag}>
          <Text style={styles.alreadyText} numberOfLines={1}>
            {alreadyLabel}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  tile: {
    borderRadius: theme.borderRadius.figmaTile,
    overflow: 'hidden',
    backgroundColor: theme.colors.figmaCardSurface,
  },
  tileDisabled: {
    opacity: 0.5,
  },
  tileSelected: {
    borderWidth: 2,
    borderColor: theme.colors.figmaTextDark,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.figmaCardSurface,
  },
  checkBadge: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    width: 22,
    height: 22,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.figmaTextDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    ...theme.typography.aliases.uacBodyXsMedium,
    color: theme.colors.white,
  },
  alreadyTag: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.figmaOverlayScrim,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  alreadyText: {
    ...theme.typography.aliases.poppinsCaptionXxs,
    color: theme.colors.white,
    textAlign: 'center',
  },
});
