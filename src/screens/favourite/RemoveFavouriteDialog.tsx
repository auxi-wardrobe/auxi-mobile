/**
 * Remove-from-favourite confirmation — a full-width contextual bottom sheet.
 *
 * Shell (full-width panel + "Refine suggestions" reveal motion + scrim +
 * reduce-motion + safe-area) comes from ContextualBottomSheet; this file just
 * supplies the content: title/body over a single row of two full-width buttons
 * — a secondary "Cancel" and a danger "Yes" (trash icon). Same shape as
 * RemoveCreationDialog; only the copy and testIDs differ (favourite-remove-*,
 * preserved so Maestro flows keep working).
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

export const RemoveFavouriteDialog: React.FC<Props> = ({
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
      testID="favourite-remove-dialog"
    >
      <Text style={styles.title}>{t('favourite.remove_title')}</Text>
      <Text style={styles.body}>{t('favourite.remove_body')}</Text>

      <View style={styles.actions}>
        {/* Cancel — canonical secondary (outlined), on the LEFT. */}
        <View style={styles.actionCell}>
          <MButton
            variant="secondary"
            disabled={isBusy}
            onPress={onCancel}
            testID="favourite-remove-cancel"
            accessibilityLabel={t('favourite.remove_cancel')}
          >
            {t('favourite.remove_cancel')}
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
            testID="favourite-remove-confirm"
            accessibilityLabel={t('favourite.remove_confirm')}
          >
            {t('favourite.remove_confirm')}
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
    marginTop: theme.spacing.l,
    flexDirection: 'row',
    gap: theme.spacing.uacDimension12,
  },
  actionCell: {
    flex: 1,
  },
});
