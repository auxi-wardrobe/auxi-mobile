import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { motion, useReducedMotion } from '../../theme/motion';
import { useBackgroundScale } from '../../context/BackgroundScaleContext';
import { TopIconButton } from '../primitives/FigmaPrimitives';
import { Icons } from '../../assets/icons';
import { FeedbackForm } from './FeedbackForm';

const { height: screenHeight } = Dimensions.get('window');
const OPEN_DURATION_MS = motion.duration.medium;
const CLOSE_DURATION_MS = motion.duration.normal;

interface FeedbackSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Feedback bottom sheet — Modal + slide-up Animated.View cloned from the house
 * pattern (TemperatureOverrideSheet / ContextChipsModal; NOT
 * @gorhom/bottom-sheet). Wraps the shared FeedbackForm so the chat-button FAB on
 * Home can surface feedback as a sheet instead of a pushed screen. Closes itself
 * on a successful submit (FeedbackForm.onSubmitted).
 */
export const FeedbackSheet: React.FC<FeedbackSheetProps> = ({
  visible,
  onClose,
}) => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [shouldRender, setShouldRender] = useState(visible);
  const { pushSheet, popSheet } = useBackgroundScale();
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }
    pushSheet();
    return () => popSheet();
  }, [visible, pushSheet, popSheet]);

  // Open/close animation with open/close duration asymmetry. Reduce-motion
  // skips the slide entirely (instant snap) per the motion spec fallback.
  useEffect(() => {
    if (visible && !shouldRender) {
      setShouldRender(true);
      return;
    }
    if (visible) {
      if (reduceMotion) {
        slideAnim.setValue(0);
        return;
      }
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
    if (reduceMotion) {
      setShouldRender(false);
      return;
    }
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: CLOSE_DURATION_MS,
      easing: motion.easing.exit,
      useNativeDriver: true,
    }).start(() => setShouldRender(false));
  }, [shouldRender, slideAnim, visible, reduceMotion]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={shouldRender}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          testID="feedback-sheet-backdrop"
          accessibilityLabel={t('common.close')}
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
        />

        <Animated.View
          testID="feedback-sheet-root"
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* Header — title left, close button anchored top-right. */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('feedback.title')}</Text>
            <TopIconButton
              testID="feedback-sheet-close"
              accessibilityLabel={t('common.close')}
              icon={<Icons.Close width={24} height={24} />}
              onPress={onClose}
            />
          </View>

          <FeedbackForm onSubmitted={onClose} />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Dim tier — RN <Modal> host carries the scrim (docs/Z_INDEX_LAYERING.md §1).
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.figmaOverlayScrim,
  },
  sheet: {
    // Modal tier — sheet sits above the dim/dismiss layer.
    zIndex: theme.zIndex.modal,
    maxHeight: screenHeight * 0.9,
    borderTopLeftRadius: theme.borderRadius.l,
    borderTopRightRadius: theme.borderRadius.l,
    backgroundColor: theme.colors.figmaSurface,
    paddingTop: theme.spacing.s,
    paddingBottom: theme.spacing.l,
    ...theme.ds.shadow.sheet,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: theme.spacing.l,
    paddingRight: theme.spacing.s,
    paddingBottom: theme.spacing.xs,
  },
  title: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaTextDark,
  },
});
