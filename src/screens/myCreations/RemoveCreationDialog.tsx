/**
 * Remove-from-creations confirmation — bottom sheet.
 *
 * Rides the DS `MBottomSheet` shell so motion (spring enter / fast exit), the
 * scrim, grab handle, reduce-motion and safe-area all come from the design
 * system — matching the Schedule sheets (AddToScheduleSheet /
 * ScheduleDatePickerSheet) that sit on the very same pages, instead of a
 * bespoke Modal stack. Content is a destructive confirm: a danger "Yes" (trash
 * icon) over a secondary "Cancel".
 *
 *   Title : "Remove from your Creations"
 *   Body  : "Are you sure to remove this outfit from your creation list?"
 *   CTA 1 : Yes 🗑  — danger button (destructive)
 *   CTA 2 : Cancel  — secondary (outlined)
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { Icons } from '../../assets/icons';
import { MBottomSheet, MButton } from '../../components/design-system/lib';

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
    <MBottomSheet
      visible={visible}
      onDismiss={onCancel}
      testID="creation-remove-dialog"
    >
      <Text style={styles.title}>{t('myCreations.remove_title')}</Text>
      <Text style={styles.body}>{t('myCreations.remove_body')}</Text>

      <View style={styles.actions}>
        {/* Destructive confirm — danger button + trash icon. */}
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
        {/* Cancel — canonical secondary (outlined). */}
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
