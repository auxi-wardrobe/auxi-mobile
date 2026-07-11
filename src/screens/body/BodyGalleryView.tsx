import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LoadableRemoteImage } from '../../components/features/LoadableRemoteImage';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { Header } from '../../components/layout/Header';
import { BodyItem } from '../../services/bodyService';
import { bodyPhotoTypeLabelKey, resolveImageUrl } from '../../utils/body';
import { theme } from '../../theme/theme';
import {
  GRID_GAP,
  HORIZONTAL_PADDING,
  TILE_HEIGHT,
  TILE_WIDTH,
} from '../wardrobe/wardrobe-grid';
import { PhotoSourceModal } from './PhotoSourceModal';

interface BodyGalleryViewProps {
  loading: boolean;
  items: BodyItem[];
  uploading: boolean;
  modalVisible: boolean;
  onBack: () => void;
  onTilePress: (item: BodyItem) => void;
  onAddPhoto: () => void;
  onImageSelect: (type: 'camera' | 'gallery') => void;
  onCloseSourceModal: () => void;
}

// Manage body photo (Settings → "Manage body photo"): a wardrobe-style grid
// listing EVERY body photo on the user's profile — uploads, selfies, AI
// results and body shapes — not just the primary full-body slot. Tapping a tile
// opens the existing photo-detail view (view + delete). Mirrors the Wardrobe
// grid layout (3 columns, 3:4 tiles, shared sizing tokens) so the two screens
// read as one system.
export const BodyGalleryView: React.FC<BodyGalleryViewProps> = ({
  loading,
  items,
  uploading,
  modalVisible,
  onBack,
  onTilePress,
  onAddPhoto,
  onImageSelect,
  onCloseSourceModal,
}) => {
  const { t } = useTranslation();

  const renderTile = (item: BodyItem, index: number) => {
    const imageUri = resolveImageUrl(item.image_url);
    const typeKey = bodyPhotoTypeLabelKey(item);

    return (
      <TouchableOpacity
        key={item.id}
        testID={`body-gallery-tile-${index}`}
        accessibilityRole="button"
        accessibilityLabel={t('body.a11y_view_photo')}
        activeOpacity={0.88}
        onPress={() => onTilePress(item)}
        style={styles.tile}
      >
        <LoadableRemoteImage
          uri={imageUri}
          resizeMode="cover"
          skeletonTestID={`body-gallery-tile-skeleton-${item.id}`}
        />
        {typeKey ? (
          <View style={styles.typeBadge} pointerEvents="none">
            <Text style={styles.typeBadgeText} numberOfLines={1}>
              {t(typeKey)}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header.BackTitle
        title={t('body.gallery_title')}
        leftTestID="body-gallery-back"
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{t('body.gallery_hero_title')}</Text>
          <Text style={styles.heroBody}>{t('body.gallery_hero_body')}</Text>
        </View>

        {loading ? (
          <View style={styles.grid} testID="body-gallery-loading">
            {Array.from({ length: 6 }).map((_, index) => (
              <View key={`skeleton-${index}`} style={styles.tileSkeleton} />
            ))}
          </View>
        ) : items.length > 0 ? (
          <>
            <View style={styles.grid} testID="body-gallery-grid">
              {items.map(renderTile)}
            </View>
            <Text style={styles.helperText}>{t('body.gallery_helper')}</Text>
          </>
        ) : (
          <View style={styles.emptyState} testID="body-gallery-empty">
            <Text style={styles.emptyText}>{t('body.gallery_empty')}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomActionWrap}>
        <PillButton
          testID="body-gallery-add"
          title={t('body.upload_body_photo')}
          variant="outline"
          onPress={onAddPhoto}
          loading={uploading}
        />
      </View>

      <PhotoSourceModal
        visible={modalVisible}
        title={t('body.upload_body_photo')}
        onCamera={() => onImageSelect('camera')}
        onGallery={() => onImageSelect('gallery')}
        onClose={onCloseSourceModal}
        cameraTestID="body-gallery-add-camera"
        galleryTestID="body-gallery-add-gallery"
        cancelTestID="body-gallery-add-cancel"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  content: {
    paddingTop: 12,
    paddingBottom: 140,
  },
  bottomActionWrap: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 28,
  },
  hero: {
    marginHorizontal: HORIZONTAL_PADDING,
    marginBottom: 12,
    padding: 18,
    borderRadius: 16,
    backgroundColor: theme.colors.white,
    gap: 8,
  },
  heroTitle: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaText,
  },
  heroBody: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaText,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  tile: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: theme.borderRadius.figmaTile,
    overflow: 'hidden',
    backgroundColor: theme.colors.white,
  },
  tileSkeleton: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: theme.borderRadius.figmaTile,
    backgroundColor: theme.colors.figmaDetailSurface,
  },
  typeBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    maxWidth: TILE_WIDTH - 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  typeBadgeText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.white,
  },
  helperText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
    marginTop: 14,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  emptyState: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 56,
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
});
