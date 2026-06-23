/**
 * Design System — Components (NEW showcase).
 * Composes the 13 component groups onto framed stages. Each demo is interactive
 * and token-driven (ds-tokens). Foundations live in Color/Type/SpaceForm.
 */
import React from 'react';
import { View } from 'react-native';
import { color } from './ds-tokens';
import { Caption, SectionHeader, Stage, SubHead } from './dsShared';
import { DsButtonShowcase } from './DsButtons';
import { DsDivider } from './DsDivider';
import { DsSelectionShowcase } from './DsControls';
import { DsChips, DsInputs } from './DsInputsChips';
import {
  DsFloatingPill,
  DsListRows,
  DsSegmented,
  DsTabBar,
  DsTabs,
} from './DsListsTabs';
import { DsAvatars, DsTile, DsTopBar } from './DsCardsAvatar';
import {
  DsActionSheet,
  DsDialog,
  DsSheet,
  DsSnackbar,
  DsToast,
} from './DsOverlays';
import { DsCalendar, DsKeyboard, DsTimePicker } from './DsDateKeyboard';

export const ComponentsSection: React.FC = () => (
  <View>
    <SectionHeader
      num="04"
      title="Components"
      blurb="Thirteen component groups rebuilt on the new tokens — buttons, dividers, selection, inputs, chips, rows, tabs, cards, avatars, navigation, overlays, date picker, keyboard."
    />

    {/* 1 — Buttons */}
    <SubHead label="Buttons" tag="6 variants · 3 sizes · states" />
    <Stage column>
      <DsButtonShowcase />
    </Stage>

    {/* 2 — Divider */}
    <SubHead label="Dividers" tag="h · labeled · inset · vertical" />
    <Stage column>
      <DsDivider />
    </Stage>

    {/* 3 — Selection */}
    <SubHead label="Selection controls" tag="switch · checkbox · radio · checkmenu" />
    <Stage column>
      <DsSelectionShowcase />
    </Stage>

    {/* 4 — Inputs */}
    <SubHead label="Inputs" tag="default · focus · error" />
    <Stage column>
      <DsInputs />
    </Stage>

    {/* 5 — Chips / tags / badges */}
    <SubHead label="Chips, tags & badges" tag="filter · removable · status" />
    <Stage column>
      <DsChips />
    </Stage>

    {/* 6 — List rows */}
    <SubHead label="List rows" tag="value · chevron · danger" />
    <Stage variant="plain">
      <DsListRows />
    </Stage>

    {/* 7 — Tabs / segments */}
    <SubHead label="Tabs & segments" tag="segmented · underline · dark bar · pill" />
    <Caption>Segmented control</Caption>
    <Stage>
      <DsSegmented />
    </Stage>
    <Caption>Underline tabs</Caption>
    <Stage>
      <DsTabs />
    </Stage>
    <Caption>Dark tab bar</Caption>
    <Stage variant="dark">
      <DsTabBar />
    </Stage>
    <Caption>Floating pill footer</Caption>
    <Stage>
      <DsFloatingPill />
    </Stage>

    {/* 8 — Cards / tiles */}
    <SubHead label="Cards & tiles" tag="item · outfit · pin" />
    <Stage>
      <DsTile caption="Linen overshirt" sub="Tops · Ecru" tag="item" pinnable fill={color.p200} />
      <DsTile caption="Quiet Monday" sub="3 items · Balanced" tag="outfit" fill={color.n200} />
    </Stage>

    {/* 9 — Avatar */}
    <SubHead label="Avatar" tag="88 · 44 · initials · fallback" />
    <Stage>
      <DsAvatars />
    </Stage>

    {/* 10 — Navigation (top app bar) */}
    <SubHead label="Navigation" tag="top app bar" />
    <Stage variant="plain">
      <DsTopBar />
    </Stage>

    {/* 11 — Overlays */}
    <SubHead label="Overlays" tag="dialog · sheet · snackbar · action-sheet · toast" />
    <Stage>
      <DsDialog />
      <DsSheet />
    </Stage>
    <Stage>
      <DsActionSheet />
    </Stage>
    <Stage column>
      <DsSnackbar />
      <DsSnackbar mint />
      <DsToast />
    </Stage>

    {/* 12 — Date picker */}
    <SubHead label="Date picker" tag="calendar · time" />
    <Stage>
      <DsCalendar />
    </Stage>
    <Stage>
      <DsTimePicker />
    </Stage>

    {/* 13 — Keyboard */}
    <SubHead label="Keyboard" tag="qwerty" />
    <Stage variant="plain">
      <DsKeyboard />
    </Stage>
  </View>
);
