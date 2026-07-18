import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { theme } from '../../theme/theme';

interface ImportPreviewModalProps {
  visible: boolean;
  imageUrl: string | null;
  onCancel: () => void;
  onImport: () => void;
  // Fires (iOS) once this Modal has finished dismissing — lets the caller
  // reopen the selection sheet without stacking two Modals mid-transition.
  onClosed?: () => void;
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
  onClosed,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Reset load state when the URL changes so the spinner shows for each new
  // image. Keyed on imageUrl (not the modal animation) avoids an onShow race
  // where a fast-loading image's onLoadEnd fires before the animation callback.
  useEffect(() => {
    if (imageUrl) {
      setImageLoading(true);
      setImageError(false);
    }
  }, [imageUrl]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onCancel}
      onDismiss={onClosed}
      transparent={false}
    >
      <View
        style={[styles.container, { paddingTop: insets.top + theme.spacing.m }]}
      >
        <Text style={styles.title}>
          {t('wardrobe.import_web.preview_title')}
        </Text>

        <View style={styles.imageWrap}>
          {imageUrl && !imageError ? (
            <>
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="contain"
                testID="import-preview-image"
                onLoadEnd={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
              />
              {imageLoading && (
                <ActivityIndicator
                  style={styles.loadingOverlay}
                  size="large"
                  color={theme.colors.figmaTextSecondary}
                />
              )}
            </>
          ) : (
            <Text style={styles.errorText}>
              {t('wardrobe.import_web.preview_load_error')}
            </Text>
          )}
        </View>

        <View
          style={[
            styles.actions,
            { paddingBottom: insets.bottom + theme.spacing.m },
          ]}
        >
          <PillButton
            variant="outline"
            title={t('wardrobe.import_web.cancel')}
            onPress={onCancel}
            style={styles.action}
            testID="import-preview-cancel"
            accessibilityLabel={t('wardrobe.import_web.cancel')}
          />
          {/* Import stays enabled even when the preview fails to render —
              CORS rules that block RN's Image don't apply to the backend
              download, so the server-side import may still succeed. */}
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
    ...theme.typography.aliases.poppinsSemiboldXsSm,
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...theme.typography.aliases.poppinsCaptionXxs,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.m,
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
