import React, { useMemo } from 'react';
import { Image } from 'react-native';
import { useImageFallback } from '../../hooks/useImageFallback';
import { resolveItemImageSources } from '../../utils/url';
import { makeItYoursStyles as styles } from './makeItYoursStyles';

type ImageLike = { image_url: string; image_png: string | null; image_studio?: string | null };

// Dead `processed/` cutout falls back to the live original (see url.ts).
export const TileImage: React.FC<{ item: ImageLike }> = ({ item }) => {
  const sources = useMemo(
    () => resolveItemImageSources(item),
    [item],
  );
  const { uri, onError } = useImageFallback(sources);
  return (
    <Image
      source={{ uri }}
      style={styles.tileImage}
      resizeMode="cover"
      onError={onError}
    />
  );
};
