/**
 * Design System — Snackbar + Toast (NEW showcase, live motion).
 * Reveal = opacity + scale(.9→1) ~200ms (useToggleValue); toast spinner =
 * continuous 360° (SpinLoader). Tap the trigger pill to replay the reveal.
 */
import React, { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, role, shadow, space, type } from './ds-tokens';
import { SpinLoader, useToggleValue } from './DsMotion';

export const DsSnackbar: React.FC<{ mint?: boolean }> = ({ mint }) => {
  const [shown, setShown] = useState(true);
  const v = useToggleValue(shown, 200);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  return (
    <View style={styles.liveWrap}>
      <Pressable
        style={styles.trigger}
        onPress={() => setShown(s => !s)}
        testID={mint ? 'ds-snackbar-mint-toggle' : 'ds-snackbar-toggle'}
        accessibilityRole="button"
        accessibilityLabel="Replay snackbar"
      >
        <Text style={styles.triggerText}>{shown ? 'Hide' : 'Show'} snackbar</Text>
      </Pressable>
      <Animated.View
        style={[
          styles.snackbar,
          mint && styles.snackbarMint,
          { opacity: v, transform: [{ scale }] },
        ]}
        testID={mint ? 'ds-snackbar-mint' : 'ds-snackbar'}
        pointerEvents="none"
      >
        <Text style={[styles.snackText, mint && styles.snackTextMint]}>
          {mint ? 'Outfit saved' : 'Item moved to archive'}
        </Text>
        <Text style={[styles.snackAction, mint && styles.snackActionMint]}>UNDO</Text>
      </Animated.View>
    </View>
  );
};

export const DsToast: React.FC = () => {
  const [shown, setShown] = useState(true);
  const v = useToggleValue(shown, 200);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  return (
    <View style={styles.liveWrap}>
      <Pressable
        style={styles.trigger}
        onPress={() => setShown(s => !s)}
        testID="ds-toast-toggle"
        accessibilityRole="button"
        accessibilityLabel="Replay toast"
      >
        <Text style={styles.triggerText}>{shown ? 'Hide' : 'Show'} toast</Text>
      </Pressable>
      <Animated.View
        style={[styles.toast, { opacity: v, transform: [{ scale }] }]}
        testID="ds-toast"
        pointerEvents="none"
      >
        <SpinLoader size={32} testID="ds-toast-spinner" />
        <Text style={styles.toastText}>Generating your look…</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  liveWrap: { alignItems: 'center', gap: space.s3 },
  trigger: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: role.ink,
  },
  triggerText: { ...type.bodySm, color: role.ink },
  snackbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s4,
    backgroundColor: color.n800,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: 16,
    minWidth: 300,
    ...shadow.raised,
  },
  snackbarMint: { backgroundColor: color.mint },
  snackText: { ...type.bodySm, color: color.p50, flex: 1 },
  snackTextMint: { color: color.n900 },
  snackAction: { ...type.bodySm, fontFamily: type.h3.fontFamily, color: color.su200 },
  snackActionMint: { color: color.n900 },
  toast: {
    alignItems: 'center',
    gap: 11,
    backgroundColor: 'rgba(29,31,35,0.92)',
    paddingVertical: 20,
    paddingHorizontal: 22,
    borderRadius: radius.xl,
    ...shadow.raised,
  },
  toastText: { ...type.bodySm, color: color.p50 },
});
