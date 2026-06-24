import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { useBackgroundScale } from '../../context/BackgroundScaleContext';
import { MBottomSheet } from '../design-system/lib';
import { PillButton } from '../primitives/FigmaPrimitives';
import { MoodChipGrid } from './MoodChipGrid';
import { getMoodChipsForOccasion } from './mood-chips';

interface MoodFeedbackSheetProps {
  visible: boolean;
  /** `outfit_context.occasion` — picks the contextual chip set. */
  occasion?: string;
  isSubmitting: boolean;
  errorMessage?: string;
  onSubmit: (moodIds: string[]) => void;
  onDismiss: () => void;
  /** Phase 4 hooks analytics into chip toggles. */
  onChipToggle?: (id: string, selected: boolean) => void;
}

/**
 * AU-318 mood feedback bottom sheet.
 *
 * GH-364 Wave 1.5: migrated onto the design-system MBottomSheet primitive — it
 * owns the scrim, surface, grab handle, slide-up/down + reduce-motion, the
 * RN-Modal portal, AND the swipe-down-to-dismiss gesture (gated to the handle,
 * via the new `swipeToDismiss` prop; disabled while submitting). The dismiss
 * backdrop keeps its `mood-feedback-backdrop` testID via `backdropTestID`
 * (Maestro `maestro/flows/home/mood-feedback.yaml:161`). Submit-lock is upheld
 * by the hook's `onDismiss` (no-op while submitting) plus the disabled gesture.
 * Background-scale push/pop is kept here (the primitive doesn't own it).
 */
export const MoodFeedbackSheet: React.FC<MoodFeedbackSheetProps> = ({
  visible,
  occasion,
  isSubmitting,
  errorMessage,
  onSubmit,
  onDismiss,
  onChipToggle,
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fresh selections on every open (ticket: dismiss + re-tap = fresh modal).
  useEffect(() => {
    if (visible) {
      setSelectedIds(new Set());
    }
  }, [visible]);

  const handleToggle = (id: string) => {
    const selected = !selectedIds.has(id);
    const next = new Set(selectedIds);
    if (selected) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedIds(next);
    onChipToggle?.(id, selected);
  };

  return (
    <MBottomSheet
      visible={visible}
      onDismiss={onDismiss}
      backdropTestID="mood-feedback-backdrop"
      swipeToDismiss={!isSubmitting}
    >
      <View testID="mood-feedback-sheet" style={styles.body}>
        <Text style={styles.title}>{t('mood.title')}</Text>
        <Text style={styles.subtitle}>{t('mood.subtitle')}</Text>

        <MoodChipGrid
          chips={getMoodChipsForOccasion(occasion)}
          selectedIds={selectedIds}
          disabled={isSubmitting}
          onToggle={handleToggle}
        />

        {errorMessage ? (
          <Text testID="mood-feedback-error" style={styles.errorText}>
            {errorMessage}
          </Text>
        ) : null}

        <PillButton
          testID="mood-feedback-done"
          title={t('mood.done')}
          variant="filled"
          disabled={selectedIds.size === 0 || isSubmitting}
          loading={isSubmitting}
          onPress={() => onSubmit(Array.from(selectedIds))}
          style={styles.doneButton}
        />
      </View>
    </MBottomSheet>
  );
};

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.m,
  },
  title: {
    ...theme.typography.aliases.playfairDisplaySection,
    color: theme.colors.figmaTextPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.m,
  },
  errorText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaRed,
    textAlign: 'center',
    marginTop: theme.spacing.m,
  },
  doneButton: {
    alignSelf: 'stretch',
    marginTop: theme.spacing.m,
  },
});
