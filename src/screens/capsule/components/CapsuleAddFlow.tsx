import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '../../../components/design-system/lib';
import {
  trackCapsuleAddSourceSelected,
  trackCapsuleItemsAdded,
} from '../../../services/analytics';
import type {
  AddItemsResult,
  CapsuleOutfitSource,
} from '../../../services/capsuleService';
import { useAddCapsuleItems, useAddFromOutfits } from '../hooks';
import { toastCapsuleNetworkError } from '../capsule-toast';
import { AddSourceSheet, type CapsuleAddSource } from './AddSourceSheet';
import { SelectOutfitsSheet } from './SelectOutfitsSheet';
import { SelectWardrobeItemsSheet } from './SelectWardrobeItemsSheet';

interface CapsuleAddFlowProps {
  capsuleId: string;
  /** Controls the initial add-source sheet. */
  visible: boolean;
  onClose: () => void;
  /** Item ids already in the capsule → disabled + "Already in capsule" tag. */
  existingItemIds: Set<string>;
}

type Stage = 'source' | 'wardrobe' | 'outfits';

/**
 * Encapsulates the full add flow: source picker → item/outfit selection →
 * mutation → result toast. Keeps CapsuleDetail lean. Renders nothing but the
 * controlled sheets.
 */
export const CapsuleAddFlow: React.FC<CapsuleAddFlowProps> = ({
  capsuleId,
  visible,
  onClose,
  existingItemIds,
}) => {
  const { t } = useTranslation();
  const [stage, setStage] = useState<Stage>('source');
  const [outfitSource, setOutfitSource] =
    useState<CapsuleOutfitSource>('favourites');

  const addItems = useAddCapsuleItems(capsuleId);
  const addFromOutfits = useAddFromOutfits(capsuleId);

  const closeAll = () => {
    setStage('source');
    onClose();
  };

  const handleSelectSource = (source: CapsuleAddSource) => {
    trackCapsuleAddSourceSelected(source);
    if (source === 'wardrobe') {
      setStage('wardrobe');
    } else {
      setOutfitSource(source);
      setStage('outfits');
    }
  };

  const toastNetworkError = () => toastCapsuleNetworkError(t);

  const handleWardrobeConfirm = (itemIds: string[]) => {
    addItems.mutate(itemIds, {
      onSuccess: (result: AddItemsResult) => {
        trackCapsuleItemsAdded({
          source: 'wardrobe',
          items_added: result.items_added,
          new_outfits: result.new_outfits,
          already_existed: result.already_existed,
        });
        toast.show({
          type: 'success',
          text1: t('capsule.add_wardrobe_items', { items: result.items_added }),
          text2: t('capsule.add_wardrobe_outfits', {
            outfits: result.new_outfits,
          }),
        });
        closeAll();
      },
      onError: toastNetworkError,
    });
  };

  const handleOutfitsConfirm = (outfitIds: string[]) => {
    addFromOutfits.mutate(
      { source: outfitSource, outfitIds },
      {
        onSuccess: (result: AddItemsResult) => {
          trackCapsuleItemsAdded({
            source: outfitSource,
            items_added: result.items_added,
            new_outfits: result.new_outfits,
            already_existed: result.already_existed,
          });
          if (result.items_added === 0 && result.new_outfits === 0) {
            toast.show({
              type: 'info',
              text1: t('capsule.all_existing'),
            });
          } else {
            toast.show({
              type: 'success',
              text1: t('capsule.add_fav_items', { items: result.items_added }),
              text2:
                result.new_outfits > 0
                  ? t('capsule.add_fav_outfits', {
                      outfits: result.new_outfits,
                    })
                  : result.already_existed > 0
                  ? t('capsule.add_fav_existed', {
                      existed: result.already_existed,
                    })
                  : undefined,
            });
          }
          closeAll();
        },
        onError: toastNetworkError,
      },
    );
  };

  return (
    <>
      <AddSourceSheet
        visible={visible && stage === 'source'}
        onDismiss={closeAll}
        onSelect={handleSelectSource}
      />
      <SelectWardrobeItemsSheet
        visible={visible && stage === 'wardrobe'}
        existingItemIds={existingItemIds}
        busy={addItems.isPending}
        onDismiss={closeAll}
        onConfirm={handleWardrobeConfirm}
      />
      <SelectOutfitsSheet
        visible={visible && stage === 'outfits'}
        source={outfitSource}
        busy={addFromOutfits.isPending}
        onDismiss={closeAll}
        onConfirm={handleOutfitsConfirm}
      />
    </>
  );
};
