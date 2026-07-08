/**
 * MCheckbox / MRadio — self-contained selection atoms.
 *
 *   import { MCheckbox, MRadio } from '../components/design-system/lib';
 *   <MCheckbox checked={c} onChange={setC} label="Weekdays" />
 *   <MRadio selected={s} onSelect={pick} label="AM" />
 *
 * Box fill / ring crossfade + spring check/dot encapsulated INSIDE. Honors
 * reduce-motion. `indeterminate` renders a dash; `disabled` mutes + blocks press.
 */
import React from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { color, radius, role, space, type } from '../m-tokens';
import { useSpringToggle, useToggleValue } from '../MMotion';

export interface MCheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  indeterminate?: boolean;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

export const MCheckbox: React.FC<MCheckboxProps> = ({
  checked,
  onChange,
  label,
  indeterminate,
  disabled,
  testID,
  accessibilityLabel,
}) => {
  const filled = checked || !!indeterminate;
  const fillV = useToggleValue(filled, 130);
  const markV = useSpringToggle(filled);
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
      onPress={disabled ? undefined : () => onChange(!checked)}
      disabled={disabled}
      testID={checked && testID ? `${testID}-checked` : testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Animated.View
        style={[
          styles.box,
          disabled && styles.muted,
          { backgroundColor, borderColor },
        ]}
      >
        {indeterminate ? (
          <Animated.View style={[styles.dash, { opacity: markV }]} />
        ) : (
          <Animated.View
            style={[
              styles.check,
              {
                transform: [{ rotate: '-45deg' }, { scale: markV }],
                opacity: markV,
              },
            ]}
          />
        )}
      </Animated.View>
      {!!label && (
        <Text style={[styles.label, disabled && styles.mutedText]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
};

export interface MRadioProps {
  selected: boolean;
  onSelect?: () => void;
  label?: string;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

export const MRadio: React.FC<MRadioProps> = ({
  selected,
  onSelect,
  label,
  disabled,
  testID,
  accessibilityLabel,
}) => {
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
      onPress={disabled ? undefined : onSelect}
      disabled={disabled || !onSelect}
      testID={selected && testID ? `${testID}-selected` : testID}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Animated.View style={[styles.ring, { borderColor }]}>
        <Animated.View
          style={[styles.dot, { transform: [{ scale: dotV }], opacity: dotV }]}
        />
      </Animated.View>
      {!!label && (
        <Text style={[styles.label, disabled && styles.mutedText]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s2 },
  label: { ...type.bodySm, color: role.ink },
  mutedText: { color: role.ink3 },
  muted: { opacity: 0.6 },
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
  dash: { width: 10, height: 2, borderRadius: 1, backgroundColor: color.white },
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
});
