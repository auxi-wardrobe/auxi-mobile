/**
 * MDivider — self-contained hairline / labelled / inset divider.
 *
 *   import { MDivider } from '../components/design-system/lib';
 *   <MDivider />                 // plain hairline
 *   <MDivider label="OR" />      // mono overline between two rules
 *   <MDivider inset={56} />      // left-inset hairline
 *
 * Tokens encapsulated INSIDE.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { role, space, type } from '../m-tokens';

export interface MDividerProps {
  /** centred mono overline between two flex rules */
  label?: string;
  /** left inset in px (hairline only) */
  inset?: number;
  testID?: string;
}

export const MDivider: React.FC<MDividerProps> = ({
  label,
  inset,
  testID,
}) => {
  if (label) {
    return (
      <View style={styles.labelled} testID={testID}>
        <View style={styles.flexLine} />
        <Text style={styles.label}>{label}</Text>
        <View style={styles.flexLine} />
      </View>
    );
  }
  return (
    <View
      style={[styles.hr, inset ? [styles.inset, { marginLeft: inset }] : null]}
      testID={testID}
    />
  );
};

const styles = StyleSheet.create({
  hr: { height: 1, backgroundColor: role.borderSubtle, width: '100%' },
  inset: { width: undefined, alignSelf: 'stretch' },
  labelled: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  flexLine: { flex: 1, height: 1, backgroundColor: role.borderSubtle },
  label: { ...type.overline, color: role.ink3 },
});
