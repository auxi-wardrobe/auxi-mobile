/**
 * Design System — Floating-pill footer (NEW showcase, the signature springy nav).
 * Motion: the active thumb springs with an OVERSHOOT on x + width
 * (cubic-bezier(.34,1.32,.5,1) ≈ a low-damping spring, ~340ms). Honors
 * useReducedMotion() by jumping straight to the target.
 */
import React, { useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useReducedMotion } from '../../theme/motion';
import { color, radius, role, shadow, type } from './ds-tokens';

export const DsFloatingPill: React.FC = () => {
  const reduce = useReducedMotion();
  const tabs = ['Today', 'Browse', 'You'];
  const [idx, setIdx] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const w = useRef(new Animated.Value(0)).current;
  const widths = useRef<number[]>([]);
  const xs = useRef<number[]>([]);

  const onLayout = (i: number) => (e: LayoutChangeEvent) => {
    const { x: lx, width } = e.nativeEvent.layout;
    xs.current[i] = lx;
    widths.current[i] = width;
    if (i === idx) {
      x.setValue(lx);
      w.setValue(width);
    }
  };

  const move = (i: number) => {
    setIdx(i);
    const targetX = xs.current[i] ?? 0;
    const targetW = widths.current[i] ?? 0;
    if (reduce) {
      x.setValue(targetX);
      w.setValue(targetW);
      return;
    }
    // Overshoot spring ≈ cubic-bezier(.34,1.32,.5,1): low damping → bounce.
    const cfg = { stiffness: 320, damping: 16, mass: 1, useNativeDriver: false };
    Animated.spring(x, { toValue: targetX, ...cfg }).start();
    Animated.spring(w, { toValue: targetW, ...cfg }).start();
  };

  return (
    <View style={styles.fbar} testID="ds-floating-pill">
      <Animated.View style={[styles.fthumb, { left: x, width: w }]} />
      {tabs.map((tb, i) => (
        <Pressable
          key={tb}
          onLayout={onLayout(i)}
          onPress={() => move(i)}
          style={styles.fitem}
          testID={`ds-floating-pill-${tb.toLowerCase()}${i === idx ? '-active' : ''}`}
          accessibilityRole="tab"
          accessibilityState={{ selected: i === idx }}
        >
          <Text style={[styles.ftext, i === idx && styles.ftextOn]}>{tb}</Text>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  fbar: {
    flexDirection: 'row',
    backgroundColor: color.p100,
    borderRadius: radius['2xl'],
    padding: 8,
    alignItems: 'center',
  },
  fthumb: {
    position: 'absolute',
    top: 8,
    bottom: 8,
    backgroundColor: color.white,
    borderRadius: radius.xl,
    ...shadow.card,
  },
  fitem: { paddingVertical: 10, paddingHorizontal: 22, alignItems: 'center' },
  ftext: { ...type.bodySm, color: role.ink3 },
  ftextOn: { color: role.ink, fontFamily: type.h3.fontFamily },
});
