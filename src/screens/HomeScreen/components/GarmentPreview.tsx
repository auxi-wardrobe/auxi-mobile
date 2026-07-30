import React from 'react';
import { Image, View } from 'react-native';
import { Item } from '../../../types/item';
import { resolveItemImage } from '../../../utils/url';
import { resolveTileStatus } from '../../../utils/tile-status';
import { TileStatusBadge } from '../../../components/features/TileStatusBadge';
import { styles } from '../styles';

// AU-392: the status pill is data-driven (new / less use / common
// ("Macgie") / none), never an unconditional render. See `resolveTileStatus`
// for precedence; pre-phase-03 backend responses (fields absent) degrade to
// "common" on every tile, matching today's behaviour.
export const GarmentPreview = ({ item }: { item: Item }) => {
  const imageUrl = resolveItemImage(item);
  const status = resolveTileStatus(item);

  return (
    <>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.cardImage}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.cardFallback} />
      )}
      {status ? <TileStatusBadge status={status} itemId={item.id} /> : null}
    </>
  );
};
