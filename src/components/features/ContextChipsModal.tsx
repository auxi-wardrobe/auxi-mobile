import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { motion } from '../../theme/motion';
import { Input } from '../atoms/Input';
import { track } from '../../services/analytics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(screenWidth - 16, 414);

export type ContextChipId =
  | 'more_relaxed'
  | 'different_vibe'
  | 'more_polished'
  | 'more_casual'
  | 'bolder_choice'
  | 'simpler_look';

export interface ContextChipOption {
  id: ContextChipId;
  label: string;
}

interface ContextChipsModalProps {
  visible: boolean;
  chipOptions: ContextChipOption[];
  selectedChipId: ContextChipId | null;
  isEditing: boolean;
  customContextText: string;
  isSubmitting: boolean;
  confirmDisabled: boolean;
  onSelectChip: (chipId: ContextChipId) => void;
  onShuffle: () => void;
  onEdit: () => void;
  onChangeText: (text: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ContextChipsModal: React.FC<ContextChipsModalProps> = ({
  visible,
  chipOptions,
  selectedChipId,
  isEditing,
  customContextText,
  isSubmitting,
  confirmDisabled,
  onSelectChip,
  onShuffle,
  onEdit,
  onChangeText,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [shouldRender, setShouldRender] = useState(visible);
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    if (visible && !shouldRender) {
      setShouldRender(true);
      return;
    }

    if (visible) {
      slideAnim.setValue(screenHeight);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: motion.duration.medium,
        easing: motion.easing.enter,
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!shouldRender) {
      return;
    }

    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: motion.duration.normal,
      easing: motion.easing.exit,
      useNativeDriver: true,
    }).start(() => {
      setShouldRender(false);
    });
  }, [shouldRender, slideAnim, visible]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={shouldRender}
      animationType="none"
      onRequestClose={isSubmitting ? undefined : onCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={isSubmitting ? undefined : onCancel}
        />

        <Animated.View
          testID="context-chips-modal-root"
          style={[
            styles.card,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.chipRow}>
            {chipOptions.map(chip => {
              const selected = chip.id === selectedChipId;

              return (
                <TouchableOpacity
                  key={chip.id}
                  testID={`context-chip-${chip.id}`}
                  activeOpacity={0.82}
                  style={[styles.chip, selected && styles.selectedChip]}
                  disabled={isSubmitting}
                  onPress={() => {
                    // Analytics §3.3 #27/#28 — refine_chip_selected /
                    // refine_chip_deselected. Tapping the currently selected
                    // chip deselects it (parent toggles); tapping a different
                    // chip selects it. We emit the event from the parent's
                    // perspective BEFORE the toggle is applied.
                    track(
                      selected
                        ? 'refine_chip_deselected'
                        : 'refine_chip_selected',
                      {
                        chip_type: 'style_feedback',
                        value: chip.id,
                      },
                    );
                    onSelectChip(chip.id);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected && styles.selectedChipText,
                    ]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              testID="context-chips-shuffle"
              accessibilityLabel={t('contextChips.a11y_shuffle')}
              accessibilityRole="button"
              activeOpacity={0.82}
              style={[styles.chip, styles.shuffleChip]}
              disabled={isSubmitting}
              onPress={onShuffle}
            >
              <Icons.Sort width={24} height={24} />
            </TouchableOpacity>

            <TouchableOpacity
              testID="context-chips-edit"
              activeOpacity={0.82}
              style={[styles.chip, styles.editChip]}
              disabled={isSubmitting}
              onPress={onEdit}
            >
              <Text style={styles.chipText}>{t('common.edit')}</Text>
            </TouchableOpacity>
          </View>

          {isEditing ? (
            <Input
              testID="context-chips-custom-input"
              value={customContextText}
              onChangeText={onChangeText}
              placeholder={t('contextChips.placeholder')}
              autoFocus
              editable={!isSubmitting}
              returnKeyType="done"
              style={styles.editInput}
            />
          ) : null}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              testID="context-chips-modal-close"
              activeOpacity={0.82}
              style={styles.cancelButton}
              disabled={isSubmitting}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="context-chips-confirm"
              activeOpacity={0.85}
              style={[
                styles.confirmButton,
                confirmDisabled && styles.confirmButtonDisabled,
              ]}
              disabled={confirmDisabled || isSubmitting}
              onPress={onConfirm}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <Text
                  style={[
                    styles.confirmText,
                    confirmDisabled && styles.confirmTextDisabled,
                  ]}
                >
                  {t('common.ok')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Dim tier — RN <Modal> host carries the scrim (see docs/Z_INDEX_LAYERING.md §1).
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    // Modal tier — content sits above the dim/dismiss layer.
    zIndex: theme.zIndex.modal,
    width: MODAL_WIDTH,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.figmaSurface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 19 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    minHeight: 48,
    minWidth: 64,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: theme.colors.figmaIconSurface,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedChip: {
    borderColor: theme.colors.figmaAction,
  },
  shuffleChip: {
    width: 70,
    paddingHorizontal: 0,
  },
  editChip: {
    paddingHorizontal: 20,
  },
  chipText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaAction,
  },
  selectedChipText: {
    color: theme.colors.figmaAction,
  },
  editInput: {
    marginTop: 12,
    marginBottom: 0,
    alignSelf: 'stretch',
  },
  actionsRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  cancelText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaRed,
  },
  confirmButton: {
    minWidth: 124,
    height: 56,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.figmaAction,
  },
  confirmButtonDisabled: {
    backgroundColor: '#EEF1F6',
    borderWidth: 1,
    borderColor: theme.colors.figmaDivider,
  },
  confirmText: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.white,
  },
  confirmTextDisabled: {
    color: '#B4BBC6',
  },
});
