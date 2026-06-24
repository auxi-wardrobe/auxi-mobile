import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import { useBackgroundScale } from '../../context/BackgroundScaleContext';
import { MBottomSheet } from '../design-system/lib';
import { Input } from '../atoms/Input';
import { track } from '../../services/analytics';

export type ContextChipId =
  | 'more_casual'
  | 'more_minimalist'
  | 'more_colorful'
  | 'more_formal'
  | 'weather_warm'
  | 'weather_cold'
  // Legacy ids — kept so older references still type-check.
  | 'more_relaxed'
  | 'different_vibe'
  | 'more_polished'
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
  // Optional copy override (the progressive-refinement gate uses preference
  // wording instead of the default "Refine suggestions"). Falls back to the
  // contextChips.* translations when omitted.
  title?: string;
  subtitle?: string;
  // When provided, a "Skip for now" affordance is shown. Used by the
  // after-6-outfits refinement gate so the user can defer feedback and get the
  // next batch instead.
  onSkip?: () => void;
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
  title,
  subtitle,
  onSkip,
}) => {
  const { t } = useTranslation();
  const { pushSheet, popSheet } = useBackgroundScale();
  useEffect(() => {
    if (!visible) {
      return;
    }
    pushSheet();
    return () => popSheet();
  }, [visible, pushSheet, popSheet]);

  // Dismiss routes through Skip when offered, else Cancel; suppressed while
  // submitting (mirrors the prior backdrop / onRequestClose guards).
  const handleDismiss = isSubmitting ? () => {} : onSkip ?? onCancel;

  return (
    <MBottomSheet
      visible={visible}
      onDismiss={handleDismiss}
      testID="context-chips-modal-root"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {title ?? t('contextChips.title')}
            </Text>
            <Text style={styles.subtitle}>
              {subtitle ?? t('contextChips.subtitle')}
            </Text>
          </View>
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
              testID={onSkip ? 'context-chips-skip' : 'context-chips-modal-close'}
              activeOpacity={0.82}
              style={styles.cancelButton}
              disabled={isSubmitting}
              onPress={onSkip ?? onCancel}
            >
              <Text style={styles.cancelText}>
                {onSkip ? t('contextChips.skip') : t('common.cancel')}
              </Text>
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
        </View>
      </KeyboardAvoidingView>
    </MBottomSheet>
  );
};

const styles = StyleSheet.create({
  // Inner content padding (MBottomSheet owns the surface, top radius, grab
  // handle, scrim and motion).
  card: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  header: {
    marginBottom: theme.spacing.m,
  },
  title: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
  },
  subtitle: {
    ...theme.typography.aliases.poppinsBodySm,
    color: theme.colors.figmaTextSecondary,
    marginTop: theme.spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    minHeight: 44, // chip size M
    minWidth: 64,
    borderRadius: theme.borderRadius.round,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: theme.colors.figmaInsightPillBg,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedChip: {
    backgroundColor: theme.colors.figmaChipBg,
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
    color: theme.colors.figmaText,
  },
  selectedChipText: {
    color: theme.colors.white,
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
