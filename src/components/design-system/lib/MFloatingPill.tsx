/**
 * MFloatingPill — self-contained springy floating-pill nav (signature motion).
 *
 *   import { MFloatingPill } from '../components/design-system/lib';
 *   <MFloatingPill tabs={['Today','Browse','You']} value={v} onChange={setV} />
 *
 * The active thumb springs with an OVERSHOOT on x + width (low-damping spring ≈
 * cubic-bezier(.34,1.32,.5,1)). Tokens + motion encapsulated INSIDE. Honors
 * reduce-motion (jumps to target).
 */
import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, role, shadow, type } from '../m-tokens';
import { useSlidingIndicator } from './useSlidingIndicator';

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');

export interface MFloatingPillProps {
  tabs: string[];
  value: string;
  onChange: (value: string) => void;
  testID?: string;
}

export const MFloatingPill: React.FC<MFloatingPillProps> = ({
  tabs,
  value,
  onChange,
  testID,
}) => {
  const idx = Math.max(0, tabs.indexOf(value));
  // Signature overshoot motion lives in the shared lib hook (bounce variant) —
  // same motion drives the themed Home footer cell. See useSlidingIndicator.
  const { x, w, onLayout, settle } = useSlidingIndicator(idx, { bounce: true });

  const move = (i: number, tab: string) => {
    onChange(tab);
    settle(i);
  };

  return (
    <View style={styles.fbar} testID={testID}>
      <Animated.View style={[styles.fthumb, { left: x, width: w }]} />
      {tabs.map((tb, i) => {
        const sel = tb === value;
        return (
          <Pressable
            key={tb}
            onLayout={onLayout(i)}
            onPress={() => move(i, tb)}
            style={styles.fitem}
            testID={
              testID
                ? `${testID}-${slug(tb)}${sel ? '-active' : ''}`
                : undefined
            }
            accessibilityRole="tab"
            accessibilityState={{ selected: sel }}
          >
            <Text style={[styles.ftext, sel && styles.ftextOn]}>{tb}</Text>
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
  ftext: { ...type.bodySm, color: role.ink3 },
  ftextOn: { color: role.ink, fontFamily: type.h3.fontFamily },
});
