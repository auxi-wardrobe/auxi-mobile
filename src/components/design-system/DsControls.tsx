/**
 * Design System — live selection-control demos (radio, checkbox, chip,
 * segmented control). The real `SettingsSwitch` is showcased separately in the
 * Components section. Each control is stateful + carries a testID per repo
 * convention (ds-<element>-<state>).
 *
 * Specs (auxi-ds.css):
 *  - radio  20px, ON ring + dot ink/black (#070707)
 *  - check  18×18, radius xs=2, ink fill + white check when on
 *  - chip   on = ink bg cream text; off = white + 1px line
 *  - seg    track cream, active pill white with subtle card shadow
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';

const ds = theme.ds;

export const DsRadio: React.FC<{
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}> = ({ label, selected, onPress, testID }) => (
  <Pressable
    style={styles.radioRow}
    onPress={onPress}
    testID={testID}
    accessibilityRole="radio"
    accessibilityState={{ selected }}
    accessibilityLabel={label}
  >
    <View style={[styles.radioRing, selected && styles.radioRingOn]}>
      {selected && <View style={styles.radioDot} />}
    </View>
    <Text style={[styles.controlLabel, !selected && styles.controlLabelMuted]}>
      {label}
    </Text>
  </Pressable>
);

export const DsCheckbox: React.FC<{
  label: string;
  checked: boolean;
  onPress: () => void;
  testID: string;
}> = ({ label, checked, onPress, testID }) => (
  <Pressable
    style={styles.radioRow}
    onPress={onPress}
    testID={testID}
    accessibilityRole="checkbox"
    accessibilityState={{ checked }}
    accessibilityLabel={label}
  >
    <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
      {checked && <View style={styles.checkMark} />}
    </View>
    <Text style={styles.controlLabel}>{label}</Text>
  </Pressable>
);

/** AM/PM radio pair (single-select group). */
export const DsRadioGroup: React.FC = () => {
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  return (
    <View style={styles.row}>
      <DsRadio
        label="AM"
        selected={period === 'AM'}
        onPress={() => setPeriod('AM')}
        testID="ds-controls-radio-am"
      />
      <DsRadio
        label="PM"
        selected={period === 'PM'}
        onPress={() => setPeriod('PM')}
        testID="ds-controls-radio-pm"
      />
    </View>
  );
};

export const DsCheckboxGroup: React.FC = () => {
  const [weekdays, setWeekdays] = useState(true);
  const [weekends, setWeekends] = useState(false);
  return (
    <View style={styles.row}>
      <DsCheckbox
        label="Weekdays"
        checked={weekdays}
        onPress={() => setWeekdays(v => !v)}
        testID="ds-controls-check-weekdays"
      />
      <DsCheckbox
        label="Weekends"
        checked={weekends}
        onPress={() => setWeekends(v => !v)}
        testID="ds-controls-check-weekends"
      />
    </View>
  );
};

export const DsChips: React.FC = () => {
  const labels = ['All', 'Tops', 'Bottoms', 'Shoes', 'Outerwear'];
  const [active, setActive] = useState<Record<string, boolean>>({ All: true });
  return (
    <View style={styles.chipRow}>
      {labels.map(l => {
        const on = !!active[l];
        return (
          <Pressable
            key={l}
            onPress={() => setActive(a => ({ ...a, [l]: !a[l] }))}
            style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
            testID={`ds-chip-${l.toLowerCase()}${on ? '-on' : '-off'}`}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={on ? styles.chipTextOn : styles.chipTextOff}>{l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export const DsSegmented: React.FC = () => {
  const options = ['Grid view', 'Collage view'];
  const [active, setActive] = useState(options[0]);
  return (
    <View style={styles.seg}>
      {options.map(o => {
        const on = o === active;
        return (
          <Pressable
            key={o}
            onPress={() => setActive(o)}
            style={[styles.segBtn, on && styles.segBtnOn]}
            testID={`ds-segmented-${o.split(' ')[0].toLowerCase()}${
              on ? '-active' : ''
            }`}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.segText, on && styles.segTextOn]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 26 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  controlLabel: {
    ...theme.typography.aliases.interBodySm,
    color: ds.color.ink,
  },
  controlLabelMuted: { color: ds.color.warm500 },
  radioRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: ds.color.warm500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioRingOn: { borderColor: ds.color.black },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ds.color.black,
  },
  checkBox: {
    width: 18,
    height: 18,
    borderRadius: ds.radius.xs,
    borderWidth: 2,
    borderColor: ds.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: {
    backgroundColor: ds.color.ink,
    borderColor: ds.color.ink,
  },
  checkMark: {
    width: 9,
    height: 5,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: ds.color.white,
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: ds.radius.full,
  },
  chipOn: { backgroundColor: ds.color.ink },
  chipOff: {
    backgroundColor: ds.color.white,
    borderWidth: 1,
    borderColor: ds.line,
  },
  chipTextOn: {
    ...theme.typography.aliases.interBodySm,
    color: ds.color.cream,
  },
  chipTextOff: {
    ...theme.typography.aliases.interBodySm,
    color: ds.color.ink,
  },
  seg: {
    flexDirection: 'row',
    backgroundColor: ds.color.cream,
    borderRadius: ds.radius.full,
    padding: 4,
    gap: 2,
    alignSelf: 'flex-start',
  },
  segBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: ds.radius.full,
  },
  segBtnOn: {
    backgroundColor: ds.color.white,
    ...ds.shadow.card,
  },
  segText: {
    ...theme.typography.aliases.interMediumSm,
    color: ds.color.onVariant,
  },
  segTextOn: { color: ds.color.ink },
});
