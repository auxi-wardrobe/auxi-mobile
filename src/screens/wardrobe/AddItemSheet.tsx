import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ContextualBottomSheet } from '../../components/features/ContextualBottomSheet';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { track } from '../../services/analytics';
import { UploadMode } from './useAddWardrobeItem';
import { AddMethodRow } from './AddMethodRow';

interface AddItemSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onSearchDatabase: () => void;
  /** Called with the currently-selected processing mode when the user taps Take photo. */
  onTakePhoto: (mode: UploadMode) => void;
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
 */
export const AddItemSheet: React.FC<AddItemSheetProps> = ({
  visible,
  onDismiss,
  onSearchDatabase,
  onTakePhoto,
  onImportFromWeb,
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<UploadMode>('remove_bg');

  // ContextualBottomSheet keeps children mounted through its close animation, so
  // reset the mode when the sheet is dismissed — otherwise a beautify selection
  // that wasn't acted on would silently carry into the next open.
  useEffect(() => {
    if (!visible) {
      setMode('remove_bg');
    }
  }, [visible]);

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
          onPress={() => onTakePhoto(mode)}
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
        />

        {/* Processing-mode selector — radio-style rows that only apply to
            the Take photo path (database search ignores this setting). */}
        <Text style={styles.modeSectionLabel}>
          {t('wardrobe.list.add_mode_label')}
        </Text>
        <AddMethodRow
          testID="wardrobe-add-mode-remove_bg"
          title={t('wardrobe.list.mode_remove_bg_title')}
          description={t('wardrobe.list.mode_remove_bg_desc')}
          selected={mode === 'remove_bg'}
          onPress={() => setMode('remove_bg')}
        />
        <AddMethodRow
          testID="wardrobe-add-mode-beautify"
          title={t('wardrobe.list.mode_beautify_title')}
          description={t('wardrobe.list.mode_beautify_desc')}
          selected={mode === 'beautify'}
          onPress={() => {
            setMode('beautify');
            track('add_item_mode_selected', { mode: 'beautify' });
          }}
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
  // Small section label above the mode-selector rows.
  modeSectionLabel: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    marginTop: theme.spacing.m,
    marginBottom: theme.spacing.xs,
  },
});
