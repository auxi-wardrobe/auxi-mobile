/**
 * Remove-from-favourite confirmation dialog (Figma node 3539:23335).
 *
 * Dedicated to the Favourite screen because its button layout diverges from the
 * shared `SettingsDialog` (which keeps Cancel-left / primary-right): Figma wants
 * the destructive action on the LEFT —
 *   "Yes 🗑"  → red-text ghost button + trash icon (no border/fill)
 *   "Cancel"  → outlined secondary button (1.5px neutral border)
 *
 * Red comes from the `figmaItemDetailDanger` token (icon/danger/base #c0392b),
 * never a literal. testIDs match the prior SettingsDialog wiring so Maestro
 * flows keep working (favourite-remove-confirm / favourite-remove-cancel).
 */
import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { Icons } from '../../assets/icons';

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
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card} testID="favourite-remove-dialog">
              <Text style={styles.title}>{t('favourite.remove_title')}</Text>
              <Text style={styles.body}>{t('favourite.remove_body')}</Text>

              <View style={styles.actions}>
                {/* Destructive "Yes" on the LEFT — red-text ghost + trash icon. */}
                <TouchableOpacity
                  testID="favourite-remove-confirm"
                  accessibilityRole="button"
                  accessibilityLabel={t('favourite.remove_confirm')}
                  activeOpacity={0.82}
                  disabled={isBusy}
                  style={[
                    styles.action,
                    styles.ghostAction,
                    isBusy && styles.disabledAction,
                  ]}
                  onPress={onConfirm}
                >
                  <Text style={styles.dangerLabel}>
                    {t('favourite.remove_confirm')}
                  </Text>
                  <Icons.Trash
                    width={24}
                    height={24}
                    color={theme.colors.figmaItemDetailDanger}
                  />
                </TouchableOpacity>

                {/* "Cancel" on the RIGHT — outlined secondary. */}
                <TouchableOpacity
                  testID="favourite-remove-cancel"
                  accessibilityRole="button"
                  accessibilityLabel={t('favourite.cancel')}
                  activeOpacity={0.82}
                  disabled={isBusy}
                  style={[
                    styles.action,
                    styles.outlinedAction,
                    isBusy && styles.disabledAction,
                  ]}
                  onPress={onCancel}
                >
                  <Text style={styles.cancelLabel}>
                    {t('favourite.cancel')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.figmaOverlayScrim,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.l,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.uacPanel,
    padding: theme.spacing.l,
  },
  title: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.uacTextBase,
  },
  body: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
    marginTop: theme.spacing.m,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension12,
    marginTop: theme.spacing.uacDimension12,
  },
  action: {
    flex: 1,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  // "Yes" ghost: no border/fill, container invisible until interacted (Figma
  // Text-button spec) — rounded so the press ripple/highlight stays pill-shaped.
  ghostAction: {
    borderRadius: theme.borderRadius.round,
  },
  // "Cancel" outlined secondary: 1.5px neutral border, 16 radius.
  outlinedAction: {
    borderWidth: 1.5,
    borderColor: theme.colors.uacTextBase,
    borderRadius: theme.borderRadius.uacButtonCta,
  },
  dangerLabel: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.figmaItemDetailDanger,
  },
  cancelLabel: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.uacTextBase,
  },
  disabledAction: {
    opacity: 0.55,
  },
});
