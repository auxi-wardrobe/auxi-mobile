/**
 * Design System — Checkmenu (NEW showcase): a surface-2 menu of checkbox rows
 * with a selected highlight + mono trailing tag. Token-driven, stateful.
 */
import React, { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, MONO, radius, role, shadow, space, type } from './ds-tokens';
import { useSpringToggle, useToggleValue } from './DsMotion';

/** A check-menu row: bg highlight crossfade + spring check-mark on toggle. */
const CheckRow: React.FC<{
  label: string;
  index: number;
  on: boolean;
  onPress: () => void;
}> = ({ label, index, on, onPress }) => {
  const fillV = useToggleValue(on, 130);
  const checkV = useSpringToggle(on);
  const rowBg = fillV.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', color.n50],
  });
  const boxBg = fillV.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(29,31,35,0)', role.ink],
  });
  const boxBorder = fillV.interpolate({
    inputRange: [0, 1],
    outputRange: [color.n400, role.ink],
  });
  return (
    <Pressable
      onPress={onPress}
      testID={`ds-checkmenu-${label.split(' ')[0].toLowerCase()}${
        on ? '-on' : ''
      }`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
    >
      <Animated.View
        style={[styles.row, index > 0 && styles.divider, { backgroundColor: rowBg }]}
      >
        <Animated.View
          style={[styles.box, { backgroundColor: boxBg, borderColor: boxBorder }]}
        >
          <Animated.View
            style={[
              styles.check,
              {
                transform: [{ rotate: '-45deg' }, { scale: checkV }],
                opacity: checkV,
              },
            ]}
          />
        </Animated.View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.tag}>{index === 0 ? 'all' : `0${index}`}</Text>
      </Animated.View>
    </Pressable>
  );
};

export const DsCheckMenu: React.FC = () => {
  const opts = ['All categories', 'Tops', 'Bottoms', 'Shoes'];
  const [sel, setSel] = useState<Record<string, boolean>>({ Tops: true });
  return (
    <View style={[styles.menu, shadow.card]} testID="ds-checkmenu">
      {opts.map((o, i) => (
        <CheckRow
          key={o}
          label={o}
          index={i}
          on={!!sel[o]}
          onPress={() => setSel(s => ({ ...s, [o]: !s[o] }))}
        />
      ))}
    </View>
  );
};

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
  label: { ...type.bodySm, color: role.ink, flex: 1 },
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
});
