import React from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { BodyItem } from '../../services/bodyService';
import { TryOnOutfitContext } from '../../types/navigation';
import { resolveImageUrl } from '../../utils/body';
import { theme } from '../../theme/theme';
import { BodyPhotoGrid } from './BodyPhotoGrid';

const { width: screenWidth } = Dimensions.get('window');

interface BodyTryOnViewProps {
  tryOnOutfit: TryOnOutfitContext;
  previewImageUrl: string | null;
  loading: boolean;
  items: BodyItem[];
  selectedBodyId: string | null;
  isTryOnMode: boolean;
  onSelectBody: (item: BodyItem) => void;
  onPreviewImage: (imageUri: string) => void;
  onDeleteItem: (id: string) => void;
  onUploadAnother: () => void;
  tryOnError: string | null;
}

// Try-on ScrollView content: rendered composite preview, selected-outfit summary,
// body-photo picker grid, and the error surface.
export const BodyTryOnView: React.FC<BodyTryOnViewProps> = ({
  tryOnOutfit,
  previewImageUrl,
  loading,
  items,
  selectedBodyId,
  isTryOnMode,
  onSelectBody,
  onPreviewImage,
  onDeleteItem,
  onUploadAnother,
  tryOnError,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <View style={styles.previewCard}>
        {previewImageUrl ? (
          <Image
            source={{ uri: previewImageUrl }}
            style={styles.tryOnPreview}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.previewPlaceholder}>
            <Text style={styles.previewPlaceholderText}>
              {t('body.upload_to_generate')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.summaryBlock}>
        <Text style={styles.summaryTitle}>{t('body.selected_outfit')}</Text>
        <View style={styles.outfitPreviewRow}>
          {tryOnOutfit.itemImageUrls.slice(0, 4).map((imageUrl, index) => (
            <View
              key={`outfit-preview-${index}`}
              style={styles.outfitPreviewCard}
            >
              <Image
                source={{ uri: resolveImageUrl(imageUrl) }}
                style={styles.outfitPreviewImage}
                resizeMode="contain"
              />
            </View>
          ))}
        </View>
        {tryOnOutfit.stylingNote ? (
          <Text style={styles.summaryText}>{tryOnOutfit.stylingNote}</Text>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>{t('body.choose_body_photo')}</Text>
      <BodyPhotoGrid
        loading={loading}
        items={items}
        selectedBodyId={selectedBodyId}
        isTryOnMode={isTryOnMode}
        onSelectBody={onSelectBody}
        onPreviewImage={onPreviewImage}
        onDeleteItem={onDeleteItem}
      />

      {items.length > 0 ? (
        <PillButton
          title={t('body.upload_another')}
          variant="text"
          onPress={onUploadAnother}
          style={styles.inlineAction}
          textStyle={styles.inlineActionText}
        />
      ) : null}

      <Text style={styles.helperText}>
        {items.length === 0
          ? t('body.helper_clear_fullbody')
          : t('body.helper_tap_to_use')}
      </Text>

      {tryOnError ? <Text style={styles.errorText}>{tryOnError}</Text> : null}
    </>
  );
};

const styles = StyleSheet.create({
  previewCard: {
    minHeight: 320,
    borderRadius: 18,
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tryOnPreview: {
    width: '100%',
    height: 320,
  },
  previewPlaceholder: {
    minHeight: 320,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#E8EBF0',
  },
  previewPlaceholderText: {
    ...theme.typography.aliases.manropeBody,
    color: theme.colors.figmaText,
    textAlign: 'center',
  },
  summaryBlock: {
    gap: 8,
  },
  summaryTitle: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaText,
  },
  summaryText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaText,
  },
  outfitPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  outfitPreviewCard: {
    width: (screenWidth - 60) / 4,
    aspectRatio: 3 / 4,
    borderRadius: 12,
    backgroundColor: '#ECEEF2',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitPreviewImage: {
    width: '84%',
    height: '84%',
  },
  sectionTitle: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaText,
  },
  helperText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
  },
  errorText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaRed,
  },
  inlineAction: {
    alignSelf: 'flex-start',
    height: 36,
  },
  inlineActionText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaAction,
  },
});
