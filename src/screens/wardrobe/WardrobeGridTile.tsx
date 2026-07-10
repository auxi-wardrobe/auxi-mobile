import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LoadableRemoteImage } from '../../components/features/LoadableRemoteImage';
import { PressableScale } from '../../components/primitives/PressableScale';
import { WardrobeItem } from '../../services/wardrobeService';
import { theme } from '../../theme/theme';
import { resolveItemImage } from '../../utils/url';
import { Icons } from '../../assets/icons';
import { TILE_HEIGHT, TILE_WIDTH, resolveTileStatus } from './wardrobe-grid';
import { TileStatusBadge } from './TileStatusBadge';

interface WardrobeGridTileProps {
  item: WardrobeItem;
  index: number;
  isSelectMode: boolean;
  selectedItemId: string | null;
  onPress: (item: WardrobeItem) => void;
}

export const WardrobeGridTile: React.FC<WardrobeGridTileProps> = ({
  item,
  index,
  isSelectMode,
  selectedItemId,
  onPress,
}) => {
  const { t } = useTranslation();

  const imageUrl = resolveItemImage({
    image_studio: item.image_studio ?? null,
    image_png: item.image_png ?? null,
    image_url: item.image_url ?? '',
  });

  // qa-ui: the first tile gets a stable `wardrobe-item-first` testID so
  // Maestro flows can deterministically open the first item without relying
  // on the implicit `wardrobe-item-.*` prefix + index:0 match. Subsequent
  // tiles keep the backend-dynamic `wardrobe-item-<id>` testID (both match
  // the `wardrobe-item-.*` prefix, so existing flows still work).
  const tileTestID =
    index === 0 ? 'wardrobe-item-first' : `wardrobe-item-${item.id}`;

  // A tile shows at most one status pill, bottom-centre. Preparing items show
  // the processing overlay instead of a status pill.
  const status = item.is_preparing ? null : resolveTileStatus(item);

  const isSelected = isSelectMode && selectedItemId === item.id;

  return (
    <PressableScale
      style={[styles.tile, isSelected && styles.tileSelected]}
      activeOpacity={0.88}
      onPress={() => onPress(item)}
      testID={tileTestID}
      accessibilityLabel={item.name || t('wardrobe.list.a11y_item_fallback')}
    >
      {imageUrl ? (
        <LoadableRemoteImage
          uri={imageUrl}
          cache="force-cache"
          resizeMode="contain"
          skeletonTestID={`wardrobe-image-skeleton-${item.id}`}
        />
      ) : (
        <View style={styles.tileFallback}>
          <Text style={styles.tileFallbackText}>{t('common.no_image')}</Text>
        </View>
      )}

      {item.is_preparing ? (
        <View style={styles.tilePreparingOverlay}>
          <Text style={styles.tilePreparingText}>
            {t('wardrobe.list.preparing_tile')}
          </Text>
        </View>
      ) : null}

      {/* AI beautify in progress — small corner badge, independent of the
          preparing overlay. Shows while beautify_status === 'pending' so the
          user knows a studio shot is being generated in the background. */}
      {item.beautify_status === 'pending' ? (
        <View
          testID={`wardrobe-tile-beautifying-${item.id}`}
          style={styles.beautifyBadge}
          pointerEvents="none"
        >
          <Text style={styles.beautifyBadgeText}>✨</Text>
        </View>
      ) : null}

      {status ? <TileStatusBadge status={status} itemId={item.id} /> : null}

      {/* Single-select check — top-right, only the picked tile in select
          mode. Pure visual confirmation of the current selection. */}
      {isSelected ? (
        <View
          style={styles.tileSelectedCheck}
          testID={`wardrobe-select-check-${item.id}`}
          pointerEvents="none"
        >
          <Icons.CheckCircle
            width={24}
            height={24}
            color={theme.colors.figmaAction}
          />
        </View>
      ) : null}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  tile: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: theme.borderRadius.figmaTile,
    overflow: 'hidden',
    backgroundColor: theme.colors.figmaDetailSurface,
  },
  // Single-select highlight ring (picker mode).
  tileSelected: {
    borderWidth: 2,
    borderColor: theme.colors.figmaAction,
  },
  tileSelectedCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  tileFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tileFallbackText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
  tilePreparingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tilePreparingText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.figmaTextPrimary,
    textAlign: 'center',
  },
  // AI beautify in-progress badge — top-left corner, chip SM (24px height),
  // mirrors the TileStatusBadge pill sizing/radius/token colours. Sits above
  // the preparing overlay via absolute positioning so it remains visible even
  // when the tile is also preparing.
  beautifyBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    height: 24,
    paddingHorizontal: theme.spacing.s,
    borderRadius: 9999,
    backgroundColor: theme.colors.figmaCardTag,
    justifyContent: 'center',
    alignItems: 'center',
  },
  beautifyBadgeText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.white,
  },
});
