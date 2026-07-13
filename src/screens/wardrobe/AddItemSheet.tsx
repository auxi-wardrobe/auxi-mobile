import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ContextualBottomSheet } from '../../components/features/ContextualBottomSheet';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { AddMethodRow } from './AddMethodRow';

interface AddItemSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onSearchDatabase: () => void;
  onTakePhoto: () => void;
  onImportFromWeb: () => void;
}

/**
 * Add item — full-width bottom sheet (Figma node 2852:19750) on the shared
 * ContextualBottomSheet shell: the "Refine suggestions" reveal motion +
 * reduce-motion fallback + scrim/backdrop-dismiss + safe-area are encapsulated
 * inside the shell (replaces the bespoke Modal + Animated + BottomSheetSurface).
 * The two methods stay as the Wardrobe-only AddMethodRow composite because they
 * carry a title + description two-line layout that no generic M* row primitive
 * (MSheetOption / MListRow are single-line) expresses — keeping content faithful.
 *
 * Uploads always run the default remove-background processing; the AI
 * studio-shot step moved on-demand to Item Detail's Enhance flow, so the
 * former upload-time "Remove background / AI beautify" mode selector was
 * removed.
 */
export const AddItemSheet: React.FC<AddItemSheetProps> = ({
  visible,
  onDismiss,
  onSearchDatabase,
  onTakePhoto,
  onImportFromWeb,
}) => {
  const { t } = useTranslation();

  return (
    <ContextualBottomSheet
      visible={visible}
      onDismiss={onDismiss}
      testID="wardrobe-add-sheet"
    >
      <View style={styles.addSheetBody}>
        <Text style={styles.addSheetTitle}>
          {t('wardrobe.list.add_item_sheet_title')}
        </Text>
        <Text style={styles.addSheetSubtitle}>
          {t('wardrobe.list.add_item_sheet_subtitle')}
        </Text>

        <AddMethodRow
          icon={
            <Icons.SearchDatabase
              width={32}
              height={32}
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
            <Icons.TakePhoto
              width={32}
              height={32}
              color={theme.colors.uacBackgroundBase}
            />
          }
          title={t('common.take_photo')}
          description={t('wardrobe.list.method_photo_desc')}
          onPress={onTakePhoto}
          testID="wardrobe-add-photo"
        />
        <AddMethodRow
          icon={
            <Icons.Globe
              width={24}
              height={24}
              color={theme.colors.uacBackgroundBase}
            />
          }
          title={t('wardrobe.list.method_import_title')}
          description={t('wardrobe.list.method_import_desc')}
          onPress={onImportFromWeb}
          testID="wardrobe-add-import"
          isLast
        />
      </View>
    </ContextualBottomSheet>
  );
};

const styles = StyleSheet.create({
  // Add-item bottom sheet body — ContextualBottomSheet provides the surface,
  // top radius, scrim, slide motion AND the safe-area bottom inset; this is
  // just the inner content padding.
  addSheetBody: {
    // Horizontal padding comes from the ContextualBottomSheet shell (16) so this
    // sheet's content lines up with every other sheet — no extra inset. (Was an
    // extra 24 here, giving a too-wide 40px gutter.)
    paddingTop: 8,
  },
  addSheetTitle: {
    ...theme.typography.aliases.poppinsSemiboldXsSm,
    color: theme.colors.uacTextBase,
  },
  addSheetSubtitle: {
    ...theme.typography.aliases.poppinsBodySm,
    color: theme.colors.uacTextBase,
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.m,
  },
});
