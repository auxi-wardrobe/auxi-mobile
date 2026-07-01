import { useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Asset,
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import { toast } from '../../components/design-system/lib';
import { wardrobeService } from '../../services/wardrobeService';
import { track } from '../../services/analytics';
import { User } from '../../types/auth';
import { FilterTab, resolveFilterQuery } from './wardrobe-grid';

interface UseAddWardrobeItemParams {
  selectedTab: FilterTab;
  user: User | null;
  // Reused from useItemReadySnackbar so add-success shows the mint M3 snackbar
  // (AU-372), not the default bottom toast.
  showReadySnackbar: (message: string) => void;
  // Refetch the wardrobe after a successful upload.
  refetch: () => Promise<void>;
  closeAddSheet: () => void;
  openPhotoSourceSheet: () => void;
}

interface UseAddWardrobeItem {
  uploading: boolean;
  uploadingPhotoUri: string | null;
  handleImageSelection: (type: 'camera' | 'gallery') => Promise<void>;
  handleTakePhoto: () => void;
}

/**
 * Add-item upload orchestration extracted verbatim from WardrobeScreen: image
 * pick (camera/gallery) → upload → analytics → add-success snackbar → refetch,
 * plus the take-photo source chooser hand-off. `uploading` / `uploadingPhotoUri`
 * drive the header spinner + the PreparingOverlay. The upload/analytics/error
 * sequence is unchanged from the screen — only relocated.
 */
export const useAddWardrobeItem = ({
  selectedTab,
  user,
  showReadySnackbar,
  refetch,
  closeAddSheet,
  openPhotoSourceSheet,
}: UseAddWardrobeItemParams): UseAddWardrobeItem => {
  const { t } = useTranslation();

  const [uploading, setUploading] = useState(false);
  const [uploadingPhotoUri, setUploadingPhotoUri] = useState<string | null>(
    null,
  );

  const handleImageSelection = async (type: 'camera' | 'gallery') => {
    closeAddSheet();

    setTimeout(async () => {
      const options = {
        mediaType: 'photo' as const,
        selectionLimit: 1,
      };

      const result =
        type === 'camera'
          ? await launchCamera(options)
          : await launchImageLibrary(options);

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert(
          t('common.error_title'),
          result.errorMessage || t('common.pick_image_failed'),
        );
        return;
      }

      const asset: Asset | undefined = result.assets?.[0];
      if (!asset) {
        return;
      }

      try {
        setUploadingPhotoUri(asset.uri ?? null);
        setUploading(true);
        track('add_item_upload_started', { source: type });
        if (type === 'camera') {
          track('wardrobe_photo_captured', { source: 'add_item' });
        }

        const createdItem = await wardrobeService.uploadWardrobeItem(
          asset,
          user!,
          resolveFilterQuery(selectedTab),
        );

        track('add_item_upload_succeeded', { source: type });
        const addedProps: Record<string, unknown> = {
          source: type,
          method: 'take_photo',
        };
        if (createdItem?.id) {
          addedProps.item_id = createdItem.id;
        }
        if (createdItem?.category) {
          addedProps.category = createdItem.category;
        }
        track('wardrobe_item_added', addedProps);
        // AU-372: surface add-success via the mint M3 ItemReadySnackbar overlay
        // (same component as the ready moment), not the default bottom toast.
        // Copy reads "Item added. We'll finish preparing it in the background."
        showReadySnackbar(t('wardrobe.list.added_title'));

        await refetch();
      } catch (error) {
        console.error('Upload error', error);
        track('add_item_upload_failed', { source: type });
        toast.show({
          type: 'error',
          text1: t('wardrobe.list.upload_failed_title'),
          text2: t('wardrobe.list.upload_failed_body'),
          position: 'bottom',
        });
      } finally {
        setUploading(false);
        setUploadingPhotoUri(null);
      }
    }, 250);
  };

  const handleTakePhoto = () => {
    track('add_item_method_selected', { method: 'take_photo' });
    closeAddSheet();
    // Let the add sheet finish its close animation before the source chooser
    // slides up (matches the prior Alert timing).
    setTimeout(() => {
      openPhotoSourceSheet();
    }, 250);
  };

  return {
    uploading,
    uploadingPhotoUri,
    handleImageSelection,
    handleTakePhoto,
  };
};
