import React from 'react';
import {
  Dimensions,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LoadableRemoteImage } from '../../components/features/LoadableRemoteImage';
import { TopIconButton } from '../../components/primitives/FigmaPrimitives';
import { DotsLoader } from '../../components/atoms/DotsLoader';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { BodyItem } from '../../services/bodyService';
import { formatPhotoTimestamp, resolveImageUrl } from '../../utils/body';
import { PhotoSourceModal } from './PhotoSourceModal';

const { width: screenWidth } = Dimensions.get('window');
// Body-photo detail (Settings redesign Frame 5): full-bleed 3:4 image.
const DETAIL_IMAGE_HEIGHT = Math.round(screenWidth * (4 / 3));

interface BodyPhotoDetailViewProps {
  selectedBody: BodyItem | null;
  loading: boolean;
  uploading: boolean;
  modalVisible: boolean;
  onBack: () => void;
  onDelete: (id: string) => void;
  onImageSelect: (type: 'camera' | 'gallery') => void;
  onOpenSourceModal: () => void;
  onCloseSourceModal: () => void;
}

// Body-photo detail view (Settings redesign Frame 5).
// Single photo: full 3:4 image + metadata caption + Delete (red, left) / Retake (right).
// Reuses the host's handleDelete + handleImageSelection (Retake = re-capture/upload).
export const BodyPhotoDetailView: React.FC<BodyPhotoDetailViewProps> = ({
  selectedBody,
  loading,
  uploading,
  modalVisible,
  onBack,
  onDelete,
  onImageSelect,
  onOpenSourceModal,
  onCloseSourceModal,
}) => {
  const { t } = useTranslation();
  const detailImageUrl = selectedBody
    ? resolveImageUrl(selectedBody.image_url)
    : null;
  const photoTimestamp = formatPhotoTimestamp(selectedBody?.created_at);

  return (
    <SafeAreaView style={styles.detailContainer}>
      <View style={styles.detailImageWrap}>
        {detailImageUrl ? (
          <LoadableRemoteImage
            uri={detailImageUrl}
            style={styles.detailImage}
            resizeMode="cover"
            skeletonTestID="body-detail-image-skeleton"
          />
        ) : (
          <View style={[styles.detailImage, styles.detailImagePlaceholder]}>
            <Text style={styles.detailPlaceholderText}>
              {loading ? t('common.loading') : t('body.no_photo_hint')}
            </Text>
          </View>
        )}

        <View style={styles.detailBackWrap}>
          <TopIconButton
            testID="body-detail-back"
            onPress={onBack}
            icon={<Icons.ChevronLeft width={24} height={24} />}
          />
        </View>
      </View>

      <View style={styles.detailPanel}>
        <View style={styles.detailCopy}>
          {photoTimestamp ? (
            <Text style={styles.detailText}>
              {t('body.time_label', { time: photoTimestamp })}
            </Text>
          ) : null}
          <Text style={styles.detailText}>{t('body.photo_helps')}</Text>
          <Text style={styles.detailText}>{t('body.privacy_note')}</Text>
        </View>

        <View style={styles.detailActions}>
          <TouchableOpacity
            testID="body-detail-delete"
            activeOpacity={0.82}
            disabled={!selectedBody}
            style={[
              styles.detailActionButton,
              !selectedBody && styles.detailActionDisabled,
            ]}
            onPress={() => {
              if (selectedBody) {
                onDelete(selectedBody.id);
              }
            }}
          >
            <Text style={styles.detailDeleteLabel}>{t('common.delete')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="body-detail-retake"
            activeOpacity={0.82}
            disabled={uploading}
            style={[
              styles.detailActionButton,
              uploading && styles.detailActionDisabled,
            ]}
            onPress={onOpenSourceModal}
          >
            {uploading ? (
              <DotsLoader color={theme.colors.uacTextBase} />
            ) : (
              <Text style={styles.detailRetakeLabel}>{t('body.retake')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <PhotoSourceModal
        visible={modalVisible}
        title={t('body.retake_body')}
        onCamera={() => onImageSelect('camera')}
        onGallery={() => onImageSelect('gallery')}
        onClose={onCloseSourceModal}
        cameraTestID="body-detail-retake-camera"
        galleryTestID="body-detail-retake-gallery"
        cancelTestID="body-detail-retake-cancel"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  detailContainer: {
    flex: 1,
    backgroundColor: theme.colors.figmaDetailSurface,
  },
  detailImageWrap: {
    width: '100%',
    height: DETAIL_IMAGE_HEIGHT,
  },
  detailImage: {
    width: '100%',
    height: '100%',
  },
  detailImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.figmaCardSurface,
    paddingHorizontal: 28,
  },
  detailPlaceholderText: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  detailBackWrap: {
    position: 'absolute',
    top: 8,
    left: 22,
  },
  detailPanel: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  detailCopy: {
    gap: 12,
  },
  detailText: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
  },
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailActionButton: {
    minHeight: 56,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.uacRadioPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailActionDisabled: {
    opacity: 0.5,
  },
  detailDeleteLabel: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.figmaRed,
  },
  detailRetakeLabel: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
  },
});
