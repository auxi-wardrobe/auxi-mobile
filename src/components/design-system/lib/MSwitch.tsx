/**
 * MSwitch — self-contained toggle primitive (knob slide + track crossfade).
 *
 *   import { MSwitch } from '../components/design-system/lib';
 *   <MSwitch value={on} onValueChange={setOn} />
 *
 * Tokens + toggle motion encapsulated INSIDE. Honors reduce-motion.
 */
import React from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { color, radius } from '../m-tokens';
import { useToggleValue } from '../MMotion';

export interface MSwitchProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  appendStateToTestID?: boolean;
}

export const MSwitch: React.FC<MSwitchProps> = ({
  value,
  onValueChange,
  disabled,
  testID,
  accessibilityLabel,
  appendStateToTestID = true,
}) => {
  const v = useToggleValue(value);
  const left = v.interpolate({ inputRange: [0, 1], outputRange: [4, 24] });
  const bg = v.interpolate({
    inputRange: [0, 1],
    outputRange: [color.n300, color.su400],
  });
  return (
    <Pressable
      testID={appendStateToTestID && value && testID ? `${testID}-on` : testID}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      onPress={() => onValueChange(!value)}
    >
      <Animated.View
        style={[
          styles.track,
          disabled && styles.disabled,
          { backgroundColor: bg },
        ]}
      >
        <Animated.View style={[styles.knob, { left }]} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
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
  disabled: { opacity: 0.5 },
});
