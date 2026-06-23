/**
 * Design System — Date picker (calendar + time picker) + Keyboard (NEW showcase).
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, role, shadow, space, type } from './ds-tokens';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
// A 5×7 month grid: leading blanks then 1..31.
const GRID: Array<number | null> = [
  null, null, 1, 2, 3, 4, 5,
  6, 7, 8, 9, 10, 11, 12,
  13, 14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 24, 25, 26,
  27, 28, 29, 30, 31, null, null,
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
          const isSel = day === sel;
          const isToday = day === today;
          return (
            <Pressable
              key={i}
              onPress={() => setSel(day)}
              style={[styles.dayCell, styles.day, isSel && styles.daySel, isToday && !isSel && styles.dayToday]}
              testID={`ds-calendar-day-${day}${isSel ? '-selected' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
            >
              <Text style={[styles.dayText, isSel && styles.daySelText]}>{day}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export const DsTimePicker: React.FC = () => {
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  return (
    <View style={styles.timepick} testID="ds-time-picker">
      <Text style={styles.clock}>07 : 30</Text>
      <View style={styles.ampm}>
        {(['AM', 'PM'] as const).map(p => {
          const on = p === period;
          return (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[styles.period, on && styles.periodOn]}
              testID={`ds-time-period-${p.toLowerCase()}${on ? '-active' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.periodText, on && styles.periodTextOn]}>{p}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const KEY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export const DsKeyboard: React.FC = () => (
  <View style={styles.kbd} testID="ds-keyboard">
    {KEY_ROWS.map((row, ri) => (
      <View key={ri} style={styles.kbdRow}>
        {row.map(k => (
          <View key={k} style={styles.key}>
            <Text style={styles.keyText}>{k}</Text>
          </View>
        ))}
      </View>
    ))}
    <View style={styles.kbdRow}>
      <View style={[styles.key, styles.keyWide]}>
        <Text style={styles.keyText}>123</Text>
      </View>
      <View style={[styles.key, styles.keySpace]}>
        <Text style={styles.keyText}>space</Text>
      </View>
      <View style={[styles.key, styles.keyWide]}>
        <Text style={styles.keyText}>return</Text>
      </View>
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
  dow: { ...type.caption, color: role.ink3, width: `${100 / 7}%`, textAlign: 'center' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  day: { borderRadius: radius.full },
  daySel: { backgroundColor: role.ink },
  dayToday: { borderWidth: 1, borderColor: color.n300, borderRadius: radius.full },
  dayText: { ...type.bodySm, color: role.ink },
  daySelText: { color: color.p50 },
  timepick: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  clock: { fontFamily: type.display.fontFamily, fontSize: 46, color: role.ink },
  ampm: { gap: space.s2 },
  period: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: role.line },
  periodOn: { backgroundColor: role.ink, borderColor: role.ink },
  periodText: { ...type.bodySm, color: role.ink },
  periodTextOn: { color: color.p50 },
  kbd: { width: 340, backgroundColor: color.n300, borderRadius: radius.md, paddingHorizontal: 4, paddingTop: 7, paddingBottom: 8, gap: 6 },
  kbdRow: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  key: {
    flex: 1,
    maxWidth: 30,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: color.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyWide: { flex: 1.6, maxWidth: 56, backgroundColor: color.n400 },
  keySpace: { flex: 5, maxWidth: 180 },
  keyText: { ...type.caption, color: role.ink, fontSize: 13 },
});
