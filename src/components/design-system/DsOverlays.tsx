/**
 * Design System — Overlays (NEW showcase): dialog · sheet · action-sheet.
 * The live snackbar + toast (with reveal motion + spinner) live in DsToasts.tsx.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icons } from '../../assets/icons';
import { color, radius, role, shadow, space, type } from './ds-tokens';

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
});
