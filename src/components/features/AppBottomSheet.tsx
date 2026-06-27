import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../theme/theme';
import { motion } from '../../theme/motion';
import { useBackgroundScale } from '../../context/BackgroundScaleContext';

// AppBottomSheet — the single, shared bottom-sheet shell. Encapsulates the same
// motion + behavior as the "Refine suggestions" sheet (ContextChipsModal) so
// every sheet that uses it is consistent:
//   • transparent RN Modal, animationType="none" (we drive the motion)
//   • slide up (enter) / down (exit) via motion tokens, with a `shouldRender`
//     lifecycle so the sheet animates OUT before it unmounts
//   • the background app scales down behind it (useBackgroundScale)
//   • rgba(0,0,0,0.45) scrim, tap-to-dismiss, bottom-anchored floating card
// Consumers render only their content as children.
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const SHEET_WIDTH = Math.min(screenWidth - 16, 414);

// Canonical bottom-sheet typography — one spec so every sheet's title/body
// reads identically. Plain objects (not StyleSheet.create) so consumers can
// spread them and add layout (margins) on top.
//   title — 14px SemiBold, text/primary
//   body  — 14px Regular,  text/secondary
export const sheetText = {
  title: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.figmaTextPrimary,
  },
  body: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
  },
} as const;

interface Props {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  /** Set false to block scrim / back-button dismissal (e.g. while submitting). */
  dismissable?: boolean;
  testID?: string;
}

export const AppBottomSheet: React.FC<Props> = ({
  visible,
  onDismiss,
  children,
  dismissable = true,
  testID,
}) => {
  const [shouldRender, setShouldRender] = useState(visible);
  const { pushSheet, popSheet } = useBackgroundScale();
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  // Scale the background app down while open (mirrors ContextChipsModal).
  useEffect(() => {
    if (!visible) {
      return;
    }
    pushSheet();
    return () => popSheet();
  }, [visible, pushSheet, popSheet]);

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
    }).start(() => setShouldRender(false));
  }, [shouldRender, slideAnim, visible]);

  if (!shouldRender) {
    return null;
  }

  const handleDismiss = dismissable ? onDismiss : undefined;

  return (
    <Modal
      transparent
      visible={shouldRender}
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={handleDismiss}
          testID={testID ? `${testID}-scrim` : undefined}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />
        <Animated.View
          testID={testID}
          style={[styles.card, { transform: [{ translateY: slideAnim }] }]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Dim tier — the RN <Modal> host carries the scrim (docs/Z_INDEX_LAYERING.md §1).
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  // Floating card — same spec as ContextChipsModal.card.
  card: {
    zIndex: theme.zIndex.modal,
    width: SHEET_WIDTH,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.figmaSurface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: theme.ds.color.shadow,
    shadowOffset: { width: 0, height: 19 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 16,
  },
});
