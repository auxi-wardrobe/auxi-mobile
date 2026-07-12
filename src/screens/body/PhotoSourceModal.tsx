import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';

interface PhotoSourceModalProps {
  visible: boolean;
  title: string;
  onCamera: () => void;
  onGallery: () => void;
  onClose: () => void;
  cameraTestID?: string;
  galleryTestID?: string;
  cancelTestID?: string;
}

// Bottom-sheet-style photo source picker (Take photo / Upload gallery / Cancel).
// Dedup of the two near-identical raw Modals BodyScreen used for upload + retake.
// Raw Modal kept intentionally — DS migration to MActionSheet is a separate gated pass.
export const PhotoSourceModal: React.FC<PhotoSourceModalProps> = ({
  visible,
  title,
  onCamera,
  onGallery,
  onClose,
  cameraTestID,
  galleryTestID,
  cancelTestID,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{title}</Text>

              <TouchableOpacity
                testID={cameraTestID}
                style={styles.modalAction}
                onPress={onCamera}
              >
                <Text style={styles.modalActionText}>
                  {t('common.take_photo')}
                </Text>
              </TouchableOpacity>

              <View style={styles.modalDivider} />

              <TouchableOpacity
                testID={galleryTestID}
                style={styles.modalAction}
                onPress={onGallery}
              >
                <Text style={styles.modalActionText}>
                  {t('common.upload_gallery')}
                </Text>
              </TouchableOpacity>

              <View style={styles.modalDivider} />

              <TouchableOpacity
                testID={cancelTestID}
                style={styles.modalCancel}
                onPress={onClose}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: theme.spacing.m,
    paddingTop: 20,
    paddingBottom: 34,
  },
  modalTitle: {
    ...theme.typography.aliases.poppinsSemiboldXsSm,
    textAlign: 'center',
    color: theme.colors.uacTextBase,
    marginBottom: theme.spacing.m,
  },
  modalAction: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionText: {
    ...theme.typography.aliases.manropeBody,
    color: theme.colors.figmaAction,
  },
  modalDivider: {
    height: 1,
    backgroundColor: theme.colors.figmaDivider,
  },
  modalCancel: {
    marginTop: 8,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    ...theme.typography.aliases.manropeBody,
    color: theme.colors.figmaRed,
  },
});
