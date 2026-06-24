/**
 * DsSnackbar / DsToast — self-contained controlled transient surfaces.
 *
 *   import { DsSnackbar, DsToast } from '../components/design-system/lib';
 *   <DsSnackbar visible={shown} message="Item archived" actionLabel="UNDO" onAction={undo} />
 *   <DsToast visible={busy} message="Generating your look…" />
 *
 * Reveal = opacity + scale(.9→1) ~200ms (useToggleValue); toast leads with a
 * continuous spinner (SpinLoader). `tone="mint"` = success accent. Tokens +
 * motion encapsulated INSIDE. Honors reduce-motion.
 */
import React from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { color, radius, shadow, space, type } from '../ds-tokens';
import { SpinLoader, useToggleValue } from '../DsMotion';

export interface DsSnackbarProps {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'dark' | 'mint';
  testID?: string;
}

export const DsSnackbar: React.FC<DsSnackbarProps> = ({
  visible,
  message,
  actionLabel,
  onAction,
  tone = 'dark',
  testID,
}) => {
  const mint = tone === 'mint';
  const v = useToggleValue(visible, 200);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  return (
    <Animated.View
      style={[
        styles.snackbar,
        mint && styles.snackbarMint,
        { opacity: v, transform: [{ scale }] },
      ]}
      testID={testID}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Text style={[styles.snackText, mint && styles.snackTextMint]}>
        {message}
      </Text>
      {!!actionLabel && (
        <Pressable
          onPress={onAction}
          testID={testID ? `${testID}-action` : undefined}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={[styles.snackAction, mint && styles.snackActionMint]}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
};

export interface DsToastProps {
  visible: boolean;
  message: string;
  testID?: string;
}

export const DsToast: React.FC<DsToastProps> = ({
  visible,
  message,
  testID,
}) => {
  const v = useToggleValue(visible, 200);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  return (
    <Animated.View
      style={[styles.toast, { opacity: v, transform: [{ scale }] }]}
      testID={testID}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <SpinLoader size={32} testID={testID ? `${testID}-spinner` : undefined} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
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
  snackAction: {
    ...type.bodySm,
    fontFamily: type.h3.fontFamily,
    color: color.su200,
  },
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
