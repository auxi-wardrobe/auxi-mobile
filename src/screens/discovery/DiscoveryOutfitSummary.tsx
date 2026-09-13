import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import type { DiscoveryOutfitDetail } from '../../services/discoveryService';
import {
  COVER_FALLBACK_RATIO,
  discoveryOutfitDetailStyles as styles,
} from './discoveryOutfitDetailStyles';

interface DiscoveryOutfitSummaryProps {
  outfit: DiscoveryOutfitDetail;
}

/**
 * Natural width/height ratio of a remote image, or `null` until it is known.
 *
 * The hero cover's height is deliberately free — it follows whatever the
 * curator uploaded (portrait, square, wide) instead of being cropped into a
 * fixed 3:4 box — so the frame needs the real ratio. `Image.getSize` reads it
 * from the image pipeline's cache (the same URI the `<Image>` below renders,
 * so it is one fetch in practice) and works on iOS, Android and
 * react-native-web alike. Until it resolves, and if it fails, the frame keeps
 * `COVER_FALLBACK_RATIO` so the layout never collapses to zero height.
 */
const useNaturalRatio = (uri: string | null): number | null => {
  const [ratio, setRatio] = useState<number | null>(null);

  useEffect(() => {
    setRatio(null);
    if (!uri) {
      return;
    }
    let cancelled = false;
    Image.getSize(
      uri,
      (width, height) => {
        if (!cancelled && width > 0 && height > 0) {
          setRatio(width / height);
        }
      },
      () => {
        // Unreachable URI — the `<Image>` shows its own empty frame; keep the
        // fallback ratio rather than leaving a zero-height hole.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return ratio;
};

/** Cover image (with a token-styled fallback) + title + description + season/tag pills. */
export const DiscoveryOutfitSummary: React.FC<DiscoveryOutfitSummaryProps> = ({
  outfit,
}) => {
  const coverUri = outfit.composite_image_url;
  const ratio = useNaturalRatio(coverUri);

  return (
    <>
      <View
        testID="discovery-detail-cover"
        style={[styles.coverFrame, { aspectRatio: ratio ?? COVER_FALLBACK_RATIO }]}
      >
        {coverUri ? (
          <Image
            testID="discovery-detail-cover-image"
            source={{ uri: coverUri }}
            style={styles.cover}
            // `contain` once the frame matches the image's own ratio — the two
            // are then equivalent, but `contain` is what keeps a still-measuring
            // or failed-measure frame from cropping the outfit.
            resizeMode="contain"
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
};
