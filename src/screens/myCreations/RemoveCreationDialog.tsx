/**
 * Remove-from-creations confirmation — a full-width contextual bottom sheet.
 *
 * Shell (full-width panel + "Refine suggestions" reveal motion + scrim +
 * reduce-motion + safe-area) comes from ContextualBottomSheet; this file just
 * supplies the content: title/body over a single row of two full-width buttons
 * — a secondary "Cancel" and a danger "Yes" (trash icon).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { Icons } from '../../assets/icons';
import { MButton } from '../../components/design-system/lib';
import { ContextualBottomSheet } from '../../components/features/ContextualBottomSheet';

type Props = {
  visible: boolean;
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const RemoveCreationDialog: React.FC<Props> = ({
  visible,
  isBusy,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();

  return (
    <ContextualBottomSheet
      visible={visible}
      onDismiss={onCancel}
      testID="creation-remove-dialog"
    >
      <Text style={styles.title}>{t('myCreations.remove_title')}</Text>
      <Text style={styles.body}>{t('myCreations.remove_body')}</Text>

      <View style={styles.actions}>
        {/* Cancel — canonical secondary (outlined), on the LEFT. */}
        <View style={styles.actionCell}>
          <MButton
            variant="secondary"
            disabled={isBusy}
            onPress={onCancel}
            testID="creation-remove-cancel"
            accessibilityLabel={t('myCreations.remove_cancel')}
          >
            {t('myCreations.remove_cancel')}
          </MButton>
        </View>
        {/* Destructive confirm — danger button + trash icon, on the RIGHT. */}
        <View style={styles.actionCell}>
          <MButton
            variant="danger"
            rightIcon={Icons.Trash}
            disabled={isBusy}
            loading={isBusy}
            onPress={onConfirm}
            testID="creation-remove-confirm"
            accessibilityLabel={t('myCreations.remove_confirm')}
          >
            {t('myCreations.remove_confirm')}
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
  // Two full-width buttons side by side (each cell flexes to half the row).
  actions: {
    marginTop: theme.spacing.l,
    flexDirection: 'row',
    gap: theme.spacing.uacDimension12,
  },
  actionCell: {
    flex: 1,
  },
});
