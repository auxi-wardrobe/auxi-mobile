/**
 * Design System — Space & form section.
 * Spacing scale (4/8/16/24/32/48 from theme.spacing) as ink bars; radius scale
 * (theme.ds.radius xs/sm/md/lg/xl/full) as rounded cream squares; elevation
 * (theme.ds.shadow card/dialog/sheet) on sample white cards.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';
import { Caption, MONO_FAMILY, SectionHeader, SubHead } from './dsShared';

const ds = theme.ds;

const SPACING: Array<{ name: string; value: number; use: string }> = [
  { name: 'xs', value: theme.spacing.xs, use: 'tight gaps, icon nudges' },
  { name: 's', value: theme.spacing.s, use: 'icon ↔ label, chip padding' },
  { name: 'm', value: theme.spacing.m, use: 'list row, button v-padding' },
  { name: 'l', value: theme.spacing.l, use: 'dialog & sheet padding' },
  { name: 'xl', value: theme.spacing.xl, use: 'section rhythm' },
  { name: 'xxl', value: theme.spacing.xxl, use: 'large block spacing' },
];

const RADII: Array<{ name: string; value: number; label: string }> = [
  { name: 'xs', value: ds.radius.xs, label: 'checkbox' },
  { name: 'sm', value: ds.radius.sm, label: 'text btn' },
  { name: 'md', value: ds.radius.md, label: 'primary · dialog' },
  { name: 'lg', value: ds.radius.lg, label: 'secondary btn' },
  { name: 'xl', value: ds.radius.xl, label: 'sheet' },
  { name: 'full', value: ds.radius.full, label: 'pill · switch' },
];

const ELEVATIONS: Array<{ name: string; shadow: object }> = [
  { name: 'card', shadow: ds.shadow.card },
  { name: 'dialog', shadow: ds.shadow.dialog },
  { name: 'sheet', shadow: ds.shadow.sheet },
];

export const SpaceFormSection: React.FC = () => (
  <View>
    <SectionHeader
      num="03"
      title="Space & form"
      blurb="Spacing follows a 4-point rhythm. Corner radii are intentionally generous and vary by component class."
    />

    <SubHead label="Spacing scale" tag="4-point base" />
    {SPACING.map(s => (
      <View key={s.name} style={styles.tokenRow}>
        <View style={[styles.bar, { width: s.value }]} />
        <View style={styles.info}>
          <Text style={styles.tokenNm}>
            space-{s.name} · {s.value}
          </Text>
          <Text style={styles.tokenUse}>{s.use}</Text>
        </View>
      </View>
    ))}

    <SubHead label="Corner radius" tag="per component class" />
    <View style={styles.radiusStage}>
      {RADII.map(r => (
        <View key={r.name} style={styles.radiusCell}>
          <View
            style={[styles.radiusDemo, { borderRadius: Math.min(r.value, 32) }]}
          />
          <Text style={styles.radiusCaption}>
            {r.value} · {r.label}
          </Text>
        </View>
      ))}
    </View>

    <SubHead label="Elevation" tag="shadow tokens" />
    <View style={styles.elevStage}>
      {ELEVATIONS.map(e => (
        <View key={e.name} style={styles.elevCell}>
          <View style={[styles.elevDemo, e.shadow]} />
          <Caption>{e.name}</Caption>
        </View>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.l,
    paddingVertical: theme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: ds.line2,
  },
  bar: {
    height: 28,
    backgroundColor: ds.color.ink,
    borderRadius: 2,
  },
  info: {
    flex: 1,
  },
  tokenNm: {
    ...theme.typography.aliases.interSemiboldSm,
    color: ds.color.ink,
  },
  tokenUse: {
    fontFamily: MONO_FAMILY,
    fontSize: 11,
    color: ds.color.onVariant,
    marginTop: 2,
  },
  radiusStage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 28,
    backgroundColor: ds.color.surface2,
    borderRadius: ds.radius.sm,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.l,
  },
  radiusCell: {
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  radiusDemo: {
    width: 64,
    height: 64,
    backgroundColor: ds.color.cream,
    borderWidth: 1.5,
    borderColor: ds.color.ink,
  },
  radiusCaption: {
    fontFamily: MONO_FAMILY,
    fontSize: 12,
    color: ds.color.warm500,
  },
  elevStage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 34,
    backgroundColor: ds.color.surface2,
    borderRadius: ds.radius.sm,
    padding: theme.spacing.xl,
  },
  elevCell: {
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  elevDemo: {
    width: 120,
    height: 64,
    backgroundColor: ds.color.white,
    borderRadius: ds.radius.sm,
  },
});
