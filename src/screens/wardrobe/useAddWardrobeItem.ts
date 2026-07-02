import { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  Asset,
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import { toast } from '../../components/design-system/lib';
import { wardrobeService } from '../../services/wardrobeService';
import { track } from '../../services/analytics';
import { useAiConsentGate } from '../../hooks/useAiConsentGate';
import { AppStackParamList } from '../../types/navigation';
import { User } from '../../types/auth';
import { FilterTab, resolveFilterQuery } from './wardrobe-grid';

/** Processing mode for a photo-based wardrobe addition. */
export type UploadMode = 'remove_bg' | 'beautify';

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
  handleImageSelection: (
    type: 'camera' | 'gallery',
    mode?: UploadMode,
  ) => Promise<void>;
  handleTakePhoto: () => void;
  /** Spread onto <AiConsentDialog /> rendered in the parent screen. */
  aiConsentDialogProps: {
    visible: boolean;
    onAccept: () => void;
    onDecline: () => void;
    onOpenPrivacyPolicy: () => void;
  };
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
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  // B1: AI data-sharing consent gate — mirrors the try-on flow exactly.
  // The parent screen renders <AiConsentDialog {...aiConsentDialogProps} />.
  const consentGate = useAiConsentGate();

  const [uploading, setUploading] = useState(false);
  const [uploadingPhotoUri, setUploadingPhotoUri] = useState<string | null>(
    null,
  );

  const handleImageSelection = async (
    type: 'camera' | 'gallery',
    mode: UploadMode = 'remove_bg',
  ) => {
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

      // Upload action — invoked directly for remove_bg or via the consent gate
      // for beautify (which shows AiConsentDialog if not yet granted).
      const doUpload = () => {
        // Async IIFE so the consent gate's sync `run()` can fire it.
        (async () => {
          try {
            setUploadingPhotoUri(asset.uri ?? null);
            setUploading(true);
            track('add_item_upload_started', { source: type, mode });
            if (type === 'camera') {
              track('wardrobe_photo_captured', { source: 'add_item' });
            }

            const createdItem = await wardrobeService.uploadWardrobeItem(
              asset,
              user!,
              resolveFilterQuery(selectedTab),
            );

            const addedProps: Record<string, unknown> = {
              source: type,
              method: 'take_photo',
              mode,
            };
            if (createdItem?.id) {
              addedProps.item_id = createdItem.id;
            }
            if (createdItem?.category) {
              addedProps.category = createdItem.category;
            }
            track('wardrobe_item_added', addedProps);

            if (mode === 'beautify') {
              // Submit the beautify job then navigate to the pending screen.
              // wardrobeService.beautifyItem kicks off a background job and
              // returns immediately with {job_id, status, attempts}.
              track('beautify_started');
              await wardrobeService.beautifyItem(createdItem.id);
              navigation.navigate('BeautifyPending', {
                itemId: createdItem.id,
                originalUri: asset.uri ?? '',
              });
            } else {
              // AU-372: surface add-success via the mint M3 ItemReadySnackbar
              // overlay (same component as the ready moment), not a toast.
              track('add_item_upload_succeeded', { source: type });
              showReadySnackbar(t('wardrobe.list.added_title'));
              await refetch();
            }
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
        })();
      };

      if (mode === 'beautify') {
        // Gate: if consent not yet granted, shows AiConsentDialog and defers
        // doUpload until Accept. Decline drops the action (app stays usable).
        consentGate.run(doUpload);
      } else {
        doUpload();
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
    aiConsentDialogProps: consentGate.dialogProps,
  };
};
