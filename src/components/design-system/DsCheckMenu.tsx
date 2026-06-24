/**
 * Design System — Checkmenu (NEW showcase): a surface-2 menu of checkbox rows
 * with a selected highlight + mono trailing tag. Token-driven, stateful.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, MONO, radius, role, shadow, space, type } from './ds-tokens';

export const DsCheckMenu: React.FC = () => {
  const opts = ['All categories', 'Tops', 'Bottoms', 'Shoes'];
  const [sel, setSel] = useState<Record<string, boolean>>({ Tops: true });
  return (
    <View style={[styles.menu, shadow.card]} testID="ds-checkmenu">
      {opts.map((o, i) => {
        const on = !!sel[o];
        return (
          <Pressable
            key={o}
            onPress={() => setSel(s => ({ ...s, [o]: !s[o] }))}
            style={[styles.row, i > 0 && styles.divider, on && styles.selected]}
            testID={`ds-checkmenu-${o.split(' ')[0].toLowerCase()}${
              on ? '-on' : ''
            }`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
          >
            <View style={[styles.box, on && styles.boxOn]}>
              {on && <View style={styles.check} />}
            </View>
            <Text style={styles.label}>{o}</Text>
            <Text style={styles.tag}>{i === 0 ? 'all' : `0${i}`}</Text>
          </Pressable>
        );
      })}
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
  selected: { backgroundColor: color.n50 },
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
