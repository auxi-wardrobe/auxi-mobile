/**
 * MToastHost — the single imperative-toast host. Mount ONCE near app root
 * (replaces `<Toast />`); subscribes to `m-toast-service` and renders the
 * active toast on-system: dark surface (mirrors MSnackbar), tone accent,
 * enter/exit motion (theme/motion.ts, honors reduce-motion), auto-dismiss,
 * tap-to-act + swipe/tap-to-dismiss, safe-area inset.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { motion, useReducedMotion } from '../../../theme/motion';
import { color, radius, role, shadow, space, type } from '../m-tokens';
import {
  ActiveToast,
  subscribeToast,
  toast,
  ToastTone,
} from './m-toast-service';

// Tone → left-accent color. info stays neutral (no strong accent) per spec.
const TONE_ACCENT: Record<ToastTone, string> = {
  success: color.su200,
  error: role.danger, // brand destructive #bb251a (color-rules.md), not palette da300
  info: color.n500,
};

// Swipe distance (px) past which a drag dismisses the toast (on-system: the
// motion `lg` travel token).
const SWIPE_DISMISS_THRESHOLD = motion.distance.lg;
// Min vertical drag (px) before the pan responder claims the gesture — small
// enough to feel responsive, large enough not to hijack a tap.
const PAN_ACTIVATION_DY = 6;

export const MToastHost: React.FC = () => {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  // `active` = service state; `rendered` = what's on screen (kept through the
  // exit animation so the toast can animate out before unmounting).
  const [active, setActive] = useState<ActiveToast | null>(null);
  const [rendered, setRendered] = useState<ActiveToast | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => subscribeToast(setActive), []);

  // Enter / exit. New toast → render + animate in. Cleared → animate out, then
  // drop from the tree.
  useEffect(() => {
    if (active) {
      setRendered(active);
      // Enter = open: `medium` (350) + decelerating `enter` easing — the house
      // open/close asymmetry (motion-rules.md §2, toast-in row).
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.duration.medium,
        easing: reduce ? undefined : motion.easing.enter,
        useNativeDriver: true,
      }).start();
    } else {
      // Exit = close: `normal` (250) + accelerating `exit` easing.
      Animated.timing(progress, {
        toValue: 0,
        duration: motion.duration.normal,
        easing: reduce ? undefined : motion.easing.exit,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setRendered(null);
      });
    }
  }, [active, progress, reduce]);

  // Auto-dismiss timer, restarted whenever a new toast becomes active.
  useEffect(() => {
    if (!active) return;
    const id = active.id;
    const timer = setTimeout(() => toast.hide(id), active.visibilityTime);
    return () => clearTimeout(timer);
  }, [active]);

  const dismiss = () => rendered && toast.hide(rendered.id);
  const handlePress = () => {
    rendered?.onPress?.();
    dismiss();
  };

  // Vertical swipe (toward the screen edge the toast hugs) dismisses it.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dy) > PAN_ACTIVATION_DY,
      onPanResponderRelease: (_e, g) => {
        const toEdge = rendered?.position === 'top' ? -g.dy : g.dy;
        if (toEdge > SWIPE_DISMISS_THRESHOLD) dismiss();
      },
    }),
  ).current;

  if (!rendered) return null;

  const bottom = rendered.position !== 'top';
  const fromY = (bottom ? 1 : -1) * motion.distance.sm;
  const translateY = reduce
    ? 0
    : progress.interpolate({ inputRange: [0, 1], outputRange: [fromY, 0] });
  const scale = reduce
    ? 1
    : progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  const testID = rendered.testID;
  // Variable (not an inline literal) so it hugs the safe-area edge without
  // tripping react-native/no-inline-styles.
  const insetPad = bottom
    ? { paddingBottom: insets.bottom + space.s4 }
    : { paddingTop: insets.top + space.s4 };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, bottom ? styles.bottom : styles.top, insetPad]}
    >
      <Animated.View
        {...pan.panHandlers}
        testID={testID}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[
          styles.cardShadow,
          { opacity: progress, transform: [{ translateY }, { scale }] },
        ]}
      >
        <Pressable
          onPress={handlePress}
          testID={testID ? `${testID}-action` : undefined}
          // Only announce "button" when the toast actually does something on tap
          // — a non-actionable toast must not read as a button (a11y).
          accessibilityRole={rendered.onPress ? 'button' : undefined}
          accessibilityLabel={rendered.text1}
          accessibilityHint={
            rendered.onPress ? rendered.accessibilityHint : undefined
          }
          style={styles.card}
        >
          <View
            style={[styles.accent, { backgroundColor: TONE_ACCENT[rendered.type] }]}
          />
          <View style={styles.textCol}>
            <Text style={styles.title} numberOfLines={2}>
              {rendered.text1}
            </Text>
            {!!rendered.text2 && (
              <Text style={styles.body} numberOfLines={3}>
                {rendered.text2}
              </Text>
            )}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    paddingHorizontal: space.s4,
  },
  bottom: { justifyContent: 'flex-end' },
  top: { justifyContent: 'flex-start' },
  cardShadow: {
    borderRadius: radius.md,
    ...shadow.raised,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.n800,
    borderRadius: radius.md,
    overflow: 'hidden',
    minWidth: 300,
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: 16,
  },
  // 3px tone bar pinned to the left edge (clipped by the card's rounded corners).
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  textCol: { flex: 1 },
  title: {
    ...type.bodySm,
    fontFamily: type.h3.fontFamily,
    color: color.p50,
  },
  body: {
    ...type.bodySm,
    color: color.p50,
    opacity: 0.72,
    marginTop: 2,
  },
});
