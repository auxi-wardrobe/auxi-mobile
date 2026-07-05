import React from 'react';
import { Image, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { theme } from '../../theme/theme';

interface ImportPreviewModalProps {
  visible: boolean;
  imageUrl: string | null;
  onCancel: () => void;
  onImport: () => void;
}

/**
 * "Preview image" (Figma: Preview image screen) — the chosen image at full
 * width with Cancel / Import. Rendered as a full-screen Modal layered over the
 * results page + selection sheet so Cancel returns straight to the grid with no
 * navigation churn. Import is non-blocking (the screen navigates back to
 * Wardrobe on the first tap — see ImportFromWebScreen.handleImport), so the
 * modal renders no in-flight or error state of its own.
 */
export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  visible,
  imageUrl,
  onCancel,
  onImport,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onCancel}
      transparent={false}
    >
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + theme.spacing.m },
        ]}
      >
        <Text style={styles.title}>
          {t('wardrobe.import_web.preview_title')}
        </Text>

        <View style={styles.imageWrap}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="contain"
              testID="import-preview-image"
            />
          ) : null}
        </View>

        <View
          style={[styles.actions, { paddingBottom: insets.bottom + theme.spacing.m }]}
        >
          <PillButton
            variant="outline"
            title={t('wardrobe.import_web.cancel')}
            onPress={onCancel}
            style={styles.action}
            testID="import-preview-cancel"
            accessibilityLabel={t('wardrobe.import_web.cancel')}
          />
          <PillButton
            variant="filled"
            title={t('wardrobe.import_web.import_cta')}
            onPress={onImport}
            style={styles.action}
            testID="import-preview-import"
            accessibilityLabel={t('wardrobe.import_web.import_cta')}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
    paddingHorizontal: theme.spacing.l,
  },
  title: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.figmaTextPrimary,
    marginBottom: theme.spacing.m,
  },
  imageWrap: {
    flex: 1,
    borderRadius: theme.borderRadius.m,
    overflow: 'hidden',
    backgroundColor: theme.colors.figmaDetailSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.m,
    paddingTop: theme.spacing.m,
  },
  action: {
    flex: 1,
  },
});
