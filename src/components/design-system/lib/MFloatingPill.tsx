/**
 * MFloatingPill — self-contained springy floating-pill nav (signature motion).
 *
 *   import { MFloatingPill } from '../components/design-system/lib';
 *   <MFloatingPill tabs={['Today','Browse','You']} value={v} onChange={setV} />
 *
 * The active thumb springs with an OVERSHOOT on x + width (low-damping spring ≈
 * cubic-bezier(.34,1.32,.5,1)). Tokens + motion encapsulated INSIDE. Honors
 * reduce-motion (jumps to target).
 *
 * ICON MODE (optional, backward-compatible): pass `renderIcon` to draw an icon
 * centered in each item INSTEAD of the text label. The active flag lets the
 * caller swap colors. Per-item `testID` / `accessibilityLabel` can be supplied
 * via `itemTestID` / `itemAccessibilityLabel`; when given they OVERRIDE the
 * default `${testID}-${slug}` derivation (icon labels are not meaningful slugs).
 *   <MFloatingPill
 *     tabs={['grid','collage']} value={v} onChange={setV}
 *     renderIcon={(t, on) => <Icon color={on ? ink : muted} />}
 *     itemTestID={(t) => `footer-${t}`}
 *     itemAccessibilityLabel={(t) => a11y[t]}
 *   />
 * Text mode and icon mode share the SAME springy thumb, tokens, and
 * reduce-motion behavior — only the item body (text vs icon) differs.
 */
import React, { useRef } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useReducedMotion } from '../../../theme/motion';
import { color, radius, role, shadow, type } from '../m-tokens';

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');

export interface MFloatingPillProps {
  tabs: string[];
  value: string;
  onChange: (value: string) => void;
  testID?: string;
  /** Icon mode: render an icon (centered) instead of the text label. */
  renderIcon?: (tab: string, active: boolean) => React.ReactNode;
  /** Override the per-item testID (default `${testID}-${slug(tab)}[-active]`). */
  itemTestID?: (tab: string, active: boolean) => string;
  /** Per-item accessibilityLabel (recommended in icon mode). */
  itemAccessibilityLabel?: (tab: string) => string;
}

export const MFloatingPill: React.FC<MFloatingPillProps> = ({
  tabs,
  value,
  onChange,
  testID,
  renderIcon,
  itemTestID,
  itemAccessibilityLabel,
}) => {
  const reduce = useReducedMotion();
  const idx = Math.max(0, tabs.indexOf(value));
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

  const move = (i: number, tab: string) => {
    onChange(tab);
    const targetX = xs.current[i] ?? 0;
    const targetW = widths.current[i] ?? 0;
    if (reduce) {
      x.setValue(targetX);
      w.setValue(targetW);
      return;
    }
    // Overshoot spring ≈ cubic-bezier(.34,1.32,.5,1): low damping → bounce.
    const cfg = {
      stiffness: 320,
      damping: 16,
      mass: 1,
      useNativeDriver: false,
    };
    Animated.spring(x, { toValue: targetX, ...cfg }).start();
    Animated.spring(w, { toValue: targetW, ...cfg }).start();
  };

  return (
    <View style={styles.fbar} testID={testID}>
      <Animated.View style={[styles.fthumb, { left: x, width: w }]} />
      {tabs.map((tb, i) => {
        const sel = tb === value;
        const itemId = itemTestID
          ? itemTestID(tb, sel)
          : testID
          ? `${testID}-${slug(tb)}${sel ? '-active' : ''}`
          : undefined;
        return (
          <Pressable
            key={tb}
            onLayout={onLayout(i)}
            onPress={() => move(i, tb)}
            style={[styles.fitem, renderIcon && styles.fitemIcon]}
            testID={itemId}
            accessibilityRole="tab"
            accessibilityLabel={itemAccessibilityLabel?.(tb)}
            accessibilityState={{ selected: sel }}
          >
            {renderIcon ? (
              renderIcon(tb, sel)
            ) : (
              <Text style={[styles.ftext, sel && styles.ftextOn]}>{tb}</Text>
            )}
          </Pressable>
        );
      })}
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
  // Icon mode: squarer ~48×48 tabs (icon 24 + 12 padding) — text-mode's wide
  // label padding (22) reads too spread around a single glyph.
  fitemIcon: { paddingVertical: 12, paddingHorizontal: 12 },
  ftext: { ...type.bodySm, color: role.ink3 },
  ftextOn: { color: role.ink, fontFamily: type.h3.fontFamily },
});
