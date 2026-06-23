/**
 * Design System — Selection controls (NEW showcase).
 * switch (animated knob slide) · checkbox · radio · checkmenu. Stateful + each
 * carries a testID. Motion: knob slides over motion.duration.fast (useToggleValue).
 */
import React, { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, role, space, type } from './ds-tokens';
import { useToggleValue } from './DsMotion';
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
}> = ({ label, selected, onPress, testID, disabled }) => (
  <Pressable
    style={styles.row}
    onPress={disabled ? undefined : onPress}
    testID={testID}
    disabled={disabled}
    accessibilityRole="radio"
    accessibilityState={{ selected, disabled }}
    accessibilityLabel={label}
  >
    <View
      style={[
        styles.ring,
        selected && styles.ringOn,
        disabled && styles.disabledBorder,
      ]}
    >
      {selected && <View style={styles.dot} />}
    </View>
    <Text style={[styles.label, disabled && styles.muted]}>{label}</Text>
  </Pressable>
);

/* ---------------- checkbox ---------------- */
export const DsCheckbox: React.FC<{
  label: string;
  checked: boolean;
  onPress: () => void;
  testID: string;
}> = ({ label, checked, onPress, testID }) => (
  <Pressable
    style={styles.row}
    onPress={onPress}
    testID={checked ? `${testID}-checked` : testID}
    accessibilityRole="checkbox"
    accessibilityState={{ checked }}
    accessibilityLabel={label}
  >
    <View style={[styles.box, checked && styles.boxOn]}>
      {checked && <View style={styles.check} />}
    </View>
    <Text style={styles.label}>{label}</Text>
  </Pressable>
);

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
        <DsRadio label="Disabled" selected={false} onPress={() => {}} disabled testID="ds-radio-disabled" />
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
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { ...type.body, color: role.ink },
  groupRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  label: { ...type.bodySm, color: role.ink },
  muted: { color: role.ink3 },
  track: { width: 52, height: 32, borderRadius: radius.full, justifyContent: 'center' },
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
  ringOn: { borderColor: color.p700 },
  disabledBorder: { borderColor: color.n300 },
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
  boxOn: { backgroundColor: role.ink, borderColor: role.ink },
  check: {
    width: 9,
    height: 5,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: color.white,
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
});
