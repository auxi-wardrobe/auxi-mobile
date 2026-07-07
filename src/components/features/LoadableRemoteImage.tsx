import React, { useCallback, useState } from 'react';
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

interface LoadableRemoteImageProps {
  uri: string;
  cache?: ImageURISource['cache'];
  resizeMode?: ImageResizeMode;
  imageStyle?: StyleProp<ImageStyle>;
  imageTestID?: string;
  style?: StyleProp<ViewStyle>;
  skeletonTestID?: string;
}

export const LoadableRemoteImage: React.FC<LoadableRemoteImageProps> = ({
  uri,
  cache,
  resizeMode = 'cover',
  imageStyle,
  imageTestID,
  style,
  skeletonTestID,
}) => {
  const [loaded, setLoaded] = useState<{ uri: string; complete: boolean }>({
    uri,
    complete: false,
  });

  const handleImageSettled = useCallback(() => {
    setLoaded({ uri, complete: true });
  }, [uri]);

  const loading = loaded.uri !== uri || !loaded.complete;

  return (
    <View style={[styles.container, style]}>
      {loading ? (
        <SkeletonTile
          style={styles.skeleton}
          testID={skeletonTestID ?? 'loadable-image-skeleton'}
        />
      ) : null}
      <Image
        testID={imageTestID}
        source={{ uri, cache }}
        style={[styles.image, imageStyle, loading && styles.imageLoading]}
        resizeMode={resizeMode}
        onLoadEnd={handleImageSettled}
        onError={handleImageSettled}
      />
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
