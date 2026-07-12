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
import { TopIconButton } from '../../components/primitives/FigmaPrimitives';
import { DotsLoader } from '../../components/atoms/DotsLoader';
import { Header } from '../../components/layout/Header';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { BodyItem } from '../../services/bodyService';
import { bodyPhotoLabelKey, resolveImageUrl } from '../../utils/body';
import {
  GRID_GAP,
  HORIZONTAL_PADDING,
  TILE_HEIGHT,
  TILE_WIDTH,
} from '../wardrobe/wardrobe-grid';

interface BodyPhotoLibraryViewProps {
  loading: boolean;
  uploading: boolean;
  items: BodyItem[];
  onBack: () => void;
  onOpenPhoto: (item: BodyItem) => void;
  onAddPhoto: () => void;
}

// "Manage body photo" library (Settings › Personalization → Manage body photo).
// Wardrobe-style grid listing ALL of the user's body photos — uploaded photos,
// AI-generated body shapes, selfies — each tagged with its origin. Tapping a
// tile opens the body-photo detail view (view + delete). Mirrors the wardrobe
// grid geometry (3 columns, 3:4 tiles) so the two managers read as one system.
export const BodyPhotoLibraryView: React.FC<BodyPhotoLibraryViewProps> = ({
  loading,
  uploading,
  items,
  onBack,
  onOpenPhoto,
  onAddPhoto,
}) => {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <Header.BackTitle
        title={t('body.library_title')}
        leftTestID="body-library-back"
        leftAccessibilityLabel={t('uac.common.back')}
        onBack={onBack}
        right={
          <TopIconButton
            testID="body-library-add"
            accessibilityLabel={t('body.a11y_add_photo_library')}
            onPress={onAddPhoto}
            disabled={uploading}
            icon={
              uploading ? (
                <DotsLoader color={theme.colors.figmaAction} />
              ) : (
                <Icons.Plus width={24} height={24} />
              )
            }
          />
        }
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View testID="body-library-grid-root" style={styles.grid}>
            {Array.from({ length: 6 }).map((_, index) => (
              <View key={`skeleton-${index}`} style={styles.tileSkeleton} />
            ))}
          </View>
        ) : items.length > 0 ? (
          <View testID="body-library-grid-root" style={styles.grid}>
            {items.map((item, index) => {
              const imageUri = resolveImageUrl(item.image_url);
              const label = t(bodyPhotoLabelKey(item));
              return (
                <TouchableOpacity
                  key={item.id}
                  testID={`body-library-tile-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={t('body.a11y_open_photo', { label })}
                  activeOpacity={0.88}
                  style={styles.tile}
                  onPress={() => onOpenPhoto(item)}
                >
                  <LoadableRemoteImage
                    uri={imageUri}
                    resizeMode="cover"
                    skeletonTestID={`body-library-tile-skeleton-${item.id}`}
                  />
                  <View style={styles.tileLabelWrap} pointerEvents="none">
                    <Text style={styles.tileLabel} numberOfLines={1}>
                      {label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState} testID="body-library-empty">
            <Text style={styles.emptyTitle}>{t('body.library_empty')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 32,
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
  // Origin tag pinned to the bottom of each tile (uploaded / AI shape / selfie).
  tileLabelWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: theme.colors.figmaOverlayScrim,
  },
  tileLabel: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.white,
  },
  emptyState: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 56,
    alignItems: 'center',
  },
  emptyTitle: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
});
