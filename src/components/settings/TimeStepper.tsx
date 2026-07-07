import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../theme/theme';
import { Icons } from '../../assets/icons';

type TimeStepperProps = {
  // "HH:MM" on a 12-hour clock (hour 01–12, minute 00–59). The AM/PM period is
  // tracked separately by the caller (period stack in the change-time dialog).
  value: string;
  onChange: (next: string) => void;
  testIDPrefix: string;
  // Icon-only stepper buttons — a11y labels are for VoiceOver (CLAUDE.md: the
  // testID is the machine selector, the a11yLabel is the human-readable one).
  hourUpA11yLabel: string;
  hourDownA11yLabel: string;
  minuteUpA11yLabel: string;
  minuteDownA11yLabel: string;
};

const pad = (n: number) => String(n).padStart(2, '0');

// Wrap the 12-hour value into 1..12 (…, 11, 12, 1, 2, …).
const wrapHour = (h: number) => ((h - 1 + 12) % 12) + 1;
// Wrap the minute value into 0..59.
const wrapMinute = (m: number) => (m + 60) % 60;

// Parse a stored "HH:MM" string, tolerating malformed input by falling back to
// 12:00 so the stepper always has a sane starting point.
const parseTime = (value: string): { hour: number; minute: number } => {
  const [rawHour, rawMinute] = value.split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  return {
    hour: Number.isFinite(hour) ? wrapHour(hour) : 12,
    minute: Number.isFinite(minute) ? wrapMinute(minute) : 0,
  };
};

// Up/down chevrons reuse the horizontal ChevronRight glyph rotated 90° — the
// icon set ships no dedicated vertical chevron.
const ChevronUp = () => (
  <View style={styles.chevronUp}>
    <Icons.ChevronRight
      width={20}
      height={20}
      color={theme.colors.figmaTextDark}
    />
  </View>
);

const ChevronDown = () => (
  <View style={styles.chevronDown}>
    <Icons.ChevronRight
      width={20}
      height={20}
      color={theme.colors.figmaTextDark}
    />
  </View>
);

// Editable time control for the daily-reminder dialog. Two spinner columns
// (hour + minute) each with an up/down chevron; the AM/PM period lives outside
// this component. Emits the recomposed "HH:MM" string on every step.
export const TimeStepper = ({
  value,
  onChange,
  testIDPrefix,
  hourUpA11yLabel,
  hourDownA11yLabel,
  minuteUpA11yLabel,
  minuteDownA11yLabel,
}: TimeStepperProps) => {
  const { hour, minute } = parseTime(value);

  const emit = (nextHour: number, nextMinute: number) =>
    onChange(`${pad(nextHour)}:${pad(nextMinute)}`);

  const stepHour = (delta: number) => emit(wrapHour(hour + delta), minute);
  const stepMinute = (delta: number) => emit(hour, wrapMinute(minute + delta));

  return (
    <View style={styles.container}>
      <View style={styles.column}>
        <TouchableOpacity
          testID={`${testIDPrefix}-hour-up`}
          accessibilityLabel={hourUpA11yLabel}
          activeOpacity={0.7}
          hitSlop={8}
          style={styles.stepButton}
          onPress={() => stepHour(1)}
        >
          <ChevronUp />
        </TouchableOpacity>
        <Text
          testID={`${testIDPrefix}-hour-value`}
          style={styles.digit}
          allowFontScaling={false}
        >
          {pad(hour)}
        </Text>
        <TouchableOpacity
          testID={`${testIDPrefix}-hour-down`}
          accessibilityLabel={hourDownA11yLabel}
          activeOpacity={0.7}
          hitSlop={8}
          style={styles.stepButton}
          onPress={() => stepHour(-1)}
        >
          <ChevronDown />
        </TouchableOpacity>
      </View>

      <Text style={styles.separator} allowFontScaling={false}>
        :
      </Text>

      <View style={styles.column}>
        <TouchableOpacity
          testID={`${testIDPrefix}-minute-up`}
          accessibilityLabel={minuteUpA11yLabel}
          activeOpacity={0.7}
          hitSlop={8}
          style={styles.stepButton}
          onPress={() => stepMinute(1)}
        >
          <ChevronUp />
        </TouchableOpacity>
        <Text
          testID={`${testIDPrefix}-minute-value`}
          style={styles.digit}
          allowFontScaling={false}
        >
          {pad(minute)}
        </Text>
        <TouchableOpacity
          testID={`${testIDPrefix}-minute-down`}
          accessibilityLabel={minuteDownA11yLabel}
          activeOpacity={0.7}
          hitSlop={8}
          style={styles.stepButton}
          onPress={() => stepMinute(-1)}
        >
          <ChevronDown />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  column: {
    alignItems: 'center',
    gap: 4,
  },
  stepButton: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronUp: {
    transform: [{ rotate: '-90deg' }],
  },
  chevronDown: {
    transform: [{ rotate: '90deg' }],
  },
  digit: {
    ...theme.typography.aliases.poppinsTimeLg,
    color: theme.colors.figmaTextDark,
    minWidth: 48,
    textAlign: 'center',
  },
  separator: {
    ...theme.typography.aliases.poppinsTimeLg,
    color: theme.colors.figmaTextDark,
  },
});
