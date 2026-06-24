/**
 * Design System — Inputs + Chips/Tags/Badges (NEW showcase).
 * Inputs: default · focus · error. Filter chips: tap → bg crossfade + select pop
 * (1→1.04→1 spring). Removable chips: tap → collapse (scale→0 + fade) then unmount
 * (Reset restores). Tag · badge (cream / tan / soft) · status (ok/warn/err/info).
 */
import React, { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { motion, useReducedMotion } from '../../theme/motion';
import { color, radius, role, space, type } from './ds-tokens';
import { useToggleValue } from './DsMotion';

/* ---------------- inputs ---------------- */
const Field: React.FC<{
  label: string;
  value: string;
  state: 'default' | 'focus' | 'error';
  hint?: string;
}> = ({ label, value, state, hint }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View
      style={[
        styles.input,
        state === 'focus' && styles.inputFocus,
        state === 'error' && styles.inputErr,
      ]}
      testID={`ds-input-${state}`}
    >
      <Text style={styles.inputText}>{value}</Text>
    </View>
    {!!hint && (
      <Text style={[styles.hint, state === 'error' && styles.hintErr]}>
        {hint}
      </Text>
    )}
  </View>
);

export const DsInputs: React.FC = () => (
  <View style={styles.colWrap}>
    <Field
      label="Email"
      value="macgie@auxi.app"
      state="default"
      hint="We never share this."
    />
    <Field label="Search wardrobe" value="Linen overshirt" state="focus" />
    <Field label="Password" value="••••" state="error" hint="Too short" />
  </View>
);

/* ---------------- chips / tags / badges ---------------- */

/** Filter chip: bg crossfade + a select "pop" (1 → 1.04 → 1) spring on toggle. */
const FilterChip: React.FC<{ label: string; on: boolean; onPress: () => void }> = ({
  label,
  on,
  onPress,
}) => {
  const reduce = useReducedMotion();
  const fillV = useToggleValue(on, 120);
  const pop = useRef(new Animated.Value(1)).current;
  const bg = fillV.interpolate({
    inputRange: [0, 1],
    outputRange: [color.p200, color.p500],
  });
  const onToggle = () => {
    onPress();
    if (reduce) return;
    Animated.sequence([
      Animated.spring(pop, {
        toValue: 1.04,
        stiffness: motion.spring.confident.stiffness,
        damping: 12,
        mass: 1,
        useNativeDriver: true,
      }),
      Animated.spring(pop, {
        toValue: 1,
        stiffness: motion.spring.confident.stiffness,
        damping: motion.spring.confident.damping,
        mass: 1,
        useNativeDriver: true,
      }),
    ]).start();
  };
  return (
    <Pressable
      onPress={onToggle}
      testID={`ds-chip-${label.toLowerCase()}${on ? '-on' : ''}`}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
    >
      <Animated.View
        style={[styles.chip, { backgroundColor: bg, transform: [{ scale: pop }] }]}
      >
        <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
};

/** Removable chip: on remove, collapses (scale → 0 + fade) then unmounts. */
const RemovableChip: React.FC<{ label: string; onRemove: () => void }> = ({
  label,
  onRemove,
}) => {
  const reduce = useReducedMotion();
  const v = useRef(new Animated.Value(1)).current;
  const remove = () => {
    if (reduce) {
      onRemove();
      return;
    }
    Animated.timing(v, {
      toValue: 0,
      duration: motion.duration.fast,
      easing: motion.easing.exit,
      useNativeDriver: true,
    }).start(onRemove);
  };
  return (
    <Pressable
      onPress={remove}
      testID={`ds-chip-removable-${label.toLowerCase()}`}
      accessibilityRole="button"
      accessibilityLabel={`Remove ${label}`}
    >
      <Animated.View
        style={[
          styles.chip,
          styles.chipRemovable,
          { opacity: v, transform: [{ scale: v }] },
        ]}
      >
        <Text style={styles.chipText}>{label}</Text>
        <Text style={styles.chipX}>×</Text>
      </Animated.View>
    </Pressable>
  );
};

export const DsChips: React.FC = () => {
  const filters = ['All', 'Tops', 'Bottoms', 'Shoes'];
  const [active, setActive] = useState<Record<string, boolean>>({ All: true });
  const [removable, setRemovable] = useState(['Calm', 'Effortless', 'Warm']);
  return (
    <View style={styles.colWrap}>
      <Text style={styles.cap}>Filter chips · tap to toggle</Text>
      <View style={styles.chipRow}>
        {filters.map(f => (
          <FilterChip
            key={f}
            label={f}
            on={!!active[f]}
            onPress={() => setActive(a => ({ ...a, [f]: !a[f] }))}
          />
        ))}
      </View>

      <View style={styles.removableHead}>
        <Text style={styles.cap}>Removable chips · tap to remove</Text>
        {removable.length < 3 && (
          <Pressable
            onPress={() => setRemovable(['Calm', 'Effortless', 'Warm'])}
            testID="ds-chip-removable-reset"
            accessibilityRole="button"
            accessibilityLabel="Reset removable chips"
          >
            <Text style={styles.resetLink}>Reset</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.chipRow}>
        {removable.map(r => (
          <RemovableChip
            key={r}
            label={r}
            onRemove={() => setRemovable(list => list.filter(x => x !== r))}
          />
        ))}
      </View>

      <Text style={styles.cap}>Tags & badges</Text>
      <View style={styles.chipRow}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>NEW</Text>
        </View>
        <Badge label="Cream" variant="cream" />
        <Badge label="Tan" variant="tan" />
        <Badge label="Soft" variant="soft" />
      </View>

      <Text style={styles.cap}>Status</Text>
      <View style={styles.chipRow}>
        <Status label="Synced" tone="ok" />
        <Status label="Generating" tone="warn" />
        <Status label="Failed" tone="err" />
        <Status label="Info" tone="info" />
      </View>
    </View>
  );
};

const Badge: React.FC<{ label: string; variant: 'cream' | 'tan' | 'soft' }> = ({
  label,
  variant,
}) => {
  const bg =
    variant === 'cream'
      ? color.p100
      : variant === 'tan'
      ? color.p200
      : color.n100;
  const fg = variant === 'soft' ? role.ink2 : color.p600;
  return (
    <View
      style={[styles.badge, { backgroundColor: bg }]}
      testID={`ds-badge-${variant}`}
    >
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
};

const TONE = {
  ok: { bg: color.su100, fg: color.su500, dot: color.su400 },
  warn: { bg: color.wa100, fg: color.wa500, dot: color.wa400 },
  err: { bg: color.da100, fg: color.da500, dot: color.da400 },
  info: { bg: color.in100, fg: color.in500, dot: color.in400 },
} as const;

const Status: React.FC<{ label: string; tone: keyof typeof TONE }> = ({
  label,
  tone,
}) => {
  const t = TONE[tone];
  return (
    <View
      style={[styles.status, { backgroundColor: t.bg }]}
      testID={`ds-status-${tone}`}
    >
      <View style={[styles.statusDot, { backgroundColor: t.dot }]} />
      <Text style={[styles.statusText, { color: t.fg }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  colWrap: { width: '100%', gap: space.s3 },
  cap: { ...type.overline, color: role.ink3, marginTop: space.s2 },
  field: { width: '100%', gap: 6 },
  fieldLabel: { ...type.caption, color: role.ink2 },
  input: {
    height: 54,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: color.n300,
    paddingHorizontal: space.s4,
    justifyContent: 'center',
    backgroundColor: color.white,
  },
  inputFocus: { borderColor: role.ink },
  inputErr: { borderColor: color.da400 },
  inputText: { ...type.bodySm, color: role.ink },
  hint: { ...type.caption, color: role.ink3 },
  hintErr: { color: color.da400 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s2,
    alignItems: 'center',
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: space.s4,
    borderRadius: radius.full,
    backgroundColor: color.p200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  chipRemovable: { paddingLeft: 11 },
  removableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.s2,
  },
  resetLink: {
    ...type.caption,
    fontFamily: type.h3.fontFamily,
    color: color.p600,
  },
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
