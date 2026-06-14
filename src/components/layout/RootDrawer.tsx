import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../theme/theme';
import { motion } from '../../theme/motion';
import { useSidebar } from '../../context/SidebarContext';
import { SidebarMenu } from './SidebarMenu';

// RootDrawer — app-level push-drawer host. The menu is a `base`-tier back layer;
// the entire app content (the NavigationContainer) is the `content` tier and is
// PUSHED to the right to REVEAL the menu (it does NOT overlay it — there is no
// dim scrim, the content stays bright, per Figma 2852:26393 and
// docs/Z_INDEX_LAYERING.md §4.1: overlays live at one root host, not per screen).
const { width: SCREEN_W } = Dimensions.get('window');
const SIDEBAR_WIDTH = 317;
// Push far enough to reveal the menu while leaving a tappable peek of content.
const PUSH_X = Math.min(SIDEBAR_WIDTH, SCREEN_W - 88);

export const RootDrawer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isOpen, close } = useSidebar();
  const progress = useRef(new Animated.Value(0)).current;
  // Drives borderRadius / shadow / the tap-to-close catcher, none of which can
  // run on the native driver alongside the translate. Stays true through the
  // close animation, then clears so the app is fully interactive when shut.
  const [revealed, setRevealed] = useState(false);

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
  }, [isOpen, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PUSH_X],
  });

  return (
    <View style={styles.root}>
      {/* Back layer (tier base) — the menu the content is pushed aside to reveal. */}
      <View style={styles.menuLayer}>
        <SidebarMenu />
      </View>

      {/* App content (tier content) — pushed right; rounded + shadowed when open. */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // Light base = the app surface (Figma 3438:22389 is all-light). The dark
    // menu paints its own background when revealed, so the back layer must NOT
    // be dark — a dark base bled through at the content's rounded edges.
    backgroundColor: theme.colors.background,
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
