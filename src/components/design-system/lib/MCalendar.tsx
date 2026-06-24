/**
 * MCalendar / MTimePicker — self-contained date/time pickers.
 *
 *   import { MCalendar, MTimePicker } from '../components/design-system/lib';
 *   <MCalendar value={day} onChange={setDay} />          // month grid, ink fill springs in
 *   <MTimePicker time="07:30" period={p} onPeriodChange={setP} />
 *
 * Calendar day: ink fill springs in on select. AM/PM pill: fill crossfade.
 * Tokens + motion encapsulated INSIDE. Honors reduce-motion. Sensible defaults
 * (current month label + 31-day grid) so the minimal call renders.
 */
import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, role, shadow, space, type } from '../m-tokens';
import { useSpringToggle, useToggleValue } from '../MMotion';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const buildGrid = (daysInMonth: number, leadingBlanks: number) => {
  const cells: Array<number | null> = Array(leadingBlanks).fill(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

export interface MCalendarProps {
  value: number;
  onChange: (day: number) => void;
  monthLabel?: string;
  daysInMonth?: number;
  leadingBlanks?: number;
  today?: number;
  testID?: string;
}

export const MCalendar: React.FC<MCalendarProps> = ({
  value,
  onChange,
  monthLabel = 'June 2026',
  daysInMonth = 31,
  leadingBlanks = 2,
  today,
  testID,
}) => {
  const grid = buildGrid(daysInMonth, leadingBlanks);
  return (
    <View style={[styles.cal, shadow.card]} testID={testID}>
      <Text style={styles.calHead}>{monthLabel}</Text>
      <View style={styles.calRow}>
        {DOW.map((d, i) => (
          <Text key={i} style={styles.dow}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.calGrid}>
        {grid.map((day, i) =>
          day === null ? (
            <View key={i} style={styles.dayCell} />
          ) : (
            <Day
              key={i}
              day={day}
              isSel={day === value}
              isToday={day === today}
              onPress={() => onChange(day)}
              testID={
                testID
                  ? `${testID}-day-${day}${day === value ? '-selected' : ''}`
                  : undefined
              }
            />
          ),
        )}
      </View>
    </View>
  );
};

const Day: React.FC<{
  day: number;
  isSel: boolean;
  isToday?: boolean;
  onPress: () => void;
  testID?: string;
}> = ({ day, isSel, isToday, onPress, testID }) => {
  const fillV = useSpringToggle(isSel);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.dayCell, styles.day, isToday && !isSel && styles.dayToday]}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: isSel }}
      accessibilityLabel={`Day ${day}`}
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

export interface MTimePickerProps {
  time?: string;
  period: 'AM' | 'PM';
  onPeriodChange: (p: 'AM' | 'PM') => void;
  testID?: string;
}

export const MTimePicker: React.FC<MTimePickerProps> = ({
  time = '07 : 30',
  period,
  onPeriodChange,
  testID,
}) => (
  <View style={styles.timepick} testID={testID}>
    <Text style={styles.clock}>{time}</Text>
    <View style={styles.ampm}>
      {(['AM', 'PM'] as const).map(p => (
        <PeriodPill
          key={p}
          label={p}
          on={p === period}
          onPress={() => onPeriodChange(p)}
          testID={
            testID
              ? `${testID}-${p.toLowerCase()}${p === period ? '-active' : ''}`
              : undefined
          }
        />
      ))}
    </View>
  </View>
);

const PeriodPill: React.FC<{
  label: 'AM' | 'PM';
  on: boolean;
  onPress: () => void;
  testID?: string;
}> = ({ label, on, onPress, testID }) => {
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
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.period, { backgroundColor, borderColor }]}>
        <Text style={[styles.periodText, on && styles.periodTextOn]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

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
});
