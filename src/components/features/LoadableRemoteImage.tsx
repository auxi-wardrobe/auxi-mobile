import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageResizeMode,
  type ImageStyle,
  type ImageURISource,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SkeletonTile } from './SkeletonTile';
import { useImageFallback } from '../../hooks/useImageFallback';

interface LoadableRemoteImageProps {
  uri: string;
  /**
   * Lower-precedence URLs to fall back to, in order, when `uri` fails to
   * load. Lets a dead `processed/` cutout degrade to the still-alive
   * `common_items/` original instead of rendering a blank tile.
   */
  fallbackUris?: string[];
  cache?: ImageURISource['cache'];
  resizeMode?: ImageResizeMode;
  imageStyle?: StyleProp<ImageStyle>;
  imageTestID?: string;
  style?: StyleProp<ViewStyle>;
  skeletonTestID?: string;
}

export const LoadableRemoteImage: React.FC<LoadableRemoteImageProps> = ({
  uri,
  fallbackUris,
  cache,
  resizeMode = 'cover',
  imageStyle,
  imageTestID,
  style,
  skeletonTestID,
}) => {
  const sources = useMemo(
    () => [uri, ...(fallbackUris ?? [])].filter(Boolean),
    [uri, fallbackUris],
  );
  const { uri: activeUri, allFailed, onError } = useImageFallback(sources);

  const [loaded, setLoaded] = useState<{ uri?: string; complete: boolean }>({
    uri: activeUri,
    complete: false,
  });

  const handleImageSettled = useCallback(() => {
    setLoaded({ uri: activeUri, complete: true });
  }, [activeUri]);

  // A failed candidate is retired and the next one starts loading, so keep the
  // skeleton up across the swap rather than flashing a broken frame.
  const handleImageError = useCallback(() => {
    onError();
    handleImageSettled();
  }, [onError, handleImageSettled]);

  const loading = !allFailed && (loaded.uri !== activeUri || !loaded.complete);

  return (
    <View style={[styles.container, style]}>
      {loading ? (
        <SkeletonTile
          style={styles.skeleton}
          testID={skeletonTestID ?? 'loadable-image-skeleton'}
        />
      ) : null}
      {activeUri ? (
        <Image
          testID={imageTestID}
          source={{ uri: activeUri, cache }}
          style={[styles.image, imageStyle, loading && styles.imageLoading]}
          resizeMode={resizeMode}
          onLoadEnd={handleImageSettled}
          onError={handleImageError}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageLoading: {
    opacity: 0,
  },
  skeleton: {
    ...StyleSheet.absoluteFillObject,
  },
});
