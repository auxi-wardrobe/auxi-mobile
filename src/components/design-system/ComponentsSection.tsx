/**
 * Design System — Components section.
 * Composes the button, control, and surface demos into the catalog stages,
 * each wrapped with a Caption + SpecList mirroring the auxi-ds.css "specimen".
 * Showcases the REAL SettingsSwitch (DS canonical teal-ON track).
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';
import { SettingsSwitch } from '../settings/SettingsSwitch';
import { Caption, SectionHeader, SpecList, SubHead } from './dsShared';
import {
  DsIconButton,
  DsPrimaryButton,
  DsSecondaryButton,
  DsTextButton,
} from './DsButtons';
import {
  DsCheckboxGroup,
  DsChips,
  DsRadioGroup,
  DsSegmented,
} from './DsControls';
import {
  DsActionSheet,
  DsBadges,
  DsDarkMenu,
  DsDialog,
  DsField,
  DsListRows,
  DsStatusPills,
  DsTile,
  DsTimePicker,
} from './DsSurfaces';

const ds = theme.ds;

/** A framed stage with an optional grid/dark/plain backdrop. */
const Stage: React.FC<{
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

export const ComponentsSection: React.FC = () => {
  const [notify, setNotify] = useState(true);

  return (
    <View>
      <SectionHeader
        num="05"
        title="Components"
        blurb="Faithful recreations on the DS specs — buttons, selection controls, rows, overlays, cards, inputs and pills."
      />

      {/* Buttons */}
      <SubHead label="Buttons" tag="primary · secondary · text" />
      <Caption>Primary · Secondary · Text</Caption>
      <Stage column>
        <DsPrimaryButton label="Generate my look" testID="ds-button-primary" />
        <DsSecondaryButton
          label="Upload another photo"
          testID="ds-button-secondary"
        />
        <View style={styles.textBtnRow}>
          <DsTextButton label="Cancel" testID="ds-button-text-cancel" />
          <DsTextButton label="Update" testID="ds-button-text-update" />
        </View>
      </Stage>
      <Caption>States · enabled · pressed · disabled · icon</Caption>
      <Stage>
        <DsPrimaryButton label="Enabled" testID="ds-button-enabled" />
        <DsPrimaryButton
          label="Disabled"
          disabled
          testID="ds-button-disabled"
        />
        <DsIconButton
          icon="plus"
          testID="ds-button-icon-plus"
          accessibilityLabel="Add"
        />
        <DsIconButton
          icon="edit"
          testID="ds-button-icon-edit"
          accessibilityLabel="Edit"
        />
      </Stage>
      <SpecList
        rows={[
          ['Height', '56 / 44'],
          ['Primary fill', ds.color.ink.toUpperCase()],
          ['Primary label', ds.color.cream.toUpperCase()],
          ['Radius', '16 · 17 · 12'],
          ['Label', 'Roboto 500 / 16'],
          ['Disabled', 'opacity .38'],
        ]}
      />

      {/* Selection controls */}
      <SubHead label="Selection controls" tag="switch · radio · checkbox" />
      <Stage column>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Enable notification</Text>
          <SettingsSwitch
            testID="ds-controls-switch-notify"
            accessibilityLabel="Enable notification"
            value={notify}
            onValueChange={setNotify}
          />
        </View>
        <DsRadioGroup />
        <DsCheckboxGroup />
      </Stage>
      <SpecList
        rows={[
          ['Switch', '52 × 32'],
          ['Track on', ds.color.teal.toUpperCase()],
          ['Radio', '20 · 2px'],
          ['Radio on', ds.color.black.toUpperCase()],
          ['Checkbox', '18 · r2'],
        ]}
      />

      {/* List & settings rows */}
      <SubHead label="List & settings rows" tag="label · value · chevron" />
      <Stage variant="plain">
        <DsListRows />
      </Stage>

      {/* Navigation — dark menu + segmented */}
      <SubHead label="Navigation" tag="dark menu · segmented" />
      <Stage variant="dark">
        <DsDarkMenu />
      </Stage>
      <Caption>Segmented control · view switch</Caption>
      <Stage>
        <DsSegmented />
      </Stage>

      {/* Dialogs & sheets */}
      <SubHead label="Dialogs & sheets" tag="confirm · sources" />
      <Stage>
        <DsDialog onCancel={() => {}} onConfirm={() => {}} />
        <DsActionSheet />
      </Stage>

      {/* Cards & tiles */}
      <SubHead label="Cards & tiles" tag="item · outfit" />
      <Stage>
        <DsTile
          caption="Linen overshirt"
          sub="Tops · Ecru"
          tag="item shot"
          pin
        />
        <DsTile
          caption="Quiet Monday"
          sub="3 items · Stay Balanced"
          tag="outfit collage"
        />
      </Stage>

      {/* Inputs & pickers */}
      <SubHead label="Inputs & pickers" tag="field · time" />
      <Stage column>
        <DsField label="Email" value="macgie@macgie.com" state="default" />
        <DsField
          label="Search wardrobe"
          value="Search the database…"
          state="placeholder"
        />
        <DsField label="Focused" value="Calm" state="focus" />
        <DsTimePicker />
      </Stage>

      {/* Badges / pills / chips */}
      <SubHead label="Badges, pills & chips" tag="metadata · filter · status" />
      <Caption>Badges & metadata</Caption>
      <Stage>
        <DsBadges />
      </Stage>
      <Caption>Filter chips · tap to toggle</Caption>
      <Stage>
        <DsChips />
      </Stage>
      <Caption>Status</Caption>
      <Stage>
        <DsStatusPills />
      </Stage>
    </View>
  );
};

const styles = StyleSheet.create({
  stage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ds.color.cream,
    borderWidth: 1,
    borderColor: ds.line,
    borderRadius: ds.radius.md,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.m,
    minHeight: 140,
  },
  stagePlain: { backgroundColor: ds.color.surface2 },
  stageDark: { backgroundColor: ds.color.slate },
  stageCol: { flexDirection: 'column', alignItems: 'stretch' },
  textBtnRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    ...theme.typography.aliases.interBodyMd,
    color: ds.color.ink,
  },
});
