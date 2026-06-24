/**
 * Design System — Color foundation (NEW claude.ai ramps).
 * Six functional ramps (Primary/Neutral/Success/Danger/Warning/Info) shown as
 * stepped swatch rows + the semantic role mapping. Values read from m-tokens.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, MONO, radius, role, space, type } from './m-tokens';
import { NoteBold, NoteCard, SectionHeader, SubHead } from './mShared';

type Step = { label: string; value: string };
type Ramp = { name: string; tag: string; steps: Step[] };

const RAMPS: Ramp[] = [
  {
    name: 'Primary',
    tag: 'warm sand / taupe',
    steps: [
      { label: '50', value: color.p50 },
      { label: '100', value: color.p100 },
      { label: '200', value: color.p200 },
      { label: '300', value: color.p300 },
      { label: '400', value: color.p400 },
      { label: '500', value: color.p500 },
      { label: '600', value: color.p600 },
      { label: '700', value: color.p700 },
    ],
  },
  {
    name: 'Neutral',
    tag: 'cool gray',
    steps: [
      { label: '50', value: color.n50 },
      { label: '100', value: color.n100 },
      { label: '200', value: color.n200 },
      { label: '300', value: color.n300 },
      { label: '400', value: color.n400 },
      { label: '500', value: color.n500 },
      { label: '600', value: color.n600 },
      { label: '700', value: color.n700 },
      { label: '800', value: color.n800 },
      { label: '900', value: color.n900 },
    ],
  },
  {
    name: 'Success',
    tag: 'teal / green',
    steps: [
      { label: '100', value: color.su100 },
      { label: '200', value: color.su200 },
      { label: '400', value: color.su400 },
      { label: '500', value: color.su500 },
    ],
  },
  {
    name: 'Danger',
    tag: 'destructive',
    steps: [
      { label: '50', value: color.da50 },
      { label: '100', value: color.da100 },
      { label: '200', value: color.da200 },
      { label: '300', value: color.da300 },
      { label: '400', value: color.da400 },
      { label: '500', value: color.da500 },
      { label: '600', value: color.da600 },
    ],
  },
  {
    name: 'Warning',
    tag: 'caution',
    steps: [
      { label: '50', value: color.wa50 },
      { label: '100', value: color.wa100 },
      { label: '400', value: color.wa400 },
      { label: '500', value: color.wa500 },
    ],
  },
  {
    name: 'Info',
    tag: 'informational',
    steps: [
      { label: '50', value: color.in50 },
      { label: '100', value: color.in100 },
      { label: '200', value: color.in200 },
      { label: '300', value: color.in300 },
      { label: '400', value: color.in400 },
      { label: '500', value: color.in500 },
    ],
  },
];

const ROLES: Array<[string, string]> = [
  ['ink', color.n800],
  ['ink-2', color.n600],
  ['ink-3', color.n500],
  ['surface', color.white],
  ['surface-2', color.n50],
  ['surface-cream', color.p50],
  ['line', color.n200],
  ['line-cream', color.p100],
];

const RampRow: React.FC<{ ramp: Ramp }> = ({ ramp }) => (
  <View style={styles.rampBlock}>
    <View style={styles.rampHead}>
      <Text style={styles.rampName}>{ramp.name}</Text>
      <Text style={styles.rampTag}>{ramp.tag}</Text>
    </View>
    <View style={styles.rampRow}>
      {ramp.steps.map(s => (
        <View
          key={s.label}
          style={styles.step}
          testID={`ds-color-${ramp.name.toLowerCase()}-${s.label}`}
        >
          <View style={[styles.swatch, { backgroundColor: s.value }]} />
          <Text style={styles.stepLbl}>{s.label}</Text>
        </View>
      ))}
    </View>
  </View>
);

export const ColorSection: React.FC = () => (
  <View>
    <SectionHeader
      num="01"
      title="Color"
      blurb="Warm, paper-toned primary does the heavy lifting; cool neutrals carry chrome. Functional ramps (success / danger / warning / info) are used sparingly for state."
    />

    <SubHead label="Ramps" tag="6 functional families" />
    {RAMPS.map(r => (
      <RampRow key={r.name} ramp={r} />
    ))}

    <SubHead label="Semantic roles" tag="text · surface · line" />
    <View style={styles.roleGrid}>
      {ROLES.map(([name, value]) => (
        <View key={name} style={styles.roleCell}>
          <View
            style={[
              styles.roleChip,
              { backgroundColor: value },
              value === color.white && styles.roleChipBordered,
            ]}
          />
          <Text style={styles.roleName}>{name}</Text>
          <Text style={styles.roleHex}>{value.toUpperCase()}</Text>
        </View>
      ))}
    </View>

    <NoteCard>
      <NoteBold>Diverges from theme.ts. </NoteBold>
      These ramps are the new target system, page-local for now. Product screens
      still read the live `theme.ds.*`; migration is a separate task.
    </NoteCard>
  </View>
);

const styles = StyleSheet.create({
  rampBlock: { marginBottom: space.s4 },
  rampHead: { flexDirection: 'row', alignItems: 'baseline', gap: space.s2 },
  rampName: { ...type.bodySm, fontFamily: type.h3.fontFamily, color: role.ink },
  rampTag: { ...type.overline, color: role.ink3 },
  rampRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  step: { alignItems: 'center', gap: 3 },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: role.line,
  },
  stepLbl: { fontFamily: MONO, fontSize: 9.5, color: role.ink3 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  roleCell: { width: 150 },
  roleChip: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: role.line,
  },
  roleChipBordered: { borderColor: role.line },
  roleName: { ...type.bodySm, color: role.ink, marginTop: 5 },
  roleHex: { fontFamily: MONO, fontSize: 10.5, color: role.ink3, marginTop: 1 },
});
