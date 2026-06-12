/**
 * Shared building blocks for the in-app Design System reference screen.
 * __DEV__-gated catalog — faithful RN recreation of `Auxi Design System.html`.
 * All styling reads from `theme.ds` / `theme.typography.aliases`; no hex/font
 * literals (token-lint clean). Mono role uses a platform monospace fallback
 * (JetBrains Mono is not bundled).
 */
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';

const ds = theme.ds;

// JetBrains Mono is NOT bundled — fall back to the platform monospace face.
export const MONO_FAMILY = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
}) as string;

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

/**
 * Spec list (the right-hand "Spec" panel from the HTML), rendered as a
 * stacked dt/dd grid: muted term on the left, mono value on the right.
 */
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

const styles = StyleSheet.create({
  secHead: {
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.l,
  },
  secNum: {
    fontFamily: MONO_FAMILY,
    fontSize: 12,
    color: ds.color.warm500,
    letterSpacing: 0.5,
  },
  secTitle: {
    ...theme.typography.aliases.uacH4Bold,
    color: ds.color.ink,
    marginTop: theme.spacing.s,
  },
  secBlurb: {
    ...theme.typography.aliases.interBodySm,
    color: ds.color.onVariant,
    marginTop: theme.spacing.s,
  },
  subHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.s,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.m,
    flexWrap: 'wrap',
  },
  subLabel: {
    ...theme.typography.aliases.poppinsButton,
    color: ds.color.ink,
  },
  subTag: {
    fontFamily: MONO_FAMILY,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: ds.color.warm500,
  },
  caption: {
    fontFamily: MONO_FAMILY,
    fontSize: 12,
    color: ds.color.warm500,
    letterSpacing: 0.2,
    marginBottom: theme.spacing.s,
  },
  note: {
    backgroundColor: ds.color.cream,
    borderWidth: 1,
    borderColor: ds.line,
    borderLeftWidth: 3,
    borderLeftColor: ds.color.tanStroke,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginVertical: theme.spacing.m,
  },
  noteFlag: {
    borderLeftColor: ds.color.danger,
  },
  noteText: {
    ...theme.typography.aliases.interBodySm,
    color: ds.color.onVariant,
  },
  noteBold: {
    ...theme.typography.aliases.interMediumSm,
    color: ds.color.ink,
  },
  specs: {
    backgroundColor: ds.color.white,
    borderTopWidth: 1,
    borderTopColor: ds.line,
    padding: theme.spacing.l,
  },
  specsTitle: {
    fontFamily: MONO_FAMILY,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: ds.color.warm500,
    marginBottom: theme.spacing.m,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 4,
  },
  specDt: {
    ...theme.typography.aliases.interBodySm,
    color: ds.color.warm500,
  },
  specDd: {
    fontFamily: MONO_FAMILY,
    fontSize: 11.5,
    color: ds.color.ink,
    textAlign: 'right',
  },
});
