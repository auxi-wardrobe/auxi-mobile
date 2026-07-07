import React from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LoadableRemoteImage } from '../../components/features/LoadableRemoteImage';
import { BodyItem } from '../../services/bodyService';
import { resolveImageUrl } from '../../utils/body';
import { theme } from '../../theme/theme';

const { width: screenWidth } = Dimensions.get('window');
const IMAGE_GAP = 8;
const IMAGE_SIZE = Math.floor((screenWidth - 44 - IMAGE_GAP * 2) / 3);

interface BodyPhotoGridProps {
  loading: boolean;
  items: BodyItem[];
  selectedBodyId: string | null;
  isTryOnMode: boolean;
  onSelectBody: (item: BodyItem) => void;
  onPreviewImage: (imageUri: string) => void;
  onDeleteItem: (id: string) => void;
}

// Row of up to 3 body photos (loading/empty = placeholder cards).
// In try-on mode a tap selects the body; otherwise a tap opens the lightbox.
export const BodyPhotoGrid: React.FC<BodyPhotoGridProps> = ({
  loading,
  items,
  selectedBodyId,
  isTryOnMode,
  onSelectBody,
  onPreviewImage,
  onDeleteItem,
}) => {
  if (loading) {
    return (
      <View style={styles.imageRow}>
        {[0, 1, 2].map(index => (
          <View
            key={`loading-${index}`}
            style={[styles.imageCard, styles.placeholderCard]}
          />
        ))}
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.imageRow}>
        {[0, 1, 2].map(index => (
          <View
            key={`placeholder-${index}`}
            style={[styles.imageCard, styles.placeholderCard]}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.imageRow}>
      {items.slice(0, 3).map(item => {
        const imageUri = resolveImageUrl(item.image_url);
        const isSelected = item.id === selectedBodyId;

        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.88}
            onPress={() => {
              if (isTryOnMode) {
                onSelectBody(item);
              } else {
                onPreviewImage(imageUri);
              }
            }}
            onLongPress={() => onDeleteItem(item.id)}
            style={[
              styles.imageCard,
              isTryOnMode && isSelected && styles.imageCardSelected,
            ]}
          >
            <LoadableRemoteImage
              uri={imageUri}
              resizeMode="cover"
              skeletonTestID={`body-photo-grid-skeleton-${item.id}`}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  imageRow: {
    flexDirection: 'row',
    gap: IMAGE_GAP,
  },
  imageCard: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.white,
  },
  imageCardSelected: {
    borderWidth: 2,
    borderColor: '#3BA3D0',
  },
  placeholderCard: {
    backgroundColor: '#E5E6EA',
  },
});
