import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PressableScale } from '../../components/primitives/PressableScale';
import { theme } from '../../theme/theme';
import type { DiscoveryOutfitCard as DiscoveryOutfitCardData } from '../../services/discoveryService';
import { TILE_WIDTH } from './discovery-grid';

interface DiscoveryOutfitCardProps {
  outfit: DiscoveryOutfitCardData;
  index: number;
  onPress: (outfit: DiscoveryOutfitCardData) => void;
}

/**
 * One tile in the Discovery 2-column grid. Cover image (with a token-styled
 * placeholder on missing/failed image — the cover URL can be a long-lived
 * public link, but a network hiccup still shouldn't render a broken frame),
 * title, season/tag pills, item count.
 */
export const DiscoveryOutfitCard: React.FC<DiscoveryOutfitCardProps> = ({
  outfit,
  index,
  onPress,
}) => {
  const { t } = useTranslation();
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
      <View style={styles.imageFrame}>
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

      <Text style={styles.title} numberOfLines={1}>
        {outfit.title}
      </Text>
      <Text style={styles.itemCount}>
        {t('discovery.item_count', { count: outfit.item_count })}
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
    height: TILE_WIDTH * (4 / 3),
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
  title: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.figmaTextPrimary,
    marginTop: theme.spacing.xs,
  },
  itemCount: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
  },
});
