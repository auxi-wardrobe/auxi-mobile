/**
 * Design System — Motion (NEW showcase, spec §C — the explicit CEO ask).
 * Live, interactive demos mapped to motion.ts tokens; all honor
 * useReducedMotion(). Each demo also references its token in a mono caption.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from '../../theme/motion';
import { color, role, type } from './ds-tokens';
import { Caption, NoteBold, NoteCard, SectionHeader, Stage, SubHead } from './dsShared';
import { DsButton } from './DsButtons';
import { DsSwitch } from './DsControls';
import { DsTile } from './DsCardsAvatar';
import { DsFloatingPill } from './DsFloatingPill';
import { DsSnackbar, DsToast } from './DsToasts';

export const MotionSection: React.FC = () => {
  const reduce = useReducedMotion();
  const [on, setOn] = React.useState(false);
  return (
    <View>
      <SectionHeader
        num="C"
        title="Motion"
        blurb="Interaction motion mapped to the motion.ts tokens. Tap the demos — every animation falls back to its end state when Reduce Motion is on."
      />

      <NoteCard flag={reduce}>
        <NoteBold>Reduce Motion: {reduce ? 'ON' : 'off'}. </NoteBold>
        {reduce
          ? 'Animations are collapsed to their end state (no scale/slide/spin).'
          : 'Toggle iOS Settings → Accessibility → Motion to preview the fallback.'}
      </NoteCard>

      <SubHead label="Button press + loading" tag="scale .96 spring · 3-dot loader" />
      <Caption>Press → scale(.96) · spring.confident</Caption>
      <Stage>
        <DsButton label="Press me" testID="ds-motion-press" />
        <DsButton label="Loading" loading testID="ds-motion-loading" />
      </Stage>

      <SubHead label="Switch knob" tag="slide · duration.fast" />
      <Stage>
        <DsSwitch
          value={on}
          onValueChange={setOn}
          testID="ds-motion-switch"
          accessibilityLabel="Motion switch demo"
        />
        <Text style={styles.hint}>Knob slides left ↔ right; track fades gray ↔ teal.</Text>
      </Stage>

      <SubHead label="Tile pin" tag="press scale 1.06 · status slide-in" />
      <Caption>Tap the pin: scale(1.06) press, then 'Pinned' slides in (translateY -3→0)</Caption>
      <Stage>
        <DsTile caption="Linen overshirt" sub="Tops · Ecru" tag="item" pinnable fill={color.p200} />
      </Stage>

      <SubHead label="Snackbar & toast" tag="opacity + scale(.9→1) · spinner" />
      <Stage column>
        <DsSnackbar />
        <DsSnackbar mint />
        <DsToast />
      </Stage>

      <SubHead label="Floating pill footer" tag="spring overshoot · .34s" />
      <Caption>The signature springy nav — thumb overshoots on x + width</Caption>
      <Stage>
        <DsFloatingPill />
      </Stage>
    </View>
  );
};

const styles = StyleSheet.create({
  hint: { ...type.bodySm, color: role.ink2, flex: 1 },
});
