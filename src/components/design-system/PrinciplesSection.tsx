/**
 * Design System — Principles & gaps (brief).
 * A couple of note cards summarising the DS's flagged inconsistencies.
 */
import React from 'react';
import { View } from 'react-native';
import { NoteBold, NoteCard, SectionHeader, SubHead } from './dsShared';

export const PrinciplesSection: React.FC = () => (
  <View>
    <SectionHeader
      num="06"
      title="Principles & gaps"
      blurb="How the system wants to behave — and the honest list of where it currently doesn't."
    />

    <SubHead label="Known inconsistencies" tag="consolidate before scale" />
    <NoteCard flag>
      <NoteBold>Switch palette. </NoteBold>
      Un-themed Material purple shipped under teal overrides — now resolved on
      teal #16A085.
    </NoteCard>
    <NoteCard flag>
      <NoteBold>Radius drift. </NoteBold>
      Primary 16 vs secondary 17 vs text 12 vs sheet 18 — pick one button
      radius.
    </NoteCard>
    <NoteCard flag>
      <NoteBold>Type sprawl. </NoteBold>
      43 text styles across the file; the shippable system is only Poppins /
      Roboto / Inter.
    </NoteCard>
  </View>
);
