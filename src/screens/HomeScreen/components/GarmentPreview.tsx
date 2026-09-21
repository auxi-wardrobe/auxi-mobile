import React, { useMemo } from 'react';
import { Image, View } from 'react-native';
import { Item } from '../../../types/item';
import { resolveItemImageSources } from '../../../utils/url';
import { useImageFallback } from '../../../hooks/useImageFallback';
import { resolveTileStatus } from '../../../utils/tile-status';
import { TileStatusBadge } from '../../../components/features/TileStatusBadge';
import { styles } from '../styles';

// AU-392: the status pill is data-driven (new / less use / common
// ("Macgie") / none), never an unconditional render. See `resolveTileStatus`
// for precedence; pre-phase-03 backend responses (fields absent) degrade to
// "common" on every tile, matching today's behaviour.
export const GarmentPreview = ({ item }: { item: Item }) => {
  // Walk image_studio → image_png → image_url on load error: a dead
  // `processed/` cutout must degrade to the live original, not a blank tile.
  const sources = useMemo(() => resolveItemImageSources(item), [item]);
  const { uri: imageUrl, onError } = useImageFallback(sources);
  const status = resolveTileStatus(item);

  return (
    <>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.cardImage}
          resizeMode="contain"
          onError={onError}
        />
      ) : (
        <View style={styles.cardFallback} />
      )}
      {status ? <TileStatusBadge status={status} itemId={item.id} /> : null}
    </>
  );
};
