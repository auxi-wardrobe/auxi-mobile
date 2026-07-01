/**
 * Discard-unsaved-creation confirmation — a full-width contextual bottom sheet
 * shown when the user leaves the Outfit Canvas with unsaved changes.
 *
 * Shell (full-width panel + "Refine suggestions" reveal motion + scrim +
 * reduce-motion + safe-area) comes from ContextualBottomSheet; this file just
 * supplies the content: title/body over a single row of two full-width buttons
 * — a secondary "Save" (persist then leave) and a danger "Discard" (leave
 * without saving).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { MButton } from '../../components/design-system/lib';
import { ContextualBottomSheet } from '../../components/features/ContextualBottomSheet';

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
    <ContextualBottomSheet
      visible={visible}
      onDismiss={onCancel}
      testID="canvas-discard-dialog"
    >
      <Text style={styles.title}>{t('outfitCanvas.discard_title')}</Text>
      <Text style={styles.body}>{t('outfitCanvas.discard_body')}</Text>

      <View style={styles.actions}>
        {/* Save — secondary (outlined); persists then continues the exit. */}
        <View style={styles.actionCell}>
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
        </View>
        {/* Discard — danger (destructive); leaves without saving. */}
        <View style={styles.actionCell}>
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
      </View>
    </ContextualBottomSheet>
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
  actions: {
    marginTop: theme.spacing.m,
    flexDirection: 'row',
    gap: theme.spacing.uacDimension12,
  },
  actionCell: {
    flex: 1,
  },
});
