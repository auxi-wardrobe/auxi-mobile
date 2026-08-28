import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../../theme/theme';
import { AppStackParamList } from '../../types/navigation';
import type { DiscoveryOutfitItem } from '../../services/discoveryService';

type ScreenNavigation = NativeStackNavigationProp<
  AppStackParamList,
  'DiscoveryOutfitDetail'
>;

interface DiscoveryItemStripProps {
  outfitId: string;
  items: DiscoveryOutfitItem[];
}

const THUMB_SIZE = 96;

/**
 * Ordered horizontal strip of an outfit's garments. Tapping an item pushes
 * `ItemDetail` with a `fallbackItem` built from the Discovery payload (this
 * id is a SYSTEM common item, never in the user's own wardrobe list — the
 * same V05 `common_essential` degrade path Home already relies on) plus
 * `origin: 'discovery'` so the read panel shows the "Save to wardrobe" CTA.
 */
export const DiscoveryItemStrip: React.FC<DiscoveryItemStripProps> = ({
  outfitId,
  items,
}) => {
  const navigation = useNavigation<ScreenNavigation>();

  const handlePress = (item: DiscoveryOutfitItem) => {
    navigation.navigate('ItemDetail', {
      itemId: item.id,
      fallbackItem: {
        id: item.id,
        name: item.name,
        image_url: item.image_url,
        ...(item.image_png ? { image_png: item.image_png } : {}),
        category: item.category,
        is_common_item: item.is_common_item,
      },
      origin: 'discovery',
      discoveryOutfitId: outfitId,
    });
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      testID="discovery-item-strip"
    >
      {items.map(item => (
        <TouchableOpacity
          key={item.id}
          testID={`discovery-item-strip-tile-${item.id}`}
          accessibilityRole="button"
          accessibilityLabel={item.name}
          style={styles.tile}
          onPress={() => handlePress(item)}
        >
          <Image
            source={{ uri: item.image_png ?? item.image_url }}
            style={styles.thumb}
            resizeMode="cover"
          />
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    paddingHorizontal: theme.spacing.m,
  },
  tile: {
    width: THUMB_SIZE,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: theme.borderRadius.figmaTile,
    backgroundColor: theme.colors.figmaCardSurface,
  },
  name: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
});
