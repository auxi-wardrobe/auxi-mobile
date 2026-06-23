/**
 * Design System — Typography foundation (NEW showcase, Poppins-only).
 * Family card (Poppins, 4 weights) + the type scale display/h1/h2/h3/body/
 * body-sm/caption/overline read from ds-tokens.type. Mono is used ONLY for the
 * overline role (JetBrains Mono not bundled → platform fallback).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONT, MONO, role, space, type } from './ds-tokens';
import { NoteBold, NoteCard, SectionHeader, SubHead } from './dsShared';

const WEIGHTS: Array<{ name: string; family: string }> = [
  { name: 'Regular 400', family: FONT.regular },
  { name: 'Medium 500', family: FONT.medium },
  { name: 'SemiBold 600', family: FONT.semibold },
  { name: 'Bold 700', family: FONT.bold },
];

type ScaleRow = { meta: string; sample: string; style: object };

const SCALE: ScaleRow[] = [
  { meta: 'display · 40 / Bold', sample: 'See this on me', style: type.display },
  { meta: 'h1 · 32 / Bold', sample: 'The Auxi look', style: type.h1 },
  { meta: 'h2 · 24 / SemiBold', sample: 'Style direction', style: type.h2 },
  { meta: 'h3 · 20 / SemiBold', sample: 'Notification time', style: type.h3 },
  {
    meta: 'body · 16 / Regular',
    sample: 'Auxi reverts to day one. This cannot be undone.',
    style: type.body,
  },
  {
    meta: 'body-sm · 14 / Regular',
    sample: 'Weekdays · Everydays',
    style: type.bodySm,
  },
  { meta: 'caption · 12 / Regular', sample: '3 items · Stay balanced', style: type.caption },
  { meta: 'overline · 10 / mono', sample: 'STYLE DIRECTION', style: type.overline },
];

export const TypeSection: React.FC = () => (
  <View>
    <SectionHeader
      num="02"
      title="Typography"
      blurb="Poppins carries the entire UI — display through caption. The mono face is reserved for overlines / spec labels only (platform monospace fallback)."
    />

    <SubHead label="Poppins" tag="display · ui · numerics" />
    <View style={styles.famCard}>
      {WEIGHTS.map(w => (
        <View key={w.name} style={styles.weightRow}>
          <Text style={[styles.specimen, { fontFamily: w.family }]}>
            See this on me
          </Text>
          <Text style={styles.weightMeta}>{w.name}</Text>
        </View>
      ))}
    </View>

    <SubHead label="Type scale" tag="8 roles" />
    {SCALE.map(r => (
      <View key={r.meta} style={styles.scaleRow}>
        <Text style={styles.scaleMeta}>{r.meta}</Text>
        <Text style={[r.style, styles.scaleSample]}>{r.sample}</Text>
      </View>
    ))}

    <NoteCard>
      <NoteBold>Poppins-only. </NoteBold>
      Inter / Roboto are retired from the new system. Treat any other family in
      the file as exploratory, not system.
    </NoteCard>
  </View>
);

const styles = StyleSheet.create({
  famCard: { gap: space.s3 },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: space.s2,
    borderBottomWidth: 1,
    borderBottomColor: role.line,
  },
  specimen: { fontSize: 22, color: role.ink },
  weightMeta: { fontFamily: MONO, fontSize: 11, color: role.ink3 },
  scaleRow: {
    paddingVertical: space.s3,
    borderBottomWidth: 1,
    borderBottomColor: role.line,
    gap: 6,
  },
  scaleMeta: { fontFamily: MONO, fontSize: 11, color: role.ink3 },
  scaleSample: { color: role.ink },
});
