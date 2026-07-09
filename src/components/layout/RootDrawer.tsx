import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { theme } from '../../theme/theme';
import { motion } from '../../theme/motion';
import { useSidebar } from '../../context/SidebarContext';
import { SidebarMenu, SIDEBAR_WIDTH } from './SidebarMenu';

// RootDrawer — app-level push-drawer host. The menu is a `base`-tier back layer;
// the entire app content (the NavigationContainer) is the `content` tier and is
// PUSHED to the right to REVEAL the menu (it does NOT overlay it — there is no
// dim scrim, the content stays bright, per Figma 2852:26393 and
// docs/Z_INDEX_LAYERING.md §4.1: overlays live at one root host, not per screen).
// Push the content by the full menu width (the single shared SIDEBAR_WIDTH from
// SidebarMenu) so the menu is exactly revealed with no gap between the layers.
const PUSH_X = SIDEBAR_WIDTH;

export const RootDrawer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isOpen, close } = useSidebar();
  const progress = useRef(new Animated.Value(0)).current;
  // Extra drag offset for swipe-left-to-close gesture (clamp to <= 0, leftward only).
  const dragX = useRef(new Animated.Value(0)).current;
  // Drives borderRadius / shadow / the tap-to-close catcher, none of which can
  // run on the native driver alongside the translate. Stays true through the
  // close animation, then clears so the app is fully interactive when shut.
  const [revealed, setRevealed] = useState(false);
  // Track isOpen in a ref so the gesture can read it without stale closure.
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  useEffect(() => {
    if (isOpen) {
      setRevealed(true);
    }
    Animated.timing(progress, {
      toValue: isOpen ? 1 : 0,
      duration: isOpen ? motion.duration.medium : motion.duration.normal,
      easing: isOpen ? motion.easing.enter : motion.easing.exit,
      useNativeDriver: true,
    }).start();
    if (!isOpen) {
      // Reset drag offset when drawer closes.
      dragX.setValue(0);
      // Clear the revealed chrome (rounding + shadow + tap-catcher) after the
      // close completes. A timer is more reliable than the animation's
      // `finished` flag — an interrupted close left `revealed` stuck true,
      // which showed the back layer at the rounded corners and kept a catcher
      // over the content. The cleanup cancels it if we re-open mid-close.
      const timer = setTimeout(
        () => setRevealed(false),
        motion.duration.normal,
      );
      return () => clearTimeout(timer);
    }
  }, [isOpen, progress, dragX]);

  // Swipe-left-to-close pan gesture — only active when drawer is open.
  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      if (!isOpenRef.current) {
        return;
      }
      // Only allow leftward drag — clamp positive values to 0.
      dragX.setValue(Math.min(0, e.translationX));
    })
    .onEnd(e => {
      if (!isOpenRef.current) {
        return;
      }
      const shouldClose = e.velocityX < -500 || e.translationX < -60;
      if (shouldClose) {
        dragX.setValue(0);
        close();
      } else {
        // Spring back to open position.
        Animated.spring(dragX, {
          toValue: 0,
          stiffness: motion.spring.standard.stiffness,
          damping: motion.spring.standard.damping,
          useNativeDriver: true,
        }).start();
      }
    })
    .runOnJS(true);

  const translateX = Animated.add(
    progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, PUSH_X],
    }),
    dragX,
  );

  return (
    <View style={styles.root}>
      {/* Back layer (tier base) — the menu the content is pushed aside to reveal. */}
      <View style={styles.menuLayer}>
        <SidebarMenu />
      </View>

      {/* App content (tier content) — pushed right; rounded + shadowed when open. */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.content,
            revealed && styles.contentRevealed,
            { transform: [{ translateX }] },
          ]}
        >
          {children}
          {revealed ? (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={close}
              accessibilityLabel="Close menu"
              testID="drawer-close-catcher"
            />
          ) : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // Back layer matches the menu background so the surface revealed behind the
    // pushed content card (and at its rounded edges) is the same dark tone as
    // the menu, not a light seam.
    backgroundColor: theme.colors.uacBackgroundBase,
    zIndex: theme.zIndex.base,
  },
  menuLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: theme.zIndex.base,
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.background,
    zIndex: theme.zIndex.content,
  },
  // Open state: the pushed content reads as a raised, rounded card (no dim).
  contentRevealed: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: theme.colors.uacTextBase,
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
});
