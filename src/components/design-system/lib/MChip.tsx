/**
 * MChip / MBadge / MTag / MStatus — self-contained tagging primitives.
 *
 *   import { MChip, MBadge, MStatus } from '../components/design-system/lib';
 *   <MChip selected={on} onPress={toggle}>Tops</MChip>
 *   <MChip removable onRemove={drop}>Calm</MChip>
 *   <MBadge tone="cream">NEW</MBadge>
 *   <MStatus tone="ok">Synced</MStatus>
 *
 * Filter chip: bg crossfade + select "pop" spring. Removable chip: collapse
 * (scale→0 + fade) before unmount (parent drops it in onRemove). Tokens +
 * motion encapsulated INSIDE. Honors reduce-motion.
 */
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { motion, useReducedMotion } from '../../../theme/motion';
import { color, radius, role, type } from '../m-tokens';
import { useToggleValue } from '../MMotion';

export interface MChipProps {
  children: string;
  selected?: boolean;
  onPress?: () => void;
  removable?: boolean;
  onRemove?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}

export const MChip: React.FC<MChipProps> = ({
  children,
  selected = false,
  onPress,
  removable,
  onRemove,
  testID,
  accessibilityLabel,
}) => {
  const reduce = useReducedMotion();
  const fillV = useToggleValue(selected, 120);
  const pop = useRef(new Animated.Value(1)).current;
  const collapse = useRef(new Animated.Value(1)).current;

  const bg = fillV.interpolate({
    inputRange: [0, 1],
    outputRange: [color.p200, color.p500],
  });

  // The chip's `transform`/`opacity` animations MUST use the JS driver
  // (useNativeDriver: false), not the native one. They share a single
  // Animated.View with the `backgroundColor` crossfade (`bg`), which is JS-driven
  // because colour interpolation can't run natively. Mixing a native-driven and
  // a JS-driven animation on the SAME node throws the "native/non-native driver"
  // invariant on iOS/Android — a native-only crash that react-native-web
  // silently tolerates (so it never showed in the web preview).
  const handleSelect = () => {
    onPress?.();
    if (reduce) return;
    Animated.sequence([
      Animated.spring(pop, {
        toValue: 1.04,
        stiffness: motion.spring.confident.stiffness,
        damping: 12,
        mass: 1,
        useNativeDriver: false,
      }),
      Animated.spring(pop, {
        toValue: 1,
        stiffness: motion.spring.confident.stiffness,
        damping: motion.spring.confident.damping,
        mass: 1,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleRemove = () => {
    if (reduce) {
      onRemove?.();
      return;
    }
    Animated.timing(collapse, {
      toValue: 0,
      duration: motion.duration.fast,
      easing: motion.easing.exit,
      useNativeDriver: false,
    }).start(() => onRemove?.());
  };

  return (
    <Pressable
      onPress={removable ? handleRemove : handleSelect}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={
        accessibilityLabel ?? (removable ? `Remove ${children}` : children)
      }
    >
      <Animated.View
        style={[
          styles.chip,
          removable && styles.chipRemovable,
          {
            backgroundColor: removable ? color.p200 : bg,
            opacity: removable ? collapse : 1,
            transform: [{ scale: removable ? collapse : pop }],
          },
        ]}
      >
        <Text
          style={[styles.chipText, selected && !removable && styles.chipTextOn]}
        >
          {children}
        </Text>
        {removable && <Text style={styles.chipX}>×</Text>}
      </Animated.View>
    </Pressable>
  );
};

export type MBadgeTone = 'cream' | 'tan' | 'soft';

export interface MBadgeProps {
  children: string;
  tone?: MBadgeTone;
  testID?: string;
}

export const MBadge: React.FC<MBadgeProps> = ({
  children,
  tone = 'cream',
  testID,
}) => {
  const bg =
    tone === 'cream' ? color.p100 : tone === 'tan' ? color.p200 : color.n100;
  const fg = tone === 'soft' ? role.ink2 : color.p600;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]} testID={testID}>
      <Text style={[styles.badgeText, { color: fg }]}>{children}</Text>
    </View>
  );
};

export interface MTagProps {
  children: string;
  testID?: string;
}

export const MTag: React.FC<MTagProps> = ({ children, testID }) => (
  <View style={styles.tag} testID={testID}>
    <Text style={styles.tagText}>{children}</Text>
  </View>
);

export type MStatusTone = 'ok' | 'warn' | 'err' | 'info';

const TONE: Record<MStatusTone, { bg: string; fg: string; dot: string }> = {
  ok: { bg: color.su100, fg: color.su500, dot: color.su400 },
  warn: { bg: color.wa100, fg: color.wa500, dot: color.wa400 },
  err: { bg: color.da100, fg: color.da500, dot: color.da400 },
  info: { bg: color.in100, fg: color.in500, dot: color.in400 },
};

export interface MStatusProps {
  children: string;
  tone?: MStatusTone;
  testID?: string;
}

export const MStatus: React.FC<MStatusProps> = ({
  children,
  tone = 'info',
  testID,
}) => {
  const t = TONE[tone];
  return (
    <View style={[styles.status, { backgroundColor: t.bg }]} testID={testID}>
      <View style={[styles.statusDot, { backgroundColor: t.dot }]} />
      <Text style={[styles.statusText, { color: t.fg }]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    backgroundColor: color.p200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  chipRemovable: { paddingLeft: 11 },
  chipText: {
    ...type.bodySm,
    fontFamily: type.h3.fontFamily,
    color: color.p600,
    fontSize: 13.5,
  },
  chipTextOn: { color: color.p50 },
  chipX: { fontSize: 15, color: color.p600, opacity: 0.7 },
  tag: {
    paddingVertical: 5,
    paddingHorizontal: 13,
    borderRadius: radius.full,
    backgroundColor: 'rgba(29,31,35,0.82)',
  },
  tagText: { fontFamily: type.h3.fontFamily, fontSize: 11.5, color: color.p50 },
  badge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.full,
  },
  badgeText: { fontFamily: type.h3.fontFamily, fontSize: 11.5 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 5,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: radius.full,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontFamily: type.h3.fontFamily, fontSize: 12 },
});
