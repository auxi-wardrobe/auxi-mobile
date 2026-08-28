import React from 'react';
import { Image, Text, View } from 'react-native';
import type { DiscoveryOutfitDetail } from '../../services/discoveryService';
import { discoveryOutfitDetailStyles as styles } from './discoveryOutfitDetailStyles';

interface DiscoveryOutfitSummaryProps {
  outfit: DiscoveryOutfitDetail;
}

/** Cover image (with a token-styled fallback) + title + description + season/tag pills. */
export const DiscoveryOutfitSummary: React.FC<DiscoveryOutfitSummaryProps> = ({
  outfit,
}) => (
  <>
    <View style={styles.coverFrame}>
      {outfit.composite_image_url ? (
        <Image
          source={{ uri: outfit.composite_image_url }}
          style={styles.cover}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.coverFallback}>
          <Text style={styles.coverFallbackText}>{outfit.title}</Text>
        </View>
      )}
    </View>

    <View style={styles.body}>
      <Text style={styles.title}>{outfit.title}</Text>
      {outfit.description ? (
        <Text style={styles.description}>{outfit.description}</Text>
      ) : null}

      {outfit.season || outfit.trend_tags.length > 0 ? (
        <View style={styles.pillRow}>
          {outfit.season ? (
            <View style={styles.pill}>
              <Text style={styles.pillText}>{outfit.season}</Text>
            </View>
          ) : null}
          {outfit.trend_tags.map(tag => (
            <View key={tag} style={styles.pill}>
              <Text style={styles.pillText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  </>
);
