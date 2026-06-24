/**
 * Design System — Selection controls (NEW showcase).
 * switch (knob slide + track crossfade) · checkbox (box fill crossfade +
 * spring check-mark) · radio (ring crossfade + spring dot) · checkmenu.
 * Stateful + each carries a testID. Motion via useToggleValue / useSpringToggle.
 */
import React, { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, role, space, type } from './ds-tokens';
import { useSpringToggle, useToggleValue } from './DsMotion';
import { DsCheckMenu } from './DsCheckMenu';

export { DsCheckMenu };

/* ---------------- switch ---------------- */
export const DsSwitch: React.FC<{
  value: boolean;
  onValueChange: (v: boolean) => void;
  testID: string;
  accessibilityLabel: string;
}> = ({ value, onValueChange, testID, accessibilityLabel }) => {
  const v = useToggleValue(value);
  const left = v.interpolate({ inputRange: [0, 1], outputRange: [4, 24] });
  const bg = v.interpolate({
    inputRange: [0, 1],
    outputRange: [color.n300, color.su400],
  });
  return (
    <Pressable
      testID={value ? `${testID}-on` : testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      onPress={() => onValueChange(!value)}
    >
      <Animated.View style={[styles.track, { backgroundColor: bg }]}>
        <Animated.View style={[styles.knob, { left }]} />
      </Animated.View>
    </Pressable>
  );
};

/* ---------------- radio ---------------- */
export const DsRadio: React.FC<{
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
  disabled?: boolean;
}> = ({ label, selected, onPress, testID, disabled }) => {
  // ring color crossfades (layout-bound) + dot springs in (transform).
  const ringV = useToggleValue(selected, 130);
  const dotV = useSpringToggle(selected);
  const borderColor = disabled
    ? color.n300
    : (ringV.interpolate({
        inputRange: [0, 1],
        outputRange: [color.n400, color.p700],
      }) as unknown as string);
  return (
    <Pressable
      style={styles.row}
      onPress={disabled ? undefined : onPress}
      testID={testID}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.ring, { borderColor }]}>
        <Animated.View
          style={[
            styles.dot,
            { transform: [{ scale: dotV }], opacity: dotV },
          ]}
        />
      </Animated.View>
      <Text style={[styles.label, disabled && styles.muted]}>{label}</Text>
    </Pressable>
  );
};

/* ---------------- checkbox ---------------- */
export const DsCheckbox: React.FC<{
  label: string;
  checked: boolean;
  onPress: () => void;
  testID: string;
}> = ({ label, checked, onPress, testID }) => {
  // box fill crossfades; check-mark springs in (scale + fade).
  const fillV = useToggleValue(checked, 130);
  const checkV = useSpringToggle(checked);
  const backgroundColor = fillV.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(29,31,35,0)', role.ink],
  });
  const borderColor = fillV.interpolate({
    inputRange: [0, 1],
    outputRange: [color.n400, role.ink],
  });
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      testID={checked ? `${testID}-checked` : testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.box, { backgroundColor, borderColor }]}>
        <Animated.View
          style={[
            styles.check,
            { transform: [{ rotate: '-45deg' }, { scale: checkV }], opacity: checkV },
          ]}
        />
      </Animated.View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
};

/* ---------------- group demos ---------------- */
export const DsSelectionShowcase: React.FC = () => {
  const [notify, setNotify] = useState(true);
  const [autoSync, setAutoSync] = useState(false);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [weekdays, setWeekdays] = useState(true);
  const [weekends, setWeekends] = useState(false);
  return (
    <View style={styles.wrap}>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Daily reminder</Text>
        <DsSwitch
          value={notify}
          onValueChange={setNotify}
          testID="ds-switch-reminder"
          accessibilityLabel="Daily reminder"
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Auto-sync wardrobe</Text>
        <DsSwitch
          value={autoSync}
          onValueChange={setAutoSync}
          testID="ds-switch-autosync"
          accessibilityLabel="Auto-sync wardrobe"
        />
      </View>
      <View style={styles.groupRow}>
        <DsRadio
          label="AM"
          selected={period === 'AM'}
          onPress={() => setPeriod('AM')}
          testID="ds-radio-am"
        />
        <DsRadio
          label="PM"
          selected={period === 'PM'}
          onPress={() => setPeriod('PM')}
          testID="ds-radio-pm"
        />
        <DsRadio
          label="Disabled"
          selected={false}
          onPress={() => {}}
          disabled
          testID="ds-radio-disabled"
        />
      </View>
      <View style={styles.groupRow}>
        <DsCheckbox
          label="Weekdays"
          checked={weekdays}
          onPress={() => setWeekdays(v => !v)}
          testID="ds-check-weekdays"
        />
        <DsCheckbox
          label="Weekends"
          checked={weekends}
          onPress={() => setWeekends(v => !v)}
          testID="ds-check-weekends"
        />
      </View>
      <DsCheckMenu />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: space.s4 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: { ...type.body, color: role.ink },
  groupRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  label: { ...type.bodySm, color: role.ink },
  muted: { color: role.ink3 },
  track: {
    width: 52,
    height: 32,
    borderRadius: radius.full,
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    top: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: color.white,
  },
  ring: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: color.n400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.p700 },
  box: {
    width: 20,
    height: 20,
    borderRadius: radius.xs,
    borderWidth: 2,
    borderColor: color.n400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 9,
    height: 5,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: color.white,
    marginTop: -1,
  },
});
