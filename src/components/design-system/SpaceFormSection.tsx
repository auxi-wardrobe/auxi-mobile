/**
 * Design System — Space, Radius, Elevation & Icons foundation (NEW showcase).
 * 4-pt spacing scale · the new radius scale (xs4 → 4xl32 + full) · elevation
 * shadow tokens · icon size set (L32 / M24 / S16). Values from m-tokens.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icons } from '../../assets/icons';

const IconSparkle = Icons.Sparkle;
import { color, icon, MONO, radius, role, shadow, space } from './m-tokens';
import { Caption, SectionHeader, SubHead } from './mShared';

const SPACING: Array<{ name: string; value: number }> = [
  { name: 's1', value: space.s1 },
  { name: 's2', value: space.s2 },
  { name: 's3', value: space.s3 },
  { name: 's4', value: space.s4 },
  { name: 's5', value: space.s5 },
  { name: 's6', value: space.s6 },
  { name: 's8', value: space.s8 },
  { name: 's10', value: space.s10 },
  { name: 's12', value: space.s12 },
];

const RADII: Array<{ name: string; value: number }> = [
  { name: 'xs', value: radius.xs },
  { name: 'sm', value: radius.sm },
  { name: 'md', value: radius.md },
  { name: 'lg', value: radius.lg },
  { name: 'xl', value: radius.xl },
  { name: '2xl', value: radius['2xl'] },
  { name: '3xl', value: radius['3xl'] },
  { name: '4xl', value: radius['4xl'] },
];

const ELEVATIONS: Array<{ name: string; sh: object }> = [
  { name: 'card', sh: shadow.card },
  { name: 'raised', sh: shadow.raised },
  { name: 'dialog', sh: shadow.dialog },
  { name: 'sheet', sh: shadow.sheet },
];

const ICONS: Array<{ name: string; size: number; stroke: string }> = [
  { name: 'L', size: icon.L, stroke: '2.0' },
  { name: 'M', size: icon.M, stroke: '1.5' },
  { name: 'S', size: icon.S, stroke: '1.3' },
];

export const SpaceFormSection: React.FC = () => (
  <View>
    <SectionHeader
      num="03"
      title="Space, radius & form"
      blurb="A 4-point spacing rhythm. The new radius scale runs xs(4) → 4xl(32) plus full pill. Elevation is four soft shadow tiers."
    />

    <SubHead label="Spacing" tag="4-point base" />
    {SPACING.map(s => (
      <View key={s.name} style={styles.tokenRow}>
        <View style={[styles.bar, { width: s.value }]} />
        <Text style={styles.tokenNm}>
          {s.name} · {s.value}
        </Text>
      </View>
    ))}

    <SubHead label="Radius" tag="xs4 → 4xl32 · full" />
    <View style={styles.radiusStage}>
      {RADII.map(r => (
        <View key={r.name} style={styles.radiusCell}>
          <View style={[styles.radiusDemo, { borderRadius: r.value }]} />
          <Text style={styles.radiusCaption}>
            {r.name} · {r.value}
          </Text>
        </View>
      ))}
      <View style={styles.radiusCell}>
        <View style={[styles.radiusDemoPill]} />
        <Text style={styles.radiusCaption}>full · 999</Text>
      </View>
    </View>

    <SubHead label="Elevation" tag="shadow tiers" />
    <View style={styles.elevStage}>
      {ELEVATIONS.map(e => (
        <View key={e.name} style={styles.elevCell}>
          <View style={[styles.elevDemo, e.sh]} />
          <Caption>{e.name}</Caption>
        </View>
      ))}
    </View>

    <SubHead label="Icons" tag="L32 · M24 · S16" />
    <View style={styles.iconStage}>
      {ICONS.map(i => (
        <View key={i.name} style={styles.iconCell}>
          <IconSparkle width={i.size} height={i.size} color={role.ink} />
          <Text style={styles.iconCaption}>
            {i.name} · {i.size} · stroke {i.stroke}
          </Text>
        </View>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s4,
    paddingVertical: space.s2,
    borderBottomWidth: 1,
    borderBottomColor: role.line,
  },
  bar: { height: 24, backgroundColor: role.ink, borderRadius: 2 },
  tokenNm: { fontFamily: MONO, fontSize: 12, color: role.ink2 },
  radiusStage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 22,
    backgroundColor: role.surface2,
    borderRadius: radius.md,
    paddingVertical: space.s6,
    paddingHorizontal: space.s5,
  },
  radiusCell: { alignItems: 'center', gap: 6 },
  radiusDemo: {
    width: 56,
    height: 56,
    backgroundColor: role.surfaceCream,
    borderWidth: 1.5,
    borderColor: role.ink,
  },
  radiusDemoPill: {
    width: 72,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: role.surfaceCream,
    borderWidth: 1.5,
    borderColor: role.ink,
  },
  radiusCaption: { fontFamily: MONO, fontSize: 11, color: role.ink3 },
  elevStage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 28,
    backgroundColor: role.surface2,
    borderRadius: radius.md,
    padding: space.s6,
  },
  elevCell: { alignItems: 'center', gap: space.s2 },
  elevDemo: {
    width: 110,
    height: 56,
    backgroundColor: color.white,
    borderRadius: radius.md,
  },
  iconStage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 28,
    alignItems: 'flex-end',
  },
  iconCell: { alignItems: 'center', gap: 8 },
  iconCaption: { fontFamily: MONO, fontSize: 10.5, color: role.ink3 },
});
