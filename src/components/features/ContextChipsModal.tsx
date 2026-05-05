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
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { Input } from '../atoms/Input';

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
        duration: 280,
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!shouldRender) {
      return;
    }

    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: 220,
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
            {chipOptions.map((chip) => {
              const selected = chip.id === selectedChipId;

              return (
                <TouchableOpacity
                  key={chip.id}
                  activeOpacity={0.82}
                  style={[styles.chip, selected && styles.selectedChip]}
                  disabled={isSubmitting}
                  onPress={() => onSelectChip(chip.id)}
                >
                  <Text style={[styles.chipText, selected && styles.selectedChipText]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              activeOpacity={0.82}
              style={[styles.chip, styles.shuffleChip]}
              disabled={isSubmitting}
              onPress={onShuffle}
            >
              <Icons.Sort width={24} height={24} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.82}
              style={[styles.chip, styles.editChip]}
              disabled={isSubmitting}
              onPress={onEdit}
            >
              <Text style={styles.chipText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {isEditing ? (
            <Input
              value={customContextText}
              onChangeText={onChangeText}
              placeholder="Tell us what you'd like to change"
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
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
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
                  OK
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
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
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
