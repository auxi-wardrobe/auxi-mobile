import { useCallback } from 'react';
import { Alert } from 'react-native';
import {
  Asset,
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';

/**
 * Reusable single-photo picker — camera or gallery — extracted from the
 * `handleImageSelection` pattern in `BodyScreen`. Returns the picked
 * `Asset` (or `null` on cancel/empty), and surfaces hard errors via an Alert.
 *
 * Shared options match BodyScreen: `{ mediaType: 'photo', selectionLimit: 1 }`.
 * Callers handle the upload + business logic; this hook only owns the picker.
 */
export type ImageSource = 'camera' | 'gallery';

const PICKER_OPTIONS = {
  mediaType: 'photo' as const,
  selectionLimit: 1,
};

export interface UseImagePickerResult {
  /** Launch the picker; resolves to the chosen asset or null (cancel/empty). */
  pickImage: (source: ImageSource) => Promise<Asset | null>;
}

export const useImagePicker = (): UseImagePickerResult => {
  const pickImage = useCallback(
    async (source: ImageSource): Promise<Asset | null> => {
      const result =
        source === 'camera'
          ? await launchCamera(PICKER_OPTIONS)
          : await launchImageLibrary(PICKER_OPTIONS);

      if (result.didCancel) {
        return null;
      }

      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Failed to pick image');
        return null;
      }

      if (!result.assets?.length) {
        return null;
      }

      return result.assets[0];
    },
    [],
  );

  return { pickImage };
};
