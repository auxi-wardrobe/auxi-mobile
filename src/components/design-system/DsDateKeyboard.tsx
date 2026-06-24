/**
 * Design System — Date picker (calendar + time picker) + Keyboard (NEW showcase).
 * Calendar day: ink fill springs in on select. Time picker AM/PM: fill crossfade.
 * Keyboard keys: press → scale .92 + bg highlight. All honor useReducedMotion().
 */
import React, { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, role, shadow, space, type } from './ds-tokens';
import {
  usePressHighlight,
  useSpringToggle,
  useToggleValue,
} from './DsMotion';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
// A 5×7 month grid: leading blanks then 1..31.
const GRID: Array<number | null> = [
  null,
  null,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  28,
  29,
  30,
  31,
  null,
  null,
];

export const DsCalendar: React.FC = () => {
  const [sel, setSel] = useState(14);
  const today = 9;
  return (
    <View style={[styles.cal, shadow.card]} testID="ds-calendar">
      <Text style={styles.calHead}>June 2026</Text>
      <View style={styles.calRow}>
        {DOW.map((d, i) => (
          <Text key={i} style={styles.dow}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.calGrid}>
        {GRID.map((day, i) => {
          if (day === null) return <View key={i} style={styles.dayCell} />;
          return (
            <CalendarDay
              key={i}
              day={day}
              isSel={day === sel}
              isToday={day === today}
              onPress={() => setSel(day)}
            />
          );
        })}
      </View>
    </View>
  );
};

/** A calendar day: when selected, the ink fill springs in (scale + fade). */
const CalendarDay: React.FC<{
  day: number;
  isSel: boolean;
  isToday: boolean;
  onPress: () => void;
}> = ({ day, isSel, isToday, onPress }) => {
  const fillV = useSpringToggle(isSel);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.dayCell, styles.day, isToday && !isSel && styles.dayToday]}
      testID={`ds-calendar-day-${day}${isSel ? '-selected' : ''}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSel }}
    >
      <Animated.View
        style={[
          styles.daySelFill,
          { opacity: fillV, transform: [{ scale: fillV }] },
        ]}
        pointerEvents="none"
      />
      <Text style={[styles.dayText, isSel && styles.daySelText]}>{day}</Text>
    </Pressable>
  );
};

/** An AM/PM pill with a fill crossfade on select. */
const PeriodPill: React.FC<{
  label: 'AM' | 'PM';
  on: boolean;
  onPress: () => void;
}> = ({ label, on, onPress }) => {
  const v = useToggleValue(on, 130);
  const backgroundColor = v.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(29,31,35,0)', role.ink],
  });
  const borderColor = v.interpolate({
    inputRange: [0, 1],
    outputRange: [role.line, role.ink],
  });
  return (
    <Pressable
      onPress={onPress}
      testID={`ds-time-period-${label.toLowerCase()}${on ? '-active' : ''}`}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
    >
      <Animated.View style={[styles.period, { backgroundColor, borderColor }]}>
        <Text style={[styles.periodText, on && styles.periodTextOn]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

export const DsTimePicker: React.FC = () => {
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  return (
    <View style={styles.timepick} testID="ds-time-picker">
      <Text style={styles.clock}>07 : 30</Text>
      <View style={styles.ampm}>
        {(['AM', 'PM'] as const).map(p => (
          <PeriodPill
            key={p}
            label={p}
            on={p === period}
            onPress={() => setPeriod(p)}
          />
        ))}
      </View>
    </View>
  );
};

const KEY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

/** A key that springs down (scale .92) + briefly highlights while pressed. */
const Key: React.FC<{ label: string; wrapStyle?: any; testID: string }> = ({
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

export const DsKeyboard: React.FC = () => (
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
  cal: {
    width: 300,
    backgroundColor: role.surface2,
    borderRadius: radius['2xl'],
    padding: 18,
  },
  calHead: { ...type.h3, color: role.ink, marginBottom: space.s3 },
  calRow: { flexDirection: 'row' },
  dow: {
    ...type.caption,
    color: role.ink3,
    width: `${100 / 7}%`,
    textAlign: 'center',
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: { borderRadius: radius.full },
  daySelFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: role.ink,
    borderRadius: radius.full,
  },
  dayToday: {
    borderWidth: 1,
    borderColor: color.n300,
    borderRadius: radius.full,
  },
  dayText: { ...type.bodySm, color: role.ink },
  daySelText: { color: color.p50 },
  timepick: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  clock: { fontFamily: type.display.fontFamily, fontSize: 46, color: role.ink },
  ampm: { gap: space.s2 },
  period: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: role.line,
  },
  periodText: { ...type.bodySm, color: role.ink },
  periodTextOn: { color: color.p50 },
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
