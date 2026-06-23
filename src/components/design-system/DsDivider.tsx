/**
 * Design System — Dividers (NEW showcase).
 * Horizontal hairline · labelled divider (mono overline between rules) · inset
 * · vertical.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { role, space, type } from './ds-tokens';

export const DsDivider: React.FC = () => (
  <View style={styles.wrap}>
    <View style={styles.hr} testID="ds-divider-h" />

    <View style={styles.labelled} testID="ds-divider-labelled">
      <View style={styles.flexLine} />
      <Text style={styles.label}>OR</Text>
      <View style={styles.flexLine} />
    </View>

    <View style={styles.insetWrap}>
      <View style={[styles.hr, styles.inset]} testID="ds-divider-inset" />
    </View>

    <View style={styles.vRow} testID="ds-divider-vertical">
      <Text style={styles.vText}>Tops</Text>
      <View style={styles.vLine} />
      <Text style={styles.vText}>Bottoms</Text>
      <View style={styles.vLine} />
      <Text style={styles.vText}>Shoes</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: space.s5 },
  hr: { height: 1, backgroundColor: role.borderSubtle, width: '100%' },
  labelled: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  flexLine: { flex: 1, height: 1, backgroundColor: role.borderSubtle },
  label: { ...type.overline, color: role.ink3 },
  insetWrap: { width: '100%' },
  inset: { marginLeft: 56, width: undefined, alignSelf: 'stretch' },
  vRow: { flexDirection: 'row', alignItems: 'center', gap: space.s3 },
  vLine: { width: 1, height: 18, backgroundColor: role.borderSubtle },
  vText: { ...type.bodySm, color: role.ink },
});
