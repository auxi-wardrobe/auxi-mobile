import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme/theme';
import { motion } from '../../theme/motion';

const { height: screenHeight } = Dimensions.get('window');
// Motion mirrors the mood feedback sheet (MoodFeedbackSheet) so every bottom
// sheet shares one entrance/exit "feel": slide up on open, slide down on close,
// swipe-to-dismiss with a snap-back. Timings/easings come from the motion
// tokens — do NOT hardcode here.
const OPEN_DURATION_MS = motion.duration.medium;
const CLOSE_DURATION_MS = motion.duration.normal;
const SNAP_BACK_DURATION_MS = motion.duration.fast;
const SWIPE_DISMISS_DISTANCE = 90;
const SWIPE_DISMISS_VELOCITY = 0.8;

interface AnimatedBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  /** Lock backdrop tap + swipe dismissal (e.g. while a save is in flight). */
  dismissDisabled?: boolean;
  /** a11y label read on the dim/backdrop dismiss target. */
  backdropAccessibilityLabel?: string;
  /** testID for the sheet surface (Maestro). */
  testID?: string;
  /** testID for the dim/backdrop dismiss target (Maestro). */
  backdropTestID?: string;
  /** Per-instance surface overrides (padding, max width, …). */
  sheetStyle?: ViewStyle;
}

/**
 * Bottom-anchored sheet with the house entrance motion (cloned from
 * MoodFeedbackSheet): a RN <Modal> hosts the scrim, an Animated translateY
 * slides the surface up from off-screen, and a PanResponder lets the user
 * swipe it down to dismiss. `animationType="none"` on the Modal hands all
 * motion to the Animated value so it matches the mood sheet exactly.
 */
export const AnimatedBottomSheet: React.FC<AnimatedBottomSheetProps> = ({
  visible,
  onDismiss,
  children,
  dismissDisabled = false,
  backdropAccessibilityLabel,
  testID,
  backdropTestID,
  sheetStyle,
}) => {
  const [shouldRender, setShouldRender] = useState(visible);
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  // Keep latest props fresh inside the PanResponder closure (created once).
  const dismissDisabledRef = useRef(dismissDisabled);
  dismissDisabledRef.current = dismissDisabled;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // Open/close animation — cloned from MoodFeedbackSheet.
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
        !dismissDisabledRef.current &&
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

  return (
    <Modal
      transparent
      visible={shouldRender}
      animationType="none"
      onRequestClose={dismissDisabled ? undefined : onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable
          testID={backdropTestID}
          accessibilityLabel={backdropAccessibilityLabel}
          style={StyleSheet.absoluteFillObject}
          onPress={dismissDisabled ? undefined : onDismiss}
        />

        <Animated.View
          testID={testID}
          style={[
            styles.sheet,
            sheetStyle,
            { transform: [{ translateY: slideAnim }] },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.dragHandle} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Dim tier — RN <Modal> host carries the scrim (see docs/Z_INDEX_LAYERING.md §1).
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.figmaOverlayScrim,
  },
  sheet: {
    // Modal tier — sheet sits above the dim/dismiss layer.
    zIndex: theme.zIndex.modal,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: theme.colors.figmaSurface,
    paddingTop: theme.spacing.s,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.figmaDivider,
    marginBottom: theme.spacing.m,
  },
});
