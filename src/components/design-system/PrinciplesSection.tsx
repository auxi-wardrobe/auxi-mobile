/**
 * Design System — Principles & notes (NEW showcase).
 * Short note cards on how the new system behaves + the page-local-token caveat.
 */
import React from 'react';
import { View } from 'react-native';
import { NoteBold, NoteCard, SectionHeader, SubHead } from './dsShared';

export const PrinciplesSection: React.FC = () => (
  <View>
    <SectionHeader
      num="05"
      title="Principles & notes"
      blurb="How the new system wants to behave — and the honest caveats while it is page-local."
    />

    <SubHead label="Principles" tag="warm · calm · deliberate" />
    <NoteCard>
      <NoteBold>One family. </NoteBold>
      Poppins across the whole UI. The mono face is reserved for overlines / spec
      labels (it is a platform monospace fallback, not bundled JetBrains Mono).
    </NoteCard>
    <NoteCard>
      <NoteBold>Generous radius. </NoteBold>
      The new scale runs xs(4) → 4xl(32) plus a full pill. Buttons use 2xl/xl/lg
      by size; dialogs and sheets use 3xl.
    </NoteCard>
    <NoteCard>
      <NoteBold>Motion has tokens. </NoteBold>
      Every interaction maps to motion.ts (durations, springs, easing) and falls
      back cleanly under Reduce Motion. See section C.
    </NoteCard>

    <SubHead label="Caveats" tag="before product migration" />
    <NoteCard flag>
      <NoteBold>Page-local tokens. </NoteBold>
      These ramps + radii diverge from the live theme.ts on purpose. Product
      screens still read theme.ds.*; migrating them is a separate, later task.
    </NoteCard>
  </View>
);
