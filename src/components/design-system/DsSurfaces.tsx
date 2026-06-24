/**
 * Design System — structural component demos: list rows, dark slide-out menu,
 * dialog, action sheet, item/outfit tile, input field, time picker, badges /
 * pills / chips / status pills. Faithful to auxi-ds.css. Token-only styling.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';
import {
  IconChevronRight,
  IconTrash,
  IconGrid,
  IconHeart,
  IconCamera,
  IconWardrobe,
  IconUser,
  IconLogout,
  IconFeedback,
} from '../../assets/icons';
import IconPin from '../../assets/images/icon_home_pin.svg';
import { MONO_FAMILY } from './dsShared';

const ds = theme.ds;
const ROBOTO = theme.typography.aliases.uacM3BodySmall.fontFamily;

/* ---------------- list / settings rows ---------------- */
export const DsListRows: React.FC = () => (
  <View style={styles.phone}>
    <ListRow label="Privacy" chevron />
    <ListRow label="Style Direction" value="Calm, Effortless" chevron />
    <ListRow label="Your photos" chevron />
    <ListRow label="Delete Data" danger />
    <ListRow label="Version 1.0.3" muted last />
  </View>
);

const ListRow: React.FC<{
  label: string;
  value?: string;
  chevron?: boolean;
  danger?: boolean;
  muted?: boolean;
  last?: boolean;
}> = ({ label, value, chevron, danger, muted, last }) => (
  <View
    style={[styles.listRow, last && styles.listRowLast]}
    testID={`ds-listrow-${label.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <Text
      style={[
        styles.rowLabel,
        danger && styles.rowDanger,
        muted && styles.rowMuted,
      ]}
    >
      {label}
    </Text>
    {!!value && <Text style={styles.rowValue}>{value}</Text>}
    {danger ? (
      <IconTrash width={18} height={18} color={ds.color.danger} />
    ) : chevron ? (
      <IconChevronRight width={18} height={18} color={ds.color.warm500} />
    ) : null}
  </View>
);

/* ---------------- dark slide-out menu ---------------- */
export const DsDarkMenu: React.FC = () => (
  <View style={styles.menu}>
    <View style={styles.menuTop}>
      <IconGrid width={18} height={18} color={ds.color.cream} />
      <Text style={styles.menuTopText}>See my outfits</Text>
    </View>
    <MenuItem icon={IconWardrobe} label="Wardrobe" />
    <MenuItem icon={IconHeart} label="My Favourite" />
    <MenuItem icon={IconFeedback} label="Feedback" />
    <MenuItem icon={IconUser} label="Profile" active />
    <MenuItem icon={IconLogout} label="Log out" />
  </View>
);

const MenuItem: React.FC<{
  icon: React.FC<any>;
  label: string;
  active?: boolean;
}> = ({ icon: Icon, label, active }) => (
  <View
    style={[styles.menuItem, active && styles.menuItemActive]}
    testID={`ds-menu-item-${label.toLowerCase().replace(/\s+/g, '-')}${
      active ? '-active' : ''
    }`}
  >
    <Icon
      width={18}
      height={18}
      color={active ? ds.color.white : ds.color.cream}
    />
    <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>
      {label}
    </Text>
  </View>
);

/* ---------------- dialog ---------------- */
export const DsDialog: React.FC<{
  onCancel: () => void;
  onConfirm: () => void;
}> = () => (
  <View style={[styles.dialog, ds.shadow.dialog]}>
    <Text style={styles.dialogTitle}>Delete Data</Text>
    <Text style={styles.dialogBody}>
      Auxi will revert to day one. This cannot be undone.
    </Text>
    <View style={styles.dialogActions}>
      <View style={styles.dialogBtnSecondary} testID="ds-dialog-cancel">
        <Text style={styles.dialogBtnSecondaryLabel}>Cancel</Text>
      </View>
      <View style={styles.dialogBtnDanger} testID="ds-dialog-delete">
        <Text style={styles.dialogBtnDangerLabel}>Delete</Text>
      </View>
    </View>
  </View>
);

/* ---------------- action sheet ---------------- */
export const DsActionSheet: React.FC = () => (
  <View style={[styles.sheet, ds.shadow.sheet]}>
    <View style={styles.grab} />
    <SheetOpt icon={IconCamera} label="Take a photo" testID="ds-sheet-camera" />
    <SheetOpt
      icon={IconGrid}
      label="Upload from gallery"
      testID="ds-sheet-gallery"
    />
    <View
      style={[styles.sheetOpt, styles.sheetCancel]}
      testID="ds-sheet-cancel"
    >
      <Text style={styles.sheetCancelLabel}>Cancel</Text>
    </View>
  </View>
);

const SheetOpt: React.FC<{
  icon: React.FC<any>;
  label: string;
  testID: string;
}> = ({ icon: Icon, label, testID }) => (
  <View style={styles.sheetOpt} testID={testID}>
    <Icon width={20} height={20} color={ds.color.ink} />
    <Text style={styles.sheetLabel}>{label}</Text>
  </View>
);

/* ---------------- item / outfit tile ---------------- */
export const DsTile: React.FC<{
  caption: string;
  sub: string;
  tag: string;
  pin?: boolean;
}> = ({ caption, sub, tag, pin }) => (
  <View
    style={styles.tile}
    testID={`ds-tile-${caption.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <View style={styles.tileImg}>
      {pin && (
        <View style={styles.tilePin} testID="ds-tile-pin">
          <IconPin width={15} height={15} color={ds.color.ink} />
        </View>
      )}
      <View style={styles.tileTag}>
        <Text style={styles.tileTagText}>{tag}</Text>
      </View>
    </View>
    <View style={styles.tileCap}>
      <Text style={styles.tileCapText}>{caption}</Text>
      <Text style={styles.tileSub}>{sub}</Text>
    </View>
  </View>
);

/* ---------------- input field + time picker ---------------- */
export const DsField: React.FC<{
  label: string;
  value: string;
  state: 'default' | 'focus' | 'placeholder';
}> = ({ label, value, state }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View
      style={[styles.input, state === 'focus' && styles.inputFocus]}
      testID={`ds-input-${state}`}
    >
      <Text
        style={[
          styles.inputText,
          state === 'placeholder' && styles.inputPlaceholder,
        ]}
      >
        {value}
      </Text>
    </View>
  </View>
);

export const DsTimePicker: React.FC = () => (
  <View style={styles.timepick}>
    <Text style={styles.clock}>07 : 30</Text>
    <View style={styles.ampm}>
      <PeriodRow label="AM" on />
      <PeriodRow label="PM" />
    </View>
  </View>
);

const PeriodRow: React.FC<{ label: string; on?: boolean }> = ({
  label,
  on,
}) => (
  <View
    style={styles.periodRow}
    testID={`ds-timepicker-${label.toLowerCase()}`}
  >
    <View style={[styles.radioRing, on && styles.radioRingOn]}>
      {on && <View style={styles.radioDot} />}
    </View>
    <Text style={[styles.periodLabel, !on && styles.rowMuted]}>{label}</Text>
  </View>
);

/* ---------------- badges / pills / chips / status ---------------- */
export const DsBadges: React.FC = () => (
  <View style={styles.pillRow}>
    <Badge label="Weekdays" />
    <Badge label="Everydays" variant="soft" />
    <Badge label="Stay Balanced" variant="tan" />
    <Badge label="3 items" variant="soft" />
  </View>
);

const Badge: React.FC<{
  label: string;
  variant?: 'solid' | 'soft' | 'tan';
}> = ({ label, variant = 'solid' }) => (
  <View
    style={[
      styles.badge,
      variant === 'soft' && styles.badgeSoft,
      variant === 'tan' && styles.badgeTan,
    ]}
  >
    <Text
      style={[
        styles.badgeText,
        variant === 'soft' && styles.badgeTextSoft,
        variant === 'tan' && styles.badgeTextTan,
      ]}
    >
      {label}
    </Text>
  </View>
);

export const DsStatusPills: React.FC = () => (
  <View style={styles.pillRow}>
    <StatusPill label="Synced" tone="ok" />
    <StatusPill label="Generating" tone="warn" />
    <StatusPill label="Upload failed" tone="err" />
  </View>
);

const StatusPill: React.FC<{ label: string; tone: 'ok' | 'warn' | 'err' }> = ({
  label,
  tone,
}) => {
  const color =
    tone === 'ok'
      ? ds.color.teal
      : tone === 'err'
      ? ds.color.danger
      : ds.color.warm700;
  const bg =
    tone === 'ok'
      ? ds.color.cream
      : tone === 'warn'
      ? ds.color.tan
      : ds.color.warm100;
  return (
    <View style={[styles.statusPill, { backgroundColor: bg }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  /* phone-ish list container */
  phone: {
    width: 320,
    backgroundColor: ds.color.white,
    borderRadius: ds.radius.md,
    borderWidth: 1,
    borderColor: ds.line,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: ds.hairline,
  },
  listRowLast: { borderBottomWidth: 0 },
  rowLabel: {
    ...theme.typography.aliases.interBodyMd,
    flex: 1,
    color: ds.color.ink,
  },
  rowDanger: { color: ds.color.danger },
  rowMuted: { color: ds.color.warm500 },
  rowValue: {
    ...theme.typography.aliases.interBodySm,
    color: ds.color.warm500,
  },

  /* dark menu */
  menu: {
    width: 236,
    backgroundColor: ds.color.ink,
    borderRadius: ds.radius.xl,
    padding: 16,
    paddingTop: 22,
  },
  menuTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingBottom: 22,
  },
  menuTopText: {
    ...theme.typography.aliases.interMediumSm,
    color: ds.color.cream,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 11,
  },
  menuItemActive: { backgroundColor: ds.color.warm100 },
  menuLabel: {
    ...theme.typography.aliases.interBodySm,
    color: ds.color.cream,
  },
  menuLabelActive: { color: ds.color.white },

  /* dialog */
  dialog: {
    width: 300,
    backgroundColor: ds.color.surface,
    borderRadius: ds.radius.md,
    padding: theme.spacing.l,
  },
  dialogTitle: {
    ...theme.typography.aliases.poppinsButton,
    color: ds.color.ink,
    marginBottom: theme.spacing.s,
  },
  dialogBody: {
    ...theme.typography.aliases.interBodySm,
    color: ds.color.onVariant,
    marginBottom: theme.spacing.l,
  },
  dialogActions: { flexDirection: 'row', gap: 12 },
  dialogBtnSecondary: {
    flex: 1,
    height: 48,
    borderRadius: ds.radius.lg,
    borderWidth: 1.5,
    borderColor: ds.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBtnSecondaryLabel: {
    fontFamily: ROBOTO,
    fontSize: 15,
    color: ds.color.ink,
  },
  dialogBtnDanger: {
    flex: 1,
    height: 48,
    borderRadius: ds.radius.md,
    backgroundColor: ds.color.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBtnDangerLabel: {
    fontFamily: ROBOTO,
    fontSize: 15,
    color: ds.color.white,
  },

  /* sheet */
  sheet: {
    width: 300,
    backgroundColor: ds.color.surface,
    borderTopLeftRadius: ds.radius.xl,
    borderTopRightRadius: ds.radius.xl,
    paddingTop: 10,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  grab: {
    width: 36,
    height: 4,
    borderRadius: 4,
    backgroundColor: ds.color.placeholder,
    alignSelf: 'center',
    marginVertical: 8,
  },
  sheetOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderTopWidth: 1,
    borderTopColor: ds.hairline,
  },
  sheetLabel: {
    ...theme.typography.aliases.interBodyMd,
    color: ds.color.ink,
  },
  sheetCancel: { justifyContent: 'center' },
  sheetCancelLabel: {
    ...theme.typography.aliases.interBodyMd,
    color: ds.color.warm500,
  },

  /* tile */
  tile: {
    width: 150,
    backgroundColor: ds.color.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ds.line,
    overflow: 'hidden',
  },
  tileImg: {
    height: 178,
    backgroundColor: ds.color.tan,
  },
  tilePin: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: ds.color.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: ds.color.white,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 20,
  },
  tileTagText: {
    fontFamily: MONO_FAMILY,
    fontSize: 9.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: ds.color.warm700,
  },
  tileCap: { paddingHorizontal: 11, paddingTop: 9, paddingBottom: 11 },
  tileCapText: {
    ...theme.typography.aliases.interMediumSm,
    color: ds.color.ink,
  },
  tileSub: {
    ...theme.typography.aliases.interCaptionXxs,
    color: ds.color.warm500,
    marginTop: 2,
  },

  /* field + time picker */
  field: { width: 248 },
  fieldLabel: {
    fontFamily: MONO_FAMILY,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: ds.color.warm500,
    marginBottom: 7,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: ds.line,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: ds.color.white,
  },
  inputFocus: { borderColor: ds.color.ink },
  inputText: {
    ...theme.typography.aliases.interBodyMd,
    color: ds.color.ink,
  },
  inputPlaceholder: { color: ds.color.warm500 },
  timepick: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  clock: {
    ...theme.typography.aliases.poppinsTimeLg,
    fontSize: 46,
    lineHeight: 50,
    letterSpacing: 0.5,
    color: ds.color.ink,
  },
  ampm: { gap: 12 },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  periodLabel: {
    ...theme.typography.aliases.interBodySm,
    color: ds.color.ink,
  },
  radioRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: ds.color.warm500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioRingOn: { borderColor: ds.color.black },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ds.color.black,
  },

  /* badges / pills / status */
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  badge: {
    height: 24, // chip size SM
    paddingHorizontal: 13,
    borderRadius: ds.radius.full,
    backgroundColor: ds.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSoft: { backgroundColor: ds.color.cream },
  badgeTan: { backgroundColor: ds.color.tan },
  badgeText: {
    // Chip size SM (24px height) → 10px font per chip sizing spec.
    fontFamily: ROBOTO,
    fontSize: 10,
    lineHeight: 12,
    color: ds.color.cream,
  },
  badgeTextSoft: { color: ds.color.ink },
  badgeTextTan: { color: ds.color.warm700 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 24, // chip size SM
    paddingHorizontal: 11,
    borderRadius: ds.radius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: {
    // Chip size SM (24px height) → 10px font per chip sizing spec.
    ...theme.typography.aliases.uacBodyXsMedium,
    fontSize: 10,
    lineHeight: 12,
  },
});
