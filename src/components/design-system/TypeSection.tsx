/**
 * Design System — Typography section.
 * Family roles (display=Poppins, ui=Roboto, uiAlt=Inter) as live specimens
 * rendered with BUNDLED faces only, plus the UI size scale (h1..caption from
 * theme.typography.sizes). Mono role falls back to platform monospace
 * (JetBrains Mono is not bundled) and is labelled as such.
 *
 * Specimens reuse `theme.typography.aliases.*` so every fontFamily resolves to
 * a face that ships in src/assets/fonts/. Roboto ships Regular only, so the
 * Roboto specimen renders Regular weight.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';
import {
  MONO_FAMILY,
  NoteBold,
  NoteCard,
  SectionHeader,
  SubHead,
} from './dsShared';

const ds = theme.ds;
const sizes = theme.typography.sizes;

type Family = {
  name: string;
  weights: string;
  role: string;
  specimen: string;
  specimenStyle: object;
};

const FAMILIES: Family[] = [
  {
    name: 'Poppins',
    weights: '400 · 500 · 600 · 700',
    role: 'Display, marketing & large numerics',
    specimen: 'See this on me',
    specimenStyle: {
      ...theme.typography.aliases.uacH4Bold,
      color: ds.color.ink,
    },
  },
  {
    name: 'Roboto',
    weights: '400 (Regular bundled)',
    role: 'Button labels & UI (MD3 base)',
    specimen: 'Generate my look',
    specimenStyle: {
      ...theme.typography.aliases.uacM3BodyLarge,
      fontFamily: theme.typography.aliases.uacM3BodySmall.fontFamily, // Roboto-Regular
      fontSize: 24,
      lineHeight: 32,
      color: ds.color.ink,
    },
  },
  {
    name: 'Inter',
    weights: '400 · 500 · 600',
    role: 'Dense UI, captions, text buttons',
    specimen: 'Manage body photo',
    specimenStyle: {
      ...theme.typography.aliases.uacBodyMdSemibold,
      fontSize: 24,
      lineHeight: 32,
      color: ds.color.ink,
    },
  },
];

type ScaleRow = { meta: string; sample: string; style: object };

const SCALE: ScaleRow[] = [
  {
    meta: `h1 · Poppins ${sizes.h1}`,
    sample: 'Notification',
    style: {
      ...theme.typography.aliases.uacH4Bold,
      fontSize: sizes.h1,
      lineHeight: sizes.h1 + 8,
      color: ds.color.ink,
    },
  },
  {
    meta: `h2 · Poppins ${sizes.h2}`,
    sample: 'Style direction',
    style: {
      ...theme.typography.aliases.poppinsH4SemiBold,
      fontSize: sizes.h2,
      lineHeight: sizes.h2 + 8,
      color: ds.color.ink,
    },
  },
  {
    meta: `h3 · Inter ${sizes.h3}`,
    sample: 'Notification time',
    style: {
      ...theme.typography.aliases.uacBodyMdSemibold,
      fontSize: sizes.h3,
      lineHeight: sizes.h3 + 6,
      color: ds.color.ink,
    },
  },
  {
    meta: `body · Inter ${sizes.body}`,
    sample: 'Auxi will revert to day one. This cannot be undone.',
    style: {
      ...theme.typography.aliases.interBodyMd,
      color: ds.color.onVariant,
    },
  },
  {
    meta: `caption · Inter ${sizes.caption}`,
    sample: 'Weekdays · Everydays',
    style: {
      ...theme.typography.aliases.uacBodyXsMedium,
      color: ds.color.warm500,
    },
  },
  {
    meta: 'overline · JetBrains Mono (falls back)',
    sample: 'STYLE DIRECTION',
    style: {
      fontFamily: MONO_FAMILY,
      fontSize: 10,
      letterSpacing: 1,
      color: ds.color.warm500,
    },
  },
];

export const TypeSection: React.FC = () => (
  <View>
    <SectionHeader
      num="02"
      title="Typography"
      blurb="A humanist display face paired with a Material UI scale. The consolidated, shippable set is Poppins / Roboto / Inter."
    />

    <SubHead label="Type families" tag="in production" />
    {FAMILIES.map(f => (
      <View key={f.name} style={styles.fam}>
        <View style={styles.famLbl}>
          <Text style={styles.famNm}>{f.name}</Text>
          <Text style={styles.famMeta}>{f.weights}</Text>
          <Text style={styles.famRole}>{f.role}</Text>
        </View>
        <Text style={f.specimenStyle}>{f.specimen}</Text>
      </View>
    ))}

    <SubHead label="UI type scale" tag="Inter / Poppins" />
    {SCALE.map(row => (
      <View key={row.meta} style={styles.scaleRow}>
        <Text style={styles.scaleMeta}>{row.meta}</Text>
        <Text style={row.style}>{row.sample}</Text>
      </View>
    ))}

    <NoteCard flag>
      <NoteBold>Type sprawl. </NoteBold>
      43 text styles across the file (Manrope, DM Sans, Archivo Narrow, Playfair
      & more in moodboards). Treat anything outside Poppins / Roboto / Inter as
      exploratory, not system.
    </NoteCard>
  </View>
);

const styles = StyleSheet.create({
  fam: {
    paddingVertical: theme.spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: ds.line2,
    gap: theme.spacing.s,
  },
  famLbl: {
    gap: 2,
  },
  famNm: {
    ...theme.typography.aliases.interSemiboldSm,
    color: ds.color.ink,
  },
  famMeta: {
    fontFamily: MONO_FAMILY,
    fontSize: 10.5,
    color: ds.color.warm500,
  },
  famRole: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: ds.color.onVariant,
  },
  scaleRow: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: ds.line2,
    gap: 6,
  },
  scaleMeta: {
    fontFamily: MONO_FAMILY,
    fontSize: 11,
    color: ds.color.warm500,
  },
});
