import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MBottomSheet } from '../../components/design-system/lib';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { AddMethodRow } from './AddMethodRow';

interface AddItemSheetProps {
  visible: boolean;
  onDismiss: () => void;
  bottomInset: number;
  onSearchDatabase: () => void;
  onTakePhoto: () => void;
}

/**
 * Add item — bottom sheet (Figma node 2852:19750), migrated to the DS
 * MBottomSheet primitive (GH-364): the slide/fade ENTER + faster CLOSE +
 * reduce-motion fallback + scrim/backdrop-dismiss are now encapsulated
 * inside the primitive (replaces the bespoke Modal + Animated +
 * BottomSheetSurface). The two methods stay as the Wardrobe-only
 * AddMethodRow composite because they carry a title + description
 * two-line layout that no generic M* row primitive (MSheetOption /
 * MListRow are single-line) expresses — keeping content faithful.
 */
export const AddItemSheet: React.FC<AddItemSheetProps> = ({
  visible,
  onDismiss,
  bottomInset,
  onSearchDatabase,
  onTakePhoto,
}) => {
  const { t } = useTranslation();

  return (
    <MBottomSheet
      visible={visible}
      onDismiss={onDismiss}
      testID="wardrobe-add-sheet"
    >
      <View style={[styles.addSheetBody, { paddingBottom: bottomInset }]}>
        <Text style={styles.addSheetTitle}>
          {t('wardrobe.list.add_item_sheet_title')}
        </Text>
        <Text style={styles.addSheetSubtitle}>
          {t('wardrobe.list.add_item_sheet_subtitle')}
        </Text>

        <AddMethodRow
          icon={
            <Icons.Database
              width={24}
              height={24}
              color={theme.colors.uacBackgroundBase}
            />
          }
          title={t('wardrobe.list.method_search_title')}
          description={t('wardrobe.list.method_search_desc')}
          onPress={onSearchDatabase}
          testID="wardrobe-add-search"
        />
        <AddMethodRow
          icon={
            <Icons.Camera
              width={24}
              height={24}
              color={theme.colors.uacBackgroundBase}
            />
          }
          title={t('common.take_photo')}
          description={t('wardrobe.list.method_photo_desc')}
          onPress={onTakePhoto}
          testID="wardrobe-add-photo"
          isLast
        />
      </View>
    </MBottomSheet>
  );
};

const styles = StyleSheet.create({
  // Add-item bottom sheet body — MBottomSheet provides the surface, top radius,
  // scrim, grab handle and slide motion; this is just the content padding.
  // The safe-area bottom inset is applied inline.
  addSheetBody: {
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  addSheetTitle: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
  },
  addSheetSubtitle: {
    ...theme.typography.aliases.interBodyMd,
    color: theme.colors.figmaTextPrimary,
    marginTop: 2,
    marginBottom: 8,
  },
});
