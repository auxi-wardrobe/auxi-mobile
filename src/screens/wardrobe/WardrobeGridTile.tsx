import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PressableScale } from '../../components/primitives/PressableScale';
import { WardrobeItem } from '../../services/wardrobeService';
import { theme } from '../../theme/theme';
import { resolveItemImage } from '../../utils/url';
import { Icons } from '../../assets/icons';
import { TILE_HEIGHT, TILE_WIDTH, resolveTileStatus } from './wardrobe-grid';

interface WardrobeGridTileProps {
  item: WardrobeItem;
  index: number;
  isSelectMode: boolean;
  selectedItemId: string | null;
  viewed: boolean;
  onPress: (item: WardrobeItem) => void;
}

export const WardrobeGridTile: React.FC<WardrobeGridTileProps> = ({
  item,
  index,
  isSelectMode,
  selectedItemId,
  viewed,
  onPress,
}) => {
  const { t } = useTranslation();

  const imageUrl = resolveItemImage({
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
  const status = item.is_preparing ? null : resolveTileStatus(item, viewed);

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
        <Image
          source={{ uri: imageUrl, cache: 'force-cache' }}
          style={styles.tileImage}
          resizeMode="contain"
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

      {/* A single status pill, bottom-centre (Figma): "less use" (demoted),
          "common" (catalog item) or "new" (fresh upload, not yet opened). */}
      {status === 'new' ? (
        <View style={styles.tileBadgeWrap}>
          <View
            style={[styles.tileBadge, styles.tileNewBadge]}
            testID={`wardrobe-item-new-${item.id}`}
            accessibilityLabel={t('wardrobe.new_badge')}
          >
            <Text numberOfLines={1} style={styles.tileNewBadgeText}>
              {t('wardrobe.new_badge')}
            </Text>
          </View>
        </View>
      ) : null}

      {status === 'less_use' ? (
        <View style={styles.tileBadgeWrap}>
          <View
            style={[styles.tileBadge, styles.tileLessUsedBadge]}
            testID={`wardrobe-item-less-used-${item.id}`}
            accessibilityLabel={t('wardrobe.less_used_badge')}
          >
            <Text numberOfLines={1} style={styles.tileLessUsedBadgeText}>
              {t('wardrobe.less_used_badge')}
            </Text>
          </View>
        </View>
      ) : null}

      {status === 'common' ? (
        <View style={styles.tileBadgeWrap}>
          <View
            style={styles.tileBadge}
            testID={`wardrobe-item-common-${item.id}`}
            accessibilityLabel={t('common.badge_common')}
          >
            <Text numberOfLines={1} style={styles.tileBadgeText}>
              {t('common.badge_common')}
            </Text>
          </View>
        </View>
      ) : null}

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
  tileImage: {
    width: '100%',
    height: '100%',
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
  tileBadgeWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    alignItems: 'center',
  },
  // Base status pill (bottom-centre). The "common" variant uses this as-is
  // (dark fill, white text); "new" / "less use" override only the colours.
  // F5: reuse the existing token instead of re-inlining the rgba duplicate
  // (figmaCardTag === rgba(18,18,18,0.75), theme.ts:23). DRY.
  tileBadge: {
    height: 24, // chip size SM
    paddingHorizontal: 12,
    borderRadius: 9999,
    backgroundColor: theme.colors.figmaCardTag,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileBadgeText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.white,
  },
  // "New" — mint fill (reuses the success/200 token) + dark text.
  tileNewBadge: {
    backgroundColor: theme.colors.figmaSnackbarSuccessBg,
  },
  tileNewBadgeText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.figmaTextPrimary,
  },
  // "Less use" — soft coral fill + danger-red text (matches the item-detail
  // "Less used" affordance colour).
  tileLessUsedBadge: {
    backgroundColor: theme.colors.figmaTileLessUsedBadgeBg,
  },
  tileLessUsedBadgeText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.figmaItemDetailDanger,
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
});
