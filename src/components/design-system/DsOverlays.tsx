/**
 * Design System — Overlays (NEW showcase).
 * Dialog · sheet · snackbar (neutral + mint) · action-sheet · toast (spinner).
 * Motion: snackbar/toast reveal = opacity + scale(.9→1) ~200ms (useToggleValue);
 * toast spinner = continuous 360° (SpinLoader). Snackbar/toast are LIVE — tap
 * the trigger pill to play the reveal.
 */
import React, { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icons } from '../../assets/icons';
import { color, radius, role, shadow, space, type } from './ds-tokens';
import { SpinLoader, useToggleValue } from './DsMotion';

const IconCamera = Icons.Camera;
const IconGrid = Icons.Grid;

/* ---------------- dialog ---------------- */
export const DsDialog: React.FC = () => (
  <View style={[styles.dialog, shadow.dialog]} testID="ds-dialog">
    <Text style={styles.dialogTitle}>Delete data</Text>
    <Text style={styles.dialogBody}>
      Auxi will revert to day one. This cannot be undone.
    </Text>
    <View style={styles.dialogActions}>
      <View style={[styles.dlgBtn, styles.dlgBtnOutline]} testID="ds-dialog-cancel">
        <Text style={styles.dlgBtnOutlineText}>Cancel</Text>
      </View>
      <View style={[styles.dlgBtn, styles.dlgBtnDanger]} testID="ds-dialog-delete">
        <Text style={styles.dlgBtnDangerText}>Delete</Text>
      </View>
    </View>
  </View>
);

/* ---------------- sheet ---------------- */
export const DsSheet: React.FC = () => (
  <View style={[styles.sheet, shadow.sheet]} testID="ds-sheet">
    <View style={styles.grab} />
    <SheetOpt Icon={IconCamera} label="Take a photo" testID="ds-sheet-camera" />
    <SheetOpt Icon={IconGrid} label="Upload from gallery" testID="ds-sheet-gallery" />
  </View>
);

const SheetOpt: React.FC<{ Icon: React.FC<any>; label: string; testID: string }> = ({
  Icon,
  label,
  testID,
}) => (
  <View style={styles.sheetOpt} testID={testID}>
    <Icon width={20} height={20} color={role.ink} />
    <Text style={styles.sheetLabel}>{label}</Text>
  </View>
);

/* ---------------- action sheet ---------------- */
export const DsActionSheet: React.FC = () => (
  <View style={[styles.asheet, shadow.sheet]} testID="ds-action-sheet">
    <Text style={styles.aHead}>Manage outfit</Text>
    <ARow label="Share" testID="ds-asheet-share" />
    <ARow label="Add to favourites" testID="ds-asheet-fav" />
    <ARow label="Delete" danger testID="ds-asheet-delete" />
    <View style={styles.aCancel} testID="ds-asheet-cancel">
      <Text style={styles.aCancelText}>Cancel</Text>
    </View>
  </View>
);

const ARow: React.FC<{ label: string; danger?: boolean; testID: string }> = ({
  label,
  danger,
  testID,
}) => (
  <View style={styles.aRow} testID={testID}>
    <Text style={[styles.aRowText, danger && styles.aRowDanger]}>{label}</Text>
  </View>
);

/* ---------------- snackbar (live reveal) ---------------- */
export const DsSnackbar: React.FC<{ mint?: boolean }> = ({ mint }) => {
  const [shown, setShown] = useState(true);
  const v = useToggleValue(shown, 200);
  const opacity = v;
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  return (
    <View style={styles.liveWrap}>
      <Pressable
        style={styles.trigger}
        onPress={() => setShown(s => !s)}
        testID={mint ? 'ds-snackbar-mint-toggle' : 'ds-snackbar-toggle'}
        accessibilityRole="button"
        accessibilityLabel="Replay snackbar"
      >
        <Text style={styles.triggerText}>{shown ? 'Hide' : 'Show'} snackbar</Text>
      </Pressable>
      <Animated.View
        style={[
          styles.snackbar,
          mint && styles.snackbarMint,
          { opacity, transform: [{ scale }] },
        ]}
        testID={mint ? 'ds-snackbar-mint' : 'ds-snackbar'}
        pointerEvents="none"
      >
        <Text style={[styles.snackText, mint && styles.snackTextMint]}>
          {mint ? 'Outfit saved' : 'Item moved to archive'}
        </Text>
        <Text style={[styles.snackAction, mint && styles.snackActionMint]}>UNDO</Text>
      </Animated.View>
    </View>
  );
};

/* ---------------- toast (spinner, live reveal) ---------------- */
export const DsToast: React.FC = () => {
  const [shown, setShown] = useState(true);
  const v = useToggleValue(shown, 200);
  const opacity = v;
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  return (
    <View style={styles.liveWrap}>
      <Pressable
        style={styles.trigger}
        onPress={() => setShown(s => !s)}
        testID="ds-toast-toggle"
        accessibilityRole="button"
        accessibilityLabel="Replay toast"
      >
        <Text style={styles.triggerText}>{shown ? 'Hide' : 'Show'} toast</Text>
      </Pressable>
      <Animated.View
        style={[styles.toast, { opacity, transform: [{ scale }] }]}
        testID="ds-toast"
        pointerEvents="none"
      >
        <SpinLoader size={32} testID="ds-toast-spinner" />
        <Text style={styles.toastText}>Generating your look…</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  dialog: {
    width: 300,
    backgroundColor: role.surface2,
    borderRadius: radius['3xl'],
    padding: space.s6,
  },
  dialogTitle: { ...type.h3, color: role.ink, marginBottom: space.s2 },
  dialogBody: { ...type.bodySm, color: role.ink2, marginBottom: space.s5 },
  dialogActions: { flexDirection: 'row', gap: space.s3 },
  dlgBtn: { flex: 1, height: 48, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  dlgBtnOutline: { borderWidth: 1.5, borderColor: role.ink },
  dlgBtnOutlineText: { ...type.bodySm, color: role.ink },
  dlgBtnDanger: { backgroundColor: color.da400 },
  dlgBtnDangerText: { ...type.bodySm, color: color.white },
  sheet: {
    width: 300,
    backgroundColor: role.surface2,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    paddingTop: 10,
    paddingBottom: space.s3,
    overflow: 'hidden',
  },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: color.n300, alignSelf: 'center', marginVertical: 8 },
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
    width: 300,
    backgroundColor: role.surface2,
    borderRadius: radius['3xl'],
    overflow: 'hidden',
    paddingBottom: space.s2,
  },
  aHead: { ...type.caption, color: role.ink3, textAlign: 'center', paddingVertical: space.s3 },
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
  aCancelText: { ...type.body, fontFamily: type.h3.fontFamily, color: role.ink },
  liveWrap: { alignItems: 'center', gap: space.s3 },
  trigger: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: role.ink,
  },
  triggerText: { ...type.bodySm, color: role.ink },
  snackbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s4,
    backgroundColor: color.n800,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: 16,
    minWidth: 300,
    ...shadow.raised,
  },
  snackbarMint: { backgroundColor: color.mint },
  snackText: { ...type.bodySm, color: color.p50, flex: 1 },
  snackTextMint: { color: color.n900 },
  snackAction: { ...type.bodySm, fontFamily: type.h3.fontFamily, color: color.su200 },
  snackActionMint: { color: color.n900 },
  toast: {
    alignItems: 'center',
    gap: 11,
    backgroundColor: 'rgba(29,31,35,0.92)',
    paddingVertical: 20,
    paddingHorizontal: 22,
    borderRadius: radius.xl,
    ...shadow.raised,
  },
  toastText: { ...type.bodySm, color: color.p50 },
});
