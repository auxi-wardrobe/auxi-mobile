// useSaveCommonItemToWardrobe — AU-457 Discovery "save to wardrobe".
//
// Wraps the EXISTING `POST /wardrobe/common-items/{item_id}/clone` client
// (`wardrobeService.cloneCommonItem` — no backend work needed). The clone
// endpoint is NOT idempotent (`WardrobeService.clone_common_item` always
// inserts), so a double-tap would create two wardrobe items — guarded here by
// blocking `save()` while `isSaving` or already `isSaved`.
//
// `isSaved` also persists for the rest of the app session in a module-level
// Set (mirrors the `seenRecommendations` pattern in analytics.ts): re-opening
// the same item's detail screen later in the session must still show the
// terminal "Saved" state, not a fresh un-saved button.

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '../components/design-system/lib';
import { track } from '../services/analytics';
import { wardrobeKeys, wardrobeService } from '../services/wardrobeService';
import { getFriendlyError } from '../utils/wardrobeItemMappers';

const savedItemIds = new Set<string>();

export interface UseSaveCommonItemToWardrobe {
  isSaved: boolean;
  isSaving: boolean;
  save: () => void;
}

export const useSaveCommonItemToWardrobe = (
  itemId: string,
  outfitId: string,
): UseSaveCommonItemToWardrobe => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isSaved, setIsSaved] = useState(() => savedItemIds.has(itemId));

  const mutation = useMutation({
    mutationFn: () => wardrobeService.cloneCommonItem(itemId),
    onSuccess: () => {
      savedItemIds.add(itemId);
      setIsSaved(true);
      track('discovery_item_saved', { outfit_id: outfitId, item_id: itemId });
      queryClient.invalidateQueries({ queryKey: wardrobeKeys.all });
      toast.show({
        type: 'success',
        text1: t('discovery.item_saved_toast'),
        position: 'bottom',
      });
    },
    onError: error => {
      toast.show({
        type: 'error',
        text1: t('discovery.item_save_failed_title'),
        text2: getFriendlyError(
          error,
          t('discovery.item_save_failed_body'),
          t,
        ),
        position: 'bottom',
      });
    },
  });

  const save = (): void => {
    if (isSaved || mutation.isPending) {
      return;
    }
    mutation.mutate();
  };

  return { isSaved, isSaving: mutation.isPending, save };
};
