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
 * Two rows ONLY (per design): Search database / Take photo. Uploads always run
 * the default remove-background processing; the AI studio-shot step moved
 * on-demand to Item Detail's Enhance flow, so the former upload-time
 * "Remove background / AI beautify" mode selector was removed.
 */
export const AddItemSheet: React.FC<AddItemSheetProps> = ({
  visible,
  onDismiss,
  onSearchDatabase,
  onTakePhoto,
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
    </ContextualBottomSheet>
  );
};

const styles = StyleSheet.create({
  // Add-item bottom sheet body — ContextualBottomSheet provides the surface,
  // top radius, scrim, slide motion AND the safe-area bottom inset; this is
  // just the inner content padding.
  addSheetBody: {
    paddingTop: 8,
    paddingHorizontal: 24,
  },
  addSheetTitle: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.figmaTextPrimary,
  },
  addSheetSubtitle: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.m,
  },
});
