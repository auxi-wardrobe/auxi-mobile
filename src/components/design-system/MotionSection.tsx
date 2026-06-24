/**
 * Design System — Motion (NEW showcase, spec §C — the explicit CEO ask).
 *
 * A CONSUMER of the lib/ primitives — every motion demo below is a lib primitive
 * imported + rendered with local showcase state. The motion lives INSIDE each
 * primitive (mapped to motion.ts tokens, honoring useReducedMotion). No inline
 * animation markup here.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from '../../theme/motion';
import { color, radius, role, type } from './ds-tokens';
import {
  Caption,
  NoteBold,
  NoteCard,
  SectionHeader,
  Stage,
  SubHead,
} from './dsShared';
import {
  DsButton,
  DsCard,
  DsFloatingPill,
  DsSnackbar,
  DsSwitch,
  DsToast,
} from './lib';

export const MotionSection: React.FC = () => {
  const reduce = useReducedMotion();
  const [on, setOn] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [snackbar, setSnackbar] = useState(true);
  const [mintSnack, setMintSnack] = useState(true);
  const [toast, setToast] = useState(true);
  const [pill, setPill] = useState('Today');

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
        <DsButton testID="ds-motion-press">Press me</DsButton>
        <DsButton loading testID="ds-motion-loading">Loading</DsButton>
      </Stage>

      <SubHead label="Switch knob" tag="slide · duration.fast" />
      <Stage>
        <DsSwitch
          value={on}
          onValueChange={setOn}
          testID="ds-motion-switch"
          accessibilityLabel="Motion switch demo"
        />
        <Text style={styles.hint}>
          Knob slides left ↔ right; track fades gray ↔ teal.
        </Text>
      </Stage>

      <SubHead label="Tile pin" tag="press scale 1.06 · status slide-in" />
      <Caption>
        Tap the pin: scale(1.06) press, then 'Pinned' slides in (translateY -3→0)
      </Caption>
      <Stage>
        <DsCard
          caption="Linen overshirt"
          sub="Tops · Ecru"
          tag="item"
          fill={color.p200}
          pinned={pinned}
          onPinChange={setPinned}
          testID="ds-motion-tile"
        />
      </Stage>

      <SubHead label="Snackbar & toast" tag="opacity + scale(.9→1) · spinner" />
      <Stage column>
        <MotionTransient label="snackbar" testID="ds-motion-snackbar" shown={snackbar} setShown={setSnackbar}>
          <DsSnackbar
            visible={snackbar}
            message="Item moved to archive"
            actionLabel="UNDO"
            testID="ds-motion-snackbar"
          />
        </MotionTransient>
        <MotionTransient label="mint snackbar" testID="ds-motion-snackbar-mint" shown={mintSnack} setShown={setMintSnack}>
          <DsSnackbar
            visible={mintSnack}
            tone="mint"
            message="Outfit saved"
            actionLabel="UNDO"
            testID="ds-motion-snackbar-mint"
          />
        </MotionTransient>
        <MotionTransient label="toast" testID="ds-motion-toast" shown={toast} setShown={setToast}>
          <DsToast visible={toast} message="Generating your look…" testID="ds-motion-toast" />
        </MotionTransient>
      </Stage>

      <SubHead label="Floating pill footer" tag="spring overshoot · .34s" />
      <Caption>The signature springy nav — thumb overshoots on x + width</Caption>
      <Stage>
        <DsFloatingPill
          tabs={['Today', 'Browse', 'You']}
          value={pill}
          onChange={setPill}
          testID="ds-motion-pill"
        />
      </Stage>
    </View>
  );
};

const MotionTransient: React.FC<{
  label: string;
  testID: string;
  shown: boolean;
  setShown: (v: boolean) => void;
  children: React.ReactNode;
}> = ({ label, testID, shown, setShown, children }) => (
  <View style={styles.transientCol}>
    <Pressable
      style={styles.trigger}
      onPress={() => setShown(!shown)}
      testID={`${testID}-toggle`}
      accessibilityRole="button"
      accessibilityLabel={`Replay ${label}`}
    >
      <Text style={styles.triggerText}>
        {shown ? 'Hide' : 'Show'} {label}
      </Text>
    </Pressable>
    {children}
  </View>
);

const styles = StyleSheet.create({
  hint: { ...type.bodySm, color: role.ink2, flex: 1 },
  transientCol: { alignItems: 'center', gap: 12 },
  trigger: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: role.ink,
  },
  triggerText: { ...type.bodySm, color: role.ink },
});
