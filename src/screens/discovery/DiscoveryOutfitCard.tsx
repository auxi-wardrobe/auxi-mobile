import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { PressableScale } from '../../components/primitives/PressableScale';
import { theme } from '../../theme/theme';
import type { DiscoveryOutfitCard as DiscoveryOutfitCardData } from '../../services/discoveryService';
import { DEFAULT_TILE_RATIO, TILE_WIDTH, clampTileRatio } from './discovery-grid';

interface DiscoveryOutfitCardProps {
  outfit: DiscoveryOutfitCardData;
  index: number;
  /**
   * Cover width/height as uploaded, measured by `useDiscoveryMasonry`. The
   * frame takes the column's full width and derives its height from this —
   * that variance IS the masonry.
   */
  aspectRatio?: number;
  onPress: (outfit: DiscoveryOutfitCardData) => void;
}

/**
 * One tile in the Discovery masonry grid: full-column-width cover at the
 * uploaded aspect ratio (with a token-styled placeholder on missing/failed
 * image — the cover URL can be a long-lived public link, but a network hiccup
 * still shouldn't render a broken frame), season/tag pills over it, and a
 * single 12/16 regular title underneath. Nothing else below the image.
 */
export const DiscoveryOutfitCard: React.FC<DiscoveryOutfitCardProps> = ({
  outfit,
  index,
  aspectRatio = DEFAULT_TILE_RATIO,
  onPress,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!outfit.composite_image_url && !imageFailed;
  const firstTag = outfit.trend_tags[0];

  return (
    <PressableScale
      testID={`discovery-card-${index}`}
      accessibilityRole="button"
      accessibilityLabel={outfit.title}
      style={styles.card}
      onPress={() => onPress(outfit)}
    >
      <View
        style={[styles.imageFrame, { aspectRatio: clampTileRatio(aspectRatio) }]}
      >
        {showImage ? (
          <Image
            source={{ uri: outfit.composite_image_url as string }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackText} numberOfLines={2}>
              {outfit.title}
            </Text>
          </View>
        )}

        <View style={styles.pillRow}>
          {outfit.season ? (
            <View style={styles.pill}>
              <Text style={styles.pillText}>{outfit.season}</Text>
            </View>
          ) : null}
          {firstTag ? (
            <View style={styles.pill}>
              <Text style={styles.pillText}>{firstTag}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Single line, always — the packer budgets exactly one line of caption
          (CAPTION_BLOCK_HEIGHT) when it computes column heights. */}
      <Text style={styles.title} numberOfLines={1}>
        {outfit.title}
      </Text>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  card: {
    width: TILE_WIDTH,
  },
  imageFrame: {
    width: TILE_WIDTH,
    borderRadius: theme.borderRadius.figmaTile,
    backgroundColor: theme.colors.figmaCardSurface,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.s,
  },
  imageFallbackText: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
  pillRow: {
    position: 'absolute',
    left: theme.spacing.xs,
    bottom: theme.spacing.xs,
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  pill: {
    minHeight: 20,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.figmaCardTag,
    paddingHorizontal: theme.spacing.s,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.uacBackgroundNeutral50,
    textTransform: 'capitalize',
  },
  // Text-xs Regular 12/16 (`uacBodyXsRegular`) — the caption is the only thing
  // under the cover now; the item count moved out (design call, Sep 2026).
  title: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaTextPrimary,
    marginTop: theme.spacing.xs,
  },
});
