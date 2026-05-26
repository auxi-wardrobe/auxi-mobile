import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { theme } from '../../theme/theme';

type PrimaryVariant = 'default' | 'danger';

type SettingsDialogProps = {
  visible: boolean;
  onClose: () => void;
  isBusy: boolean;
  title: string;
  body?: string;
  primaryLabel: string;
  primaryVariant: PrimaryVariant;
  onPrimary: () => void;
  cancelTestID: string;
  primaryTestID: string;
  children?: React.ReactNode;
};

// Shared Modal scaffold for all three Settings dialogs (style-direction,
// change-time, delete-data). Structure: fade Modal → overlay Touchable
// (tap-to-close) → modalOverlay → inner Touchable (stop-propagation) →
// modalCard → title → optional body → children slot → actions row.
// The danger variant drives both the primary button color AND the title
// style (delete dialog title is 16/20 inter-semibold, not body-md-semibold).
export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  visible,
  onClose,
  isBusy,
  title,
  body,
  primaryLabel,
  primaryVariant,
  onPrimary,
  cancelTestID,
  primaryTestID,
  children,
}) => {
  const isDanger = primaryVariant === 'danger';

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              <Text style={isDanger ? styles.deleteModalTitle : styles.modalTitle}>{title}</Text>
              {body ? <Text style={styles.modalBody}>{body}</Text> : null}

              {children}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  testID={cancelTestID}
                  activeOpacity={0.82}
                  disabled={isBusy}
                  style={[
                    styles.modalAction,
                    styles.modalTextAction,
                    isBusy && styles.disabledAction,
                  ]}
                  onPress={onClose}
                >
                  <Text style={styles.modalTextActionLabel}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID={primaryTestID}
                  activeOpacity={0.82}
                  disabled={isBusy}
                  style={[
                    styles.modalAction,
                    isDanger ? styles.modalDangerAction : styles.modalPrimaryAction,
                    isBusy && styles.disabledAction,
                  ]}
                  onPress={onPrimary}
                >
                  <Text style={styles.modalPrimaryActionLabel}>{primaryLabel}</Text>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(25, 27, 34, 0.3)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  // modalCard + deleteModalCard were byte-identical per review — collapsed to one.
  modalCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.uacPanel,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  modalTitle: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
  },
  // Delete-data dialog title is 16/20 (line-height 20), not 24 (artifact §5).
  deleteModalTitle: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.uacTextBase,
  },
  modalBody: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
    marginTop: 16,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  modalAction: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTextAction: {
    borderRadius: theme.borderRadius.uacRadioPill,
  },
  modalPrimaryAction: {
    borderRadius: theme.borderRadius.uacButtonCta,
    backgroundColor: theme.colors.figmaButtonDark,
  },
  modalDangerAction: {
    borderRadius: theme.borderRadius.uacButtonCta,
    backgroundColor: theme.colors.figmaDestructive,
  },
  modalTextActionLabel: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.uacTextBase,
  },
  modalPrimaryActionLabel: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.white,
  },
  disabledAction: {
    opacity: 0.55,
  },
});
