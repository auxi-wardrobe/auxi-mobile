import React from 'react';
import { Image, Modal, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MacgieLoader } from '../../components/macgie';
import { theme } from '../../theme/theme';

interface PreparingOverlayProps {
  visible: boolean;
  photoUri: string | null;
}

/**
 * AI processing overlay (Figma node 2852:20021). Full-screen fade Modal shown
 * while an upload is being processed. Presentational only — the `visible`
 * (uploading) + `photoUri` state stay owned by the screen. Kept as the raw
 * `Modal` (a DS MBottomSheet/overlay migration is a separate gated pass).
 */
export const PreparingOverlay: React.FC<PreparingOverlayProps> = ({
  visible,
  photoUri,
}) => {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.preparingContainer}>
        <View style={styles.preparingPhotoWrap}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.preparingPhoto}
              resizeMode="contain"
            />
          ) : null}
        </View>
        <View style={styles.preparingPanel}>
          <MacgieLoader
            variant="inline"
            size={40}
            testID="wardrobe-preparing-macgie"
          />
          <Text style={styles.preparingTitle}>
            {t('wardrobe.list.preparing_title')}
          </Text>
          <Text style={styles.preparingStep}>
            {'• '}
            {t('wardrobe.list.preparing_step1')}
          </Text>
          <Text style={styles.preparingStep}>
            {'• '}
            {t('wardrobe.list.preparing_step2')}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  preparingContainer: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  preparingPhotoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
    paddingHorizontal: 24,
  },
  preparingPhoto: {
    width: '100%',
    height: '100%',
  },
  preparingPanel: {
    backgroundColor: theme.colors.figmaDetailSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  preparingTitle: {
    ...theme.typography.aliases.poppinsSemiboldSm,
    color: theme.colors.figmaTextPrimary,
    marginTop: 4,
  },
  preparingStep: {
    ...theme.typography.aliases.poppinsBodySm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
});
