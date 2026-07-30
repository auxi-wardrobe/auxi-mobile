import React from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MSheetOption } from '../../../components/design-system/lib';
import { ContextualBottomSheet } from '../../../components/features/ContextualBottomSheet';
import { Icons } from '../../../assets/icons';
import type { CapsuleOutfitSource } from '../../../services/capsuleService';
import { capsuleStyles as s } from '../styles';

/** Add-source options. `wardrobe` picks items directly; the others pick outfits. */
export type CapsuleAddSource = 'wardrobe' | CapsuleOutfitSource;

interface AddSourceSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (source: CapsuleAddSource) => void;
}

/**
 * "Choose where you'd like to add from." — My Wardrobe / My Favourites /
 * My Creations. Same shape as the wardrobe Add-item and Add-to-Schedule
 * pickers: the shared ContextualBottomSheet shell (full-width, top-rounded,
 * "Refine suggestions" reveal motion, scrim, safe-area) + title / subtitle /
 * MSheetOption rows.
 */
export const AddSourceSheet: React.FC<AddSourceSheetProps> = ({
  visible,
  onDismiss,
  onSelect,
}) => {
  const { t } = useTranslation();
  return (
    <ContextualBottomSheet
      visible={visible}
      onDismiss={onDismiss}
      testID="capsule-add-source-sheet"
    >
      <Text style={s.sheetTitle}>{t('capsule.add_sheet_title')}</Text>
      <Text style={s.sheetHelper}>{t('capsule.add_source_helper')}</Text>
      <MSheetOption
        icon={Icons.Wardrobe}
        label={t('capsule.source_wardrobe')}
        onPress={() => onSelect('wardrobe')}
        testID="capsule-add-source-wardrobe"
      />
      <MSheetOption
        icon={Icons.Heart}
        label={t('capsule.source_favourites')}
        onPress={() => onSelect('favourites')}
        testID="capsule-add-source-favourites"
      />
      <MSheetOption
        icon={Icons.OutfitCanvas}
        label={t('capsule.source_creations')}
        onPress={() => onSelect('creations')}
        testID="capsule-add-source-creations"
      />
    </ContextualBottomSheet>
  );
};
