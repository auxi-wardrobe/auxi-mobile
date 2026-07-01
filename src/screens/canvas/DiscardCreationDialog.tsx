/**
 * Discard-unsaved-creation confirmation — bottom sheet shown when the user
 * leaves the Outfit Canvas with unsaved changes.
 *
 * Rides the DS `MBottomSheet` shell (spring enter / fast exit, scrim, grab
 * handle, reduce-motion, safe-area) so it moves and reads like the app's other
 * design-system sheets (AddToScheduleSheet / ScheduleDatePickerSheet) rather
 * than a bespoke Modal stack. Two stacked actions:
 *
 *   Title : "Discard this creation?"
 *   Body  : "Your changes haven't been saved."
 *   CTA 1 : Save    — secondary (outlined); persists then proceeds with the exit.
 *   CTA 2 : Discard — danger (destructive); leaves without saving.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { MBottomSheet, MButton } from '../../components/design-system/lib';

type Props = {
  visible: boolean;
  isBusy?: boolean;
  /** Backdrop / hardware-back dismiss — stay on the canvas, no exit. */
  onCancel: () => void;
  /** Persist the creation, then continue leaving. */
  onSave: () => void;
  /** Leave without saving. */
  onDiscard: () => void;
};

export const DiscardCreationDialog: React.FC<Props> = ({
  visible,
  isBusy = false,
  onCancel,
  onSave,
  onDiscard,
}) => {
  const { t } = useTranslation();

  return (
    <MBottomSheet
      visible={visible}
      onDismiss={onCancel}
      testID="canvas-discard-dialog"
    >
      <Text style={styles.title}>{t('outfitCanvas.discard_title')}</Text>
      <Text style={styles.body}>{t('outfitCanvas.discard_body')}</Text>

      <View style={styles.actions}>
        {/* Save — secondary (outlined); persists then continues the exit. */}
        <MButton
          variant="secondary"
          disabled={isBusy}
          loading={isBusy}
          onPress={onSave}
          testID="canvas-discard-save"
          accessibilityLabel={t('outfitCanvas.discard_save')}
        >
          {t('outfitCanvas.discard_save')}
        </MButton>
        {/* Discard — danger (destructive); leaves without saving. */}
        <MButton
          variant="danger"
          disabled={isBusy}
          onPress={onDiscard}
          testID="canvas-discard-confirm"
          accessibilityLabel={t('outfitCanvas.discard_discard')}
        >
          {t('outfitCanvas.discard_discard')}
        </MButton>
      </View>
    </MBottomSheet>
  );
};

const styles = StyleSheet.create({
  title: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.figmaTextPrimary,
  },
  body: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    marginTop: theme.spacing.s,
  },
  // CTAs stacked full-width: the column stretches the MButtons to the sheet
  // width; gap holds the spacing (WardrobeWelcomeDialog pattern).
  actions: {
    marginTop: theme.spacing.l,
    gap: theme.spacing.s,
  },
});
