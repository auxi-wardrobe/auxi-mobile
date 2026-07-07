/**
 * useSaveImage — save a (remote) image URL to the device photo library.
 *
 * Native impl: writes the asset to the camera roll via
 * @react-native-camera-roll/camera-roll. iOS auto-prompts for the add-only
 * Photos permission on first save (Info.plist `NSPhotoLibraryAddUsageDescription`);
 * a rejection surfaces as an error toast. A Mixpanel event fires on both
 * outcomes so the download success rate is measurable.
 *
 * A parallel `use-save-image.web.ts` variant handles the browser (anchor
 * download) so the native module never enters the web bundle (vite resolves
 * `.web.ts` first).
 */
import { useCallback, useState } from 'react';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { useTranslation } from 'react-i18next';
import { toast } from '../components/design-system/lib';
import { trackTryOnImageSaved } from '../services/analytics';

export interface UseSaveImage {
  /** True while a save is in flight (re-entry is guarded). */
  saving: boolean;
  /** Save the image at `uri` to the photo library. */
  saveImage: (uri: string) => Promise<void>;
}

export const useSaveImage = (): UseSaveImage => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const saveImage = useCallback(
    async (uri: string): Promise<void> => {
      if (saving || !uri) return;
      setSaving(true);
      try {
        await CameraRoll.saveAsset(uri, { type: 'photo' });
        toast.success(t('seeThisOnMe.download.success'));
        trackTryOnImageSaved('success');
      } catch {
        // Covers a denied Photos permission and a failed remote fetch alike —
        // the user just gets a retryable error toast, no crash.
        toast.error(t('seeThisOnMe.download.error'));
        trackTryOnImageSaved('error');
      } finally {
        setSaving(false);
      }
    },
    [saving, t],
  );

  return { saving, saveImage };
};
