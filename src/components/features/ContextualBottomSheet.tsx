/**
 * ContextualBottomSheet — the app's full-width bottom-sheet shell.
 *
 * One source of truth for the "contextual bottom sheet" look + motion used by
 * the confirm sheets (Discard / Remove-creation / Remove-favourite) and the
 * Add-to-Schedule sheets (source picker + date picker):
 *
 *   - Full-width panel pinned to the bottom, top corners rounded only, white
 *     surface, home-indicator safe-area inset.
 *   - Motion follows the "Refine suggestions" sheet: a transparent Modal
 *     slide-up while the page behind scales down / lifts via `useBackgroundScale`
 *     (Macgie Motion "04. Contextual Bottom Sheet Reveal"). Open/close asymmetry
 *     (enter slower + eased-in, exit faster). Instant under OS "Reduce Motion".
 *
 * API mirrors the DS MBottomSheet (`visible` / `onDismiss` / children / testID)
 * so callers read the same; the difference is edge-to-edge width + the
 * background-scale reveal instead of a floating card + spring.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme/theme';
import { motion, useReducedMotion } from '../../theme/motion';
import { useBackgroundScale } from '../../context/BackgroundScaleContext';

const { height: screenHeight } = Dimensions.get('window');

export interface ContextualBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  children?: React.ReactNode;
  testID?: string;
}

export const ContextualBottomSheet: React.FC<ContextualBottomSheetProps> = ({
  visible,
  onDismiss,
  children,
  testID,
}) => {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  // Page-behind scale-down / lift — the "Refine suggestions" reveal motion.
  const { pushSheet, popSheet } = useBackgroundScale();
  useEffect(() => {
    if (!visible) {
      return;
    }
    pushSheet();
    return () => popSheet();
  }, [visible, pushSheet, popSheet]);

  // 0 = hidden (sheet below screen / scrim transparent), 1 = shown.
  const progress = useRef(new Animated.Value(0)).current;
  // Keep the Modal mounted through the exit so the slide-down plays.
  const [mounted, setMounted] = useState(visible);
  // Extra drag offset for swipe-to-dismiss gesture (clamp to >= 0, downward only).
  const dragY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }
    if (reduced) {
      progress.setValue(visible ? 1 : 0);
      if (!visible) {
        setMounted(false);
      }
      return;
    }
    // Open/close asymmetry (motion-rules): enter slower + eased-in, exit faster.
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? motion.duration.medium : motion.duration.normal,
      easing: visible ? motion.easing.enter : motion.easing.exit,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) {
        setMounted(false);
      }
    });
  }, [visible, reduced, progress]);

  // Swipe-down-to-dismiss pan gesture.
  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      // Only allow downward drag — clamp negative values to 0.
      dragY.setValue(Math.max(0, e.translationY));
    })
    .onEnd(e => {
      const shouldDismiss = e.velocityY > 500 || e.translationY > 80;
      if (shouldDismiss) {
        dragY.setValue(0);
        onDismiss();
      } else if (reduced) {
        // Skip spring animation under reduce-motion.
        dragY.setValue(0);
      } else {
        // Spring back to resting position.
        Animated.spring(dragY, {
          toValue: 0,
          stiffness: motion.spring.standard.stiffness,
          damping: motion.spring.standard.damping,
          useNativeDriver: true,
        }).start();
      }
    })
    .runOnJS(true);

  if (!mounted) {
    return null;
  }

  const scrimStyle = {
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
  };
  const sheetTranslateY = Animated.add(
    progress.interpolate({
      inputRange: [0, 1],
      outputRange: [screenHeight, 0],
    }),
    dragY,
  );

  return (
    <Modal
      transparent
      animationType="none"
      visible={mounted}
      onRequestClose={onDismiss}
    >
      <View style={styles.root}>
        <TouchableWithoutFeedback
          onPress={onDismiss}
          testID={testID ? `${testID}-backdrop` : undefined}
        >
          <Animated.View style={[styles.scrim, scrimStyle]} />
        </TouchableWithoutFeedback>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom + theme.spacing.l },
              { transform: [{ translateY: sheetTranslateY }] },
            ]}
            testID={testID}
          >
            {children}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.figmaOverlayScrim,
  },
  // Full-width sheet pinned to the bottom, top corners rounded only.
  sheet: {
    width: '100%',
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.uacPanel,
    borderTopRightRadius: theme.borderRadius.uacPanel,
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.l,
  },
});
