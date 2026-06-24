/**
 * Design System — Keyboard (SHOWCASE-ONLY static demo).
 *
 * NOT a reusable primitive (per GH-364: a QWERTY keyboard isn't something the
 * app re-renders — the OS owns it). Kept here purely to illustrate key press
 * motion (scale .92 + bg highlight) on the DS page. Lives outside lib/ on
 * purpose; the barrel does not export it.
 */
import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, role, type } from './m-tokens';
import { usePressHighlight } from './MMotion';

const KEY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

const Key: React.FC<{ label: string; wrapStyle?: object; testID: string }> = ({
  label,
  wrapStyle,
  testID,
}) => {
  const { v, onPressIn, onPressOut } = usePressHighlight();
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] });
  const bg = v.interpolate({
    inputRange: [0, 1],
    outputRange: [color.white, color.n100],
  });
  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.keyHit, wrapStyle]}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View
        style={[styles.key, { backgroundColor: bg, transform: [{ scale }] }]}
      >
        <Text style={styles.keyText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
};

export const MKeyboardDemo: React.FC = () => (
  <View style={styles.kbd} testID="ds-keyboard">
    {KEY_ROWS.map((row, ri) => (
      <View key={ri} style={styles.kbdRow}>
        {row.map(k => (
          <Key key={k} label={k} testID={`ds-key-${k.toLowerCase()}`} />
        ))}
      </View>
    ))}
    <View style={styles.kbdRow}>
      <Key label="123" wrapStyle={styles.keyWide} testID="ds-key-123" />
      <Key label="space" wrapStyle={styles.keySpace} testID="ds-key-space" />
      <Key label="return" wrapStyle={styles.keyWide} testID="ds-key-return" />
    </View>
  </View>
);

const styles = StyleSheet.create({
  kbd: {
    width: 340,
    backgroundColor: color.n300,
    borderRadius: radius.md,
    paddingHorizontal: 4,
    paddingTop: 7,
    paddingBottom: 8,
    gap: 6,
  },
  kbdRow: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  keyHit: { flex: 1, maxWidth: 30 },
  key: {
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyWide: { flex: 1.6, maxWidth: 56 },
  keySpace: { flex: 5, maxWidth: 180 },
  keyText: { ...type.caption, color: role.ink, fontSize: 13 },
});
