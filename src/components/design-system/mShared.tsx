/**
 * Shared building blocks for the in-app Design System reference screen.
 * Rebuilt on m-tokens.ts (NEW claude.ai showcase). Inter-only typography;
 * mono role uses a platform monospace fallback (JetBrains Mono not bundled),
 * for spec overlines only.
 *
 * These tokens diverge from theme.ts on purpose (DS page = new target). See
 * m-tokens.ts header.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, MONO, radius, role, space, type } from './m-tokens';

// Back-compat re-export: older sections import MONO_FAMILY from here.
export const MONO_FAMILY = MONO;

/** Section header: number + title + optional blurb. */
export const SectionHeader: React.FC<{
  num: string;
  title: string;
  blurb?: string;
}> = ({ num, title, blurb }) => (
  <View style={styles.secHead}>
    <Text style={styles.secNum}>{num}</Text>
    <Text style={styles.secTitle}>{title}</Text>
    {!!blurb && <Text style={styles.secBlurb}>{blurb}</Text>}
  </View>
);

/** Sub-group heading inside a section (e.g. "Ink & neutrals"). */
export const SubHead: React.FC<{ label: string; tag?: string }> = ({
  label,
  tag,
}) => (
  <View style={styles.subHead}>
    <Text style={styles.subLabel}>{label}</Text>
    {!!tag && <Text style={styles.subTag}>{tag}</Text>}
  </View>
);

/** Small mono caption used above specimens. */
export const Caption: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <Text style={styles.caption}>{children}</Text>;

/** Note card — warm cream surface, left accent border. `flag` = danger accent. */
export const NoteCard: React.FC<{
  children: React.ReactNode;
  flag?: boolean;
}> = ({ children, flag }) => (
  <View style={[styles.note, flag && styles.noteFlag]}>
    <Text style={styles.noteText}>{children}</Text>
  </View>
);

/** Bold inline emphasis inside a NoteCard. */
export const NoteBold: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <Text style={styles.noteBold}>{children}</Text>;

/** Spec panel: muted term left, mono value right. */
export const SpecList: React.FC<{
  title?: string;
  rows: Array<[string, string]>;
}> = ({ title = 'Spec', rows }) => (
  <View style={styles.specs}>
    <Text style={styles.specsTitle}>{title}</Text>
    {rows.map(([dt, dd]) => (
      <View key={dt} style={styles.specRow}>
        <Text style={styles.specDt}>{dt}</Text>
        <Text style={styles.specDd}>{dd}</Text>
      </View>
    ))}
  </View>
);

/** A framed demo stage — cream / plain(surface2) / dark backdrop. */
export const Stage: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'plain' | 'dark';
  column?: boolean;
}> = ({ children, variant = 'default', column }) => (
  <View
    style={[
      styles.stage,
      variant === 'plain' && styles.stagePlain,
      variant === 'dark' && styles.stageDark,
      column && styles.stageCol,
    ]}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  secHead: { marginTop: space.s12, marginBottom: space.s6 },
  secNum: { ...type.overline, color: role.ink3, letterSpacing: 1 },
  secTitle: { ...type.h2, color: role.ink, marginTop: space.s2 },
  secBlurb: { ...type.bodySm, color: role.ink2, marginTop: space.s2 },
  subHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.s2,
    marginTop: space.s8,
    marginBottom: space.s4,
    flexWrap: 'wrap',
  },
  subLabel: { ...type.h3, color: role.ink },
  subTag: { ...type.overline, color: role.ink3 },
  caption: { ...type.overline, color: role.ink3, marginBottom: space.s2 },
  note: {
    backgroundColor: role.surfaceCream,
    borderWidth: 1,
    borderColor: role.lineCream,
    borderLeftWidth: 3,
    borderLeftColor: color.p300,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginVertical: space.s4,
  },
  noteFlag: { borderLeftColor: color.da400 },
  noteText: { ...type.bodySm, color: role.ink2 },
  noteBold: { ...type.bodySm, fontFamily: type.h3.fontFamily, color: role.ink },
  specs: {
    backgroundColor: role.surface,
    borderTopWidth: 1,
    borderTopColor: role.line,
    paddingVertical: space.s4,
  },
  specsTitle: { ...type.overline, color: role.ink3, marginBottom: space.s3 },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 4,
  },
  specDt: { ...type.bodySm, color: role.ink3 },
  specDd: {
    fontFamily: MONO,
    fontSize: 11.5,
    color: role.ink,
    textAlign: 'right',
  },
  stage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: role.surfaceCream,
    borderWidth: 1,
    borderColor: role.lineCream,
    borderRadius: radius['2xl'],
    padding: space.s6,
    marginBottom: space.s4,
    minHeight: 120,
  },
  stagePlain: { backgroundColor: role.surface2, borderColor: role.line },
  stageDark: { backgroundColor: color.n800, borderColor: color.n700 },
  stageCol: { flexDirection: 'column', alignItems: 'stretch' },
});
