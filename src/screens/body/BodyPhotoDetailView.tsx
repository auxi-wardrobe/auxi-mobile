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
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { BodyItem } from '../../services/bodyService';
import { formatPhotoTimestamp, resolveImageUrl } from '../../utils/body';

const { width: screenWidth } = Dimensions.get('window');
// Body-photo detail (Settings redesign Frame 5): full-bleed 3:4 image.
const DETAIL_IMAGE_HEIGHT = Math.round(screenWidth * (4 / 3));

interface BodyPhotoDetailViewProps {
  selectedBody: BodyItem | null;
  loading: boolean;
  onBack: () => void;
  onDelete: (id: string) => void;
}

// Body-photo detail view — opened from the "Manage body photos" library grid.
// View-only + Delete: the full 3:4 image, a metadata caption, and a single
// Delete action. Adding/retaking a photo is not offered here (nor in the
// library grid), so there's no capture affordance. Back returns to the library.
export const BodyPhotoDetailView: React.FC<BodyPhotoDetailViewProps> = ({
  selectedBody,
  loading,
  onBack,
  onDelete,
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
            accessibilityLabel={t('uac.common.back')}
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
            accessibilityRole="button"
            accessibilityLabel={t('common.delete')}
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
        </View>
      </View>
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
    alignItems: 'center',
  },
  // Single destructive action, stretched to full width so it reads as the one
  // primary control on the panel.
  detailActionButton: {
    alignSelf: 'stretch',
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
});
