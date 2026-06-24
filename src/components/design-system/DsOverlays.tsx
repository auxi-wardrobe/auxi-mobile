/**
 * Design System — Overlays (NEW showcase): dialog · sheet · action-sheet.
 * Each is wrapped in a self-contained demo stage with a "Show" trigger so the
 * enter/exit motion is visible on web. Motion follows motion-rules asymmetry:
 * ENTER is slower/springy, CLOSE is faster (exit easing). Backdrop crossfades.
 * The live snackbar + toast (with reveal motion + spinner) live in DsToasts.tsx.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { motion, useReducedMotion } from '../../theme/motion';
import { Icons } from '../../assets/icons';
import { color, radius, role, shadow, space, type } from './ds-tokens';

const IconCamera = Icons.Camera;
const IconGrid = Icons.Grid;

type OverlayKind = 'dialog' | 'sheet';

/**
 * Self-contained overlay demo: a "Show" trigger + a framed backdrop region the
 * overlay animates into. `kind='dialog'` → scale .92→1 + fade (centred);
 * `kind='sheet'` → slide up translateY + fade (bottom-anchored). Open springs,
 * close is a faster exit-eased timing. Auto-renders the children via a factory
 * so each child can stagger off the shared `progress` value.
 */
const OverlayDemo: React.FC<{
  kind: OverlayKind;
  triggerLabel: string;
  testID: string;
  height: number;
  children: (progress: Animated.Value) => React.ReactNode;
}> = ({ kind, triggerLabel, testID, height, children }) => {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      setMounted(true);
      if (reduce) {
        progress.setValue(1);
        return;
      }
      Animated.spring(progress, {
        toValue: 1,
        stiffness: motion.spring.standard.stiffness,
        damping: motion.spring.standard.damping,
        mass: 1,
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      if (reduce) {
        progress.setValue(0);
        setMounted(false);
        return;
      }
      // close = faster (exit easing) per motion-rules open/close asymmetry.
      Animated.timing(progress, {
        toValue: 0,
        duration: motion.duration.fast,
        easing: motion.easing.exit,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [open, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  const backdrop = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const dialogScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });
  const sheetY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0],
  });

  return (
    <View style={styles.demoCol}>
      <Pressable
        style={styles.trigger}
        onPress={() => setOpen(o => !o)}
        testID={`${testID}-toggle`}
        accessibilityRole="button"
        accessibilityLabel={triggerLabel}
      >
        <Text style={styles.triggerText}>
          {open ? 'Hide' : 'Show'} {triggerLabel}
        </Text>
      </Pressable>

      <View style={[styles.scrim, { height }]}>
        {mounted && (
          <>
            <Animated.View
              style={[styles.backdrop, { opacity: backdrop }]}
              pointerEvents="none"
            />
            <Pressable
              style={[
                StyleSheet.absoluteFill,
                kind === 'sheet' && styles.sheetAnchor,
                kind === 'dialog' && styles.dialogAnchor,
              ]}
              onPress={() => setOpen(false)}
              testID={`${testID}-backdrop`}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
            >
              <Animated.View
                style={
                  kind === 'dialog'
                    ? { opacity: progress, transform: [{ scale: dialogScale }] }
                    : { transform: [{ translateY: sheetY }] }
                }
              >
                {children(progress)}
              </Animated.View>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
};

/* ---------------- dialog ---------------- */
export const DsDialog: React.FC = () => (
  <OverlayDemo
    kind="dialog"
    triggerLabel="dialog"
    testID="ds-dialog"
    height={220}
  >
    {() => (
      <View style={[styles.dialog, shadow.dialog]} testID="ds-dialog">
        <Text style={styles.dialogTitle}>Delete data</Text>
        <Text style={styles.dialogBody}>
          Auxi will revert to day one. This cannot be undone.
        </Text>
        <View style={styles.dialogActions}>
          <View
            style={[styles.dlgBtn, styles.dlgBtnOutline]}
            testID="ds-dialog-cancel"
          >
            <Text style={styles.dlgBtnOutlineText}>Cancel</Text>
          </View>
          <View
            style={[styles.dlgBtn, styles.dlgBtnDanger]}
            testID="ds-dialog-delete"
          >
            <Text style={styles.dlgBtnDangerText}>Delete</Text>
          </View>
        </View>
      </View>
    )}
  </OverlayDemo>
);

/* ---------------- sheet ---------------- */
export const DsSheet: React.FC = () => (
  <OverlayDemo kind="sheet" triggerLabel="sheet" testID="ds-sheet" height={200}>
    {() => (
      <View style={[styles.sheet, shadow.sheet]} testID="ds-sheet">
        <View style={styles.grab} />
        <SheetOpt
          Icon={IconCamera}
          label="Take a photo"
          testID="ds-sheet-camera"
        />
        <SheetOpt
          Icon={IconGrid}
          label="Upload from gallery"
          testID="ds-sheet-gallery"
        />
      </View>
    )}
  </OverlayDemo>
);

const SheetOpt: React.FC<{
  Icon: React.FC<any>;
  label: string;
  testID: string;
}> = ({ Icon, label, testID }) => (
  <View style={styles.sheetOpt} testID={testID}>
    <Icon width={20} height={20} color={role.ink} />
    <Text style={styles.sheetLabel}>{label}</Text>
  </View>
);

/* ---------------- action sheet ---------------- */
export const DsActionSheet: React.FC = () => (
  <OverlayDemo
    kind="sheet"
    triggerLabel="action sheet"
    testID="ds-action-sheet"
    height={300}
  >
    {progress => (
      <View style={[styles.asheet, shadow.sheet]} testID="ds-action-sheet">
        <Text style={styles.aHead}>Manage outfit</Text>
        <ARow label="Share" index={0} progress={progress} testID="ds-asheet-share" />
        <ARow
          label="Add to favourites"
          index={1}
          progress={progress}
          testID="ds-asheet-fav"
        />
        <ARow
          label="Delete"
          index={2}
          progress={progress}
          danger
          testID="ds-asheet-delete"
        />
        <View style={styles.aCancel} testID="ds-asheet-cancel">
          <Text style={styles.aCancelText}>Cancel</Text>
        </View>
      </View>
    )}
  </OverlayDemo>
);

/** Action-sheet row with a staggered fade-up keyed off the sheet `progress`. */
const ARow: React.FC<{
  label: string;
  danger?: boolean;
  testID: string;
  index: number;
  progress: Animated.Value;
}> = ({ label, danger, testID, index, progress }) => {
  // each row reveals slightly after the sheet body (input-range stagger).
  const start = Math.min(0.3 + index * 0.18, 0.85);
  const opacity = progress.interpolate({
    inputRange: [start, Math.min(start + 0.2, 1)],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const translateY = progress.interpolate({
    inputRange: [start, Math.min(start + 0.2, 1)],
    outputRange: [6, 0],
    extrapolate: 'clamp',
  });
  return (
    <Animated.View
      style={[styles.aRow, { opacity, transform: [{ translateY }] }]}
      testID={testID}
    >
      <Text style={[styles.aRowText, danger && styles.aRowDanger]}>{label}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  demoCol: { alignItems: 'center', gap: space.s3 },
  trigger: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: role.ink,
  },
  triggerText: { ...type.bodySm, color: role.ink },
  scrim: {
    width: 320,
    borderRadius: radius['2xl'],
    overflow: 'hidden',
    backgroundColor: role.surface,
    borderWidth: 1,
    borderColor: role.lineCream,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(29,31,35,0.45)',
  },
  dialogAnchor: { alignItems: 'center', justifyContent: 'center', padding: 10 },
  sheetAnchor: { justifyContent: 'flex-end' },
  dialog: {
    width: 300,
    backgroundColor: role.surface2,
    borderRadius: radius['3xl'],
    padding: space.s6,
  },
  dialogTitle: { ...type.h3, color: role.ink, marginBottom: space.s2 },
  dialogBody: { ...type.bodySm, color: role.ink2, marginBottom: space.s5 },
  dialogActions: { flexDirection: 'row', gap: space.s3 },
  dlgBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dlgBtnOutline: { borderWidth: 1.5, borderColor: role.ink },
  dlgBtnOutlineText: { ...type.bodySm, color: role.ink },
  dlgBtnDanger: { backgroundColor: color.da400 },
  dlgBtnDangerText: { ...type.bodySm, color: color.white },
  sheet: {
    width: 320,
    backgroundColor: role.surface2,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    paddingTop: 10,
    paddingBottom: space.s3,
    overflow: 'hidden',
  },
  grab: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.n300,
    alignSelf: 'center',
    marginVertical: 8,
  },
  sheetOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingVertical: space.s4,
    paddingHorizontal: space.s5,
    borderTopWidth: 1,
    borderTopColor: role.lineCream,
  },
  sheetLabel: { ...type.body, color: role.ink },
  asheet: {
    width: 320,
    backgroundColor: role.surface2,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    overflow: 'hidden',
    paddingBottom: space.s2,
  },
  aHead: {
    ...type.caption,
    color: role.ink3,
    textAlign: 'center',
    paddingVertical: space.s3,
  },
  aRow: {
    paddingVertical: space.s4,
    paddingHorizontal: space.s5,
    borderTopWidth: 1,
    borderTopColor: role.lineCream,
    alignItems: 'center',
  },
  aRowText: { ...type.body, color: role.ink },
  aRowDanger: { color: color.da400 },
  aCancel: {
    margin: space.s2,
    paddingVertical: space.s4,
    borderRadius: radius['2xl'],
    backgroundColor: color.n50,
    alignItems: 'center',
  },
  aCancelText: {
    ...type.body,
    fontFamily: type.h3.fontFamily,
    color: role.ink,
  },
});
