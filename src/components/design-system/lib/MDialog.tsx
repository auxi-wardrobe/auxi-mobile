/**
 * MDialog — self-contained controlled confirm dialog.
 *
 *   import { MDialog } from '../components/design-system/lib';
 *   <MDialog visible={open} title="Delete data" message="Cannot be undone."
 *             confirmLabel="Delete" destructive
 *             onConfirm={wipe} onCancel={() => setOpen(false)} />
 *
 * Renders an absolute-fill scrim into the nearest positioned parent (wrap in a
 * full-screen container for a true app dialog; the showcase frames it). ENTER
 * = scale .92→1 + fade spring; CLOSE = faster exit. Tokens + motion + the two
 * action buttons (MButton) encapsulated INSIDE. Honors reduce-motion.
 */
import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { radius, role, shadow, space, type } from '../m-tokens';
import { useOverlayProgress } from './useOverlayProgress';
import { MButton } from './MButton';

export interface MDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}

export const MDialog: React.FC<MDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
  onCancel,
  testID,
}) => {
  const { progress, mounted } = useOverlayProgress(visible);
  if (!mounted) return null;
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });
  return (
    <View style={styles.scrim} testID={testID}>
      <Animated.View
        style={[styles.backdrop, { opacity: progress }]}
        pointerEvents="none"
      />
      <Pressable
        style={styles.anchor}
        onPress={onCancel}
        testID={testID ? `${testID}-backdrop` : undefined}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
      >
        <Animated.View
          style={[
            styles.dialog,
            shadow.dialog,
            { opacity: progress, transform: [{ scale }] },
          ]}
        >
          <Text style={styles.dialogTitle}>{title}</Text>
          {!!message && <Text style={styles.dialogBody}>{message}</Text>}
          <View style={styles.dialogActions}>
            <MButton
              variant="secondary"
              size="md"
              onPress={onCancel}
              testID={testID ? `${testID}-cancel` : undefined}
            >
              {cancelLabel}
            </MButton>
            <MButton
              variant={destructive ? 'danger' : 'primary'}
              size="md"
              onPress={onConfirm}
              testID={testID ? `${testID}-confirm` : undefined}
            >
              {confirmLabel}
            </MButton>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(29,31,35,0.45)',
  },
  anchor: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.s4,
  },
  dialog: {
    width: 300,
    maxWidth: '100%',
    backgroundColor: role.surface2,
    borderRadius: radius['3xl'],
    padding: space.s6,
  },
  dialogTitle: { ...type.h3, color: role.ink, marginBottom: space.s2 },
  dialogBody: { ...type.bodySm, color: role.ink2, marginBottom: space.s5 },
  dialogActions: { flexDirection: 'row', gap: space.s3 },
});
