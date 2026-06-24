/**
 * Design System — Typography foundation (NEW showcase, Poppins-only).
 * Family card (Poppins, 4 weights) + the type scale display/h1/h2/h3/body/
 * body-sm/caption/overline read from m-tokens.type. Mono is used ONLY for the
 * overline role (JetBrains Mono not bundled → platform fallback).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONT, MONO, role, space, type } from './m-tokens';
import { MText, type MTextVariant } from './lib';
import { NoteBold, NoteCard, SectionHeader, SubHead } from './mShared';

const WEIGHTS: Array<{ name: string; family: string }> = [
  { name: 'Regular 400', family: FONT.regular },
  { name: 'Medium 500', family: FONT.medium },
  { name: 'SemiBold 600', family: FONT.semibold },
  { name: 'Bold 700', family: FONT.bold },
];

// Component specimen: render every variant through the MText primitive itself
// (single import → render), proving the wrapper, next to the raw-token scale.
const MTEXT_DEMO: Array<{ variant: MTextVariant; sample: string }> = [
  { variant: 'display', sample: 'See this on me' },
  { variant: 'h1', sample: 'The Auxi look' },
  { variant: 'h2', sample: 'Style direction' },
  { variant: 'h3', sample: 'Notification time' },
  { variant: 'body', sample: 'Auxi reverts to day one.' },
  { variant: 'bodySm', sample: 'Weekdays · Everydays' },
  { variant: 'caption', sample: '3 items · Stay balanced' },
  { variant: 'overline', sample: 'STYLE DIRECTION' },
];

type ScaleRow = { meta: string; sample: string; style: object };

const SCALE: ScaleRow[] = [
  {
    meta: 'display · 40 / Bold',
    sample: 'See this on me',
    style: type.display,
  },
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
  {
    meta: 'caption · 12 / Regular',
    sample: '3 items · Stay balanced',
    style: type.caption,
  },
  {
    meta: 'overline · 10 / mono',
    sample: 'STYLE DIRECTION',
    style: type.overline,
  },
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

    <SubHead label="MText" tag="component · 1 import" />
    <View style={styles.mtextCard}>
      {MTEXT_DEMO.map(d => (
        <View key={d.variant} style={styles.mtextRow}>
          <MText variant="caption" color="ink3" style={styles.mtextMeta}>
            {`variant="${d.variant}"`}
          </MText>
          <MText variant={d.variant}>{d.sample}</MText>
        </View>
      ))}
    </View>

    <NoteCard>
      <NoteBold>MText wraps the scale above. </NoteBold>
      One import (no separate token import):
      {' <MText variant="body">…</MText>'}. It consumes m-tokens `type.*` —
      tokens stay the source of truth; the component is the ergonomic façade.
    </NoteCard>

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
  mtextCard: { gap: space.s3 },
  mtextRow: {
    paddingVertical: space.s3,
    borderBottomWidth: 1,
    borderBottomColor: role.line,
    gap: 6,
  },
  mtextMeta: { fontFamily: MONO },
});
