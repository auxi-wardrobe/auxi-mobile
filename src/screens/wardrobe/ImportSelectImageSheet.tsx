import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ContextualBottomSheet } from '../../components/features/ContextualBottomSheet';
import { PressableScale } from '../../components/primitives/PressableScale';
import { MButton } from '../../components/design-system/lib';
import { theme } from '../../theme/theme';
import { ExtractedImage } from './import-from-web';

interface ImportSelectImageSheetProps {
  visible: boolean;
  images: ExtractedImage[];
  onSelect: (image: ExtractedImage) => void;
  onCancel: () => void;
}

const { width: screenWidth } = Dimensions.get('window');
const SHEET_PADDING = theme.spacing.m;

const tileImageStyles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.figmaDetailSurface,
  },
});

const TileImage: React.FC<{ uri: string }> = ({ uri }) => {
  const [error, setError] = useState(false);
  return error ? (
    <View style={tileImageStyles.placeholder} />
  ) : (
    <Image
      source={{ uri }}
      style={tileImageStyles.image}
      resizeMode="cover"
      onError={() => setError(true)}
    />
  );
};
const GRID_GAP = theme.spacing.s;
const COLUMNS = 3;
// Floor to keep the exact-fit flexWrap row from collapsing to 2 columns on @2x
// devices — see the TILE_WIDTH note in wardrobe-grid.ts for the rounding cause.
const TILE_SIZE = Math.floor(
  (screenWidth - SHEET_PADDING * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS,
);

/**
 * "Select an image" — the extracted-image grid (Figma: Select an image sheet).
 * Rides the shared ContextualBottomSheet shell. Exactly one image can be
 * picked; tapping a tile opens Preview. Cancel dismisses back to the results
 * page without any data change. The grid is capped upstream (24 images) so the
 * ScrollView never has to virtualize.
 */
export const ImportSelectImageSheet: React.FC<ImportSelectImageSheetProps> = ({
  visible,
  images,
  onSelect,
  onCancel,
}) => {
  const { t } = useTranslation();

  return (
    <ContextualBottomSheet
      visible={visible}
      onDismiss={onCancel}
      testID="import-select-sheet"
    >
      <View style={styles.body}>
        <Text style={styles.title}>
          {t('wardrobe.import_web.select_title')}
        </Text>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.grid}
        >
          {images.map((image, index) => (
            <PressableScale
              key={image.url}
              style={styles.tile}
              activeOpacity={0.85}
              onPress={() => onSelect(image)}
              testID={`import-image-${index}`}
              accessibilityLabel={t('wardrobe.import_web.image_a11y', {
                index: index + 1,
              })}
            >
              <TileImage uri={image.url} />
            </PressableScale>
          ))}
        </ScrollView>

        <View style={styles.cancelWrap}>
          <MButton
            variant="secondary"
            onPress={onCancel}
            testID="import-select-cancel"
            accessibilityLabel={t('wardrobe.import_web.cancel')}
          >
            {t('wardrobe.import_web.cancel')}
          </MButton>
        </View>
      </View>
    </ContextualBottomSheet>
  );
};

const styles = StyleSheet.create({
  body: {
    paddingTop: theme.spacing.xs,
  },
  title: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.figmaTextPrimary,
    marginBottom: theme.spacing.m,
  },
  // Cap the grid height so a big result set scrolls inside the sheet instead of
  // pushing the Cancel button off-screen.
  scroll: {
    maxHeight: TILE_SIZE * 3 + GRID_GAP * 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: theme.borderRadius.figmaTile,
    overflow: 'hidden',
    backgroundColor: theme.colors.figmaDetailSurface,
  },
  cancelWrap: {
    marginTop: theme.spacing.l,
  },
});
