/**
 * Design System — Color section.
 * Grouped swatch grids (Ink & neutrals · Surfaces · Functional accents).
 * Each swatch shows the color block, token name, the hex (READ FROM the same
 * token so no literal hex appears here), and the `use` note from auxi-ds.css.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';
import {
  MONO_FAMILY,
  NoteBold,
  NoteCard,
  SectionHeader,
  SubHead,
} from './dsShared';

const ds = theme.ds;

type Swatch = {
  name: string;
  /** color value, used BOTH as the block bg AND printed as the caption */
  value: string;
  use: string;
  /** subtle inset border for near-white blocks so they read on white */
  bordered?: boolean;
};

const INK: Swatch[] = [
  { name: 'Ink', value: ds.color.ink, use: 'Primary text · primary button' },
  { name: 'Slate', value: ds.color.slate, use: 'Deep surfaces · scrims' },
  { name: 'Black', value: ds.color.black, use: 'Control fills (radio)' },
  {
    name: 'On-variant',
    value: ds.color.onVariant,
    use: 'Secondary text (MD3)',
  },
  { name: 'Warm 700', value: ds.color.warm700, use: 'Strokes · warm gray' },
  { name: 'Warm 500', value: ds.color.warm500, use: 'Muted labels · hints' },
];

const SURFACES: Swatch[] = [
  { name: 'White', value: ds.color.white, use: 'App canvas', bordered: true },
  {
    name: 'Surface',
    value: ds.color.surface,
    use: 'Dialogs · sheets',
    bordered: true,
  },
  {
    name: 'Surface 2',
    value: ds.color.surface2,
    use: 'Subtle fills',
    bordered: true,
  },
  { name: 'Cream', value: ds.color.cream, use: 'Primary warm surface · cards' },
  { name: 'Warm 100', value: ds.color.warm100, use: 'Dividers · hairlines' },
  { name: 'Tan', value: ds.color.tan, use: 'Warm accent surface' },
  { name: 'Tan stroke', value: ds.color.tanStroke, use: 'Borders on tan' },
  {
    name: 'Placeholder',
    value: ds.color.placeholder,
    use: 'Image placeholders',
  },
];

const ACCENTS: Swatch[] = [
  { name: 'Teal', value: ds.color.teal, use: 'Switch active · success' },
  { name: 'Green', value: ds.color.green, use: 'Selected radio · confirm' },
  { name: 'Danger', value: ds.color.danger, use: 'Destructive actions' },
];

const SwatchCell: React.FC<{ swatch: Swatch }> = ({ swatch }) => (
  <Pressable
    style={styles.swatch}
    testID={`ds-color-swatch-${swatch.name.toLowerCase().replace(/\s+/g, '-')}`}
    accessibilityLabel={`${swatch.name} ${swatch.value}`}
  >
    <View
      style={[
        styles.chip,
        { backgroundColor: swatch.value },
        swatch.bordered && styles.chipBordered,
      ]}
    />
    <View style={styles.body}>
      <Text style={styles.nm}>{swatch.name}</Text>
      <Text style={styles.hex}>{swatch.value.toUpperCase()}</Text>
      <Text style={styles.use}>{swatch.use}</Text>
    </View>
  </Pressable>
);

const Grid: React.FC<{ items: Swatch[] }> = ({ items }) => (
  <View style={styles.grid}>
    {items.map(s => (
      <SwatchCell key={s.name} swatch={s} />
    ))}
  </View>
);

export const ColorSection: React.FC = () => (
  <View>
    <SectionHeader
      num="01"
      title="Color"
      blurb="A warm, paper-toned neutral palette does the heavy lifting; ink near-black carries text and primary actions. Functional accents are used sparingly."
    />

    <SubHead label="Ink & neutrals" tag="text · actions · strokes" />
    <Grid items={INK} />

    <SubHead label="Surfaces — warm paper" tag="backgrounds · cards · sheets" />
    <Grid items={SURFACES} />

    <SubHead label="Functional accents" tag="state · feedback" />
    <Grid items={ACCENTS} />

    <NoteCard flag>
      <NoteBold>Documented inconsistency. </NoteBold>
      The base switch shipped as un-themed Material purple while the app
      overrides toggles to teal #16A085 — now resolved to teal. Destructive
      color drifts between raw #FF0000 and the applied #BB251A; standardise on
      #BB251A.
    </NoteCard>
  </View>
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  swatch: {
    width: 150,
    borderWidth: 1,
    borderColor: ds.line,
    borderRadius: ds.radius.sm,
    overflow: 'hidden',
    backgroundColor: ds.color.white,
  },
  chip: {
    height: 72,
  },
  chipBordered: {
    borderBottomWidth: 1,
    borderBottomColor: ds.line2,
  },
  body: {
    paddingHorizontal: 13,
    paddingTop: 11,
    paddingBottom: 13,
  },
  nm: {
    ...theme.typography.aliases.interSemiboldSm,
    color: ds.color.ink,
  },
  hex: {
    fontFamily: MONO_FAMILY,
    fontSize: 11,
    color: ds.color.onVariant,
    marginTop: 3,
  },
  use: {
    ...theme.typography.aliases.interCaptionXxs,
    color: ds.color.warm500,
    marginTop: 5,
  },
});
