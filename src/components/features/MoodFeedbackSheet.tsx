import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { motion } from '../../theme/motion';
import { useBackgroundScale } from '../../context/BackgroundScaleContext';
import { PillButton } from '../primitives/FigmaPrimitives';
import { MoodChipGrid } from './MoodChipGrid';
import { getMoodChipsForOccasion } from './mood-chips';

const { height: screenHeight } = Dimensions.get('window');
const OPEN_DURATION_MS = motion.duration.medium;
const CLOSE_DURATION_MS = motion.duration.normal;
const SNAP_BACK_DURATION_MS = motion.duration.fast;
const SWIPE_DISMISS_DISTANCE = 90;
const SWIPE_DISMISS_VELOCITY = 0.8;

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
 * AU-318 mood feedback bottom sheet — UI shell (Phase 3, no save wiring).
 * Modal/animation scaffolding cloned from ContextChipsModal; swipe-down
 * dismiss uses the house PanResponder approach (OutfitCanvasSurface).
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
  const [shouldRender, setShouldRender] = useState(visible);
  const { pushSheet, popSheet } = useBackgroundScale();
  useEffect(() => {
    if (!visible) {
      return;
    }
    pushSheet();
    return () => popSheet();
  }, [visible, pushSheet, popSheet]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  // Keep latest props fresh inside the PanResponder closure (created once).
  const isSubmittingRef = useRef(isSubmitting);
  isSubmittingRef.current = isSubmitting;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // Fresh selections on every open (ticket: dismiss + re-tap = fresh modal).
  useEffect(() => {
    if (visible) {
      setSelectedIds(new Set());
    }
  }, [visible]);

  // Open/close animation — cloned from ContextChipsModal.
  useEffect(() => {
    if (visible && !shouldRender) {
      setShouldRender(true);
      return;
    }

    if (visible) {
      slideAnim.setValue(screenHeight);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: OPEN_DURATION_MS,
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
      duration: CLOSE_DURATION_MS,
      easing: motion.easing.exit,
      useNativeDriver: true,
    }).start(() => {
      setShouldRender(false);
    });
  }, [shouldRender, slideAnim, visible]);

  const snapBack = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: SNAP_BACK_DURATION_MS,
      easing: motion.easing.enter,
      useNativeDriver: true,
    }).start();
  };

  // Swipe-down dismiss: sheet follows the finger; past the distance or
  // velocity threshold → onDismiss, otherwise snap back.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gs) =>
        !isSubmittingRef.current &&
        gs.dy > 12 &&
        Math.abs(gs.dy) > Math.abs(gs.dx) * 1.5,
      onPanResponderMove: (_evt, gs) => {
        if (gs.dy > 0) {
          slideAnim.setValue(gs.dy);
        }
      },
      onPanResponderRelease: (_evt, gs) => {
        if (gs.dy > SWIPE_DISMISS_DISTANCE || gs.vy > SWIPE_DISMISS_VELOCITY) {
          onDismissRef.current();
        } else {
          snapBack();
        }
      },
      onPanResponderTerminate: () => snapBack(),
    }),
  ).current;

  if (!shouldRender) {
    return null;
  }

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
    <Modal
      transparent
      visible={shouldRender}
      animationType="none"
      onRequestClose={isSubmitting ? undefined : onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable
          testID="mood-feedback-backdrop"
          accessibilityLabel={t('mood.dismiss')}
          style={StyleSheet.absoluteFillObject}
          onPress={isSubmitting ? undefined : onDismiss}
        />

        <Animated.View
          testID="mood-feedback-sheet"
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.dragHandle} />
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
            title={errorMessage ? t('mood.retry') : t('mood.done')}
            variant="filled"
            disabled={selectedIds.size === 0 || isSubmitting}
            loading={isSubmitting}
            onPress={() => onSubmit(Array.from(selectedIds))}
            style={styles.doneButton}
          />

          {/* Always-available explicit escape so the user is never trapped —
              critical in the save-failure state where "Done" only re-errors.
              Backdrop tap + swipe-down also dismiss (both already wired to
              onDismiss); this is the discoverable affordance. Hidden only while
              a submit is genuinely in flight. */}
          {!isSubmitting ? (
            <Pressable
              testID="mood-feedback-cancel"
              accessibilityRole="button"
              accessibilityLabel={t('mood.cancel')}
              onPress={onDismiss}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelLabel}>{t('mood.cancel')}</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Dim tier — RN <Modal> host carries the scrim (see docs/Z_INDEX_LAYERING.md §1).
  overlay: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.figmaOverlayScrim,
  },
  sheet: {
    // Modal tier — sheet sits above the dim/dismiss layer.
    zIndex: theme.zIndex.modal,
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: theme.colors.figmaSurface,
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.s,
    paddingBottom: theme.spacing.m,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 19 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 16,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.figmaDivider,
    marginBottom: theme.spacing.m,
  },
  title: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.figmaTextPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.s,
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
  cancelButton: {
    alignSelf: 'center',
    marginTop: theme.spacing.s,
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.l,
  },
  cancelLabel: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
});
