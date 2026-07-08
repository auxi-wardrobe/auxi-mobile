/**
 * MCheckMenu / MRadioMenu — self-contained grouped-selection menus.
 *
 *   import { MCheckMenu } from '../components/design-system/lib';
 *   <MCheckMenu options={opts} selected={sel} onToggle={toggle} />
 *
 * A surface-2 menu of rows with a selected-highlight crossfade + spring
 * check/dot. Tokens + motion encapsulated INSIDE. Honors reduce-motion.
 */
import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, MONO, radius, role, shadow, space, type } from '../m-tokens';
import { useSpringToggle, useToggleValue } from '../MMotion';

export interface MMenuOption {
  value: string;
  label: string;
  description?: string;
  /** small mono trailing tag, e.g. "all" / "02" */
  tag?: string;
  testID?: string;
}

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');

const Row: React.FC<{
  option: MMenuOption;
  index: number;
  on: boolean;
  kind: 'check' | 'radio';
  onPress: () => void;
  testID?: string;
}> = ({ option, index, on, kind, onPress, testID }) => {
  const fillV = useToggleValue(on, 130);
  const markV = useSpringToggle(on);
  const rowBg = fillV.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', color.n50],
  });
  const markBg = fillV.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(29,31,35,0)', role.ink],
  });
  const markBorder = fillV.interpolate({
    inputRange: [0, 1],
    outputRange: [color.n400, role.ink],
  });
  return (
    <Pressable
      onPress={onPress}
      testID={
        option.testID ??
        (testID ? `${testID}-${slug(option.value)}${on ? '-on' : ''}` : undefined)
      }
      accessibilityRole={kind === 'check' ? 'checkbox' : 'radio'}
      accessibilityState={kind === 'check' ? { checked: on } : { selected: on }}
      accessibilityLabel={option.label}
    >
      <Animated.View
        style={[
          styles.row,
          index > 0 && styles.divider,
          { backgroundColor: rowBg },
        ]}
      >
        {kind === 'check' ? (
          <Animated.View
            style={[
              styles.box,
              { backgroundColor: markBg, borderColor: markBorder },
            ]}
          >
            <Animated.View
              style={[
                styles.check,
                {
                  transform: [{ rotate: '-45deg' }, { scale: markV }],
                  opacity: markV,
                },
              ]}
            />
          </Animated.View>
        ) : (
          <Animated.View style={[styles.ring, { borderColor: markBorder }]}>
            <Animated.View
              style={[
                styles.dot,
                { transform: [{ scale: markV }], opacity: markV },
              ]}
            />
          </Animated.View>
        )}
        <View style={styles.copy}>
          <Text style={styles.label}>{option.label}</Text>
          {!!option.description && (
            <Text style={styles.description}>{option.description}</Text>
          )}
        </View>
        {!!option.tag && <Text style={styles.tag}>{option.tag}</Text>}
      </Animated.View>
    </Pressable>
  );
};

export interface MCheckMenuProps {
  options: MMenuOption[];
  selected: Record<string, boolean>;
  onToggle: (value: string) => void;
  testID?: string;
}

export const MCheckMenu: React.FC<MCheckMenuProps> = ({
  options,
  selected,
  onToggle,
  testID,
}) => (
  <View style={[styles.menu, shadow.card]} testID={testID}>
    {options.map((o, i) => (
      <Row
        key={o.value}
        option={o}
        index={i}
        kind="check"
        on={!!selected[o.value]}
        onPress={() => onToggle(o.value)}
        testID={testID}
      />
    ))}
  </View>
);

export interface MRadioMenuProps {
  options: MMenuOption[];
  value: string;
  onChange: (value: string) => void;
  testID?: string;
}

export const MRadioMenu: React.FC<MRadioMenuProps> = ({
  options,
  value,
  onChange,
  testID,
}) => (
  <View style={[styles.menu, shadow.card]} testID={testID}>
    {options.map((o, i) => (
      <Row
        key={o.value}
        option={o}
        index={i}
        kind="radio"
        on={o.value === value}
        onPress={() => onChange(o.value)}
        testID={testID}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  menu: {
    width: 280,
    backgroundColor: role.surface2,
    borderRadius: radius['2xl'],
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingVertical: 14,
    paddingHorizontal: space.s4,
  },
  divider: { borderTopWidth: 1, borderTopColor: role.lineCream },
  copy: { flex: 1, gap: space.s1 },
  label: { ...type.bodySm, color: role.ink },
  description: { ...type.caption, color: role.ink2 },
  tag: { fontFamily: MONO, fontSize: 10.5, color: role.ink3 },
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
