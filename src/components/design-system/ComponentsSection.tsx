/**
 * Design System — Components (NEW showcase).
 *
 * This file is a CONSUMER of the primitive library at `./lib`. It proves the
 * "single import → render, nothing else" contract: every specimen below is a
 * lib primitive rendered with local showcase state — no inline component markup,
 * no token/motion imports for the primitives themselves. Foundations (color /
 * type / spacing) live in their own sections; the keyboard demo is showcase-only
 * (not a reusable primitive) and lives in ./MKeyboardDemo.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icons } from '../../assets/icons';
import { color, radius, role, space, type } from './m-tokens';
import { Caption, SectionHeader, Stage, SubHead } from './mShared';
import { MKeyboardDemo } from './MKeyboardDemo';
import {
  MActionSheet,
  MAvatar,
  MBadge,
  MBottomSheet,
  MButton,
  MCalendar,
  MCard,
  MCheckbox,
  MCheckMenu,
  MChip,
  MDialog,
  MDivider,
  MIconButton,
  MInput,
  MListRow,
  MRadio,
  MSegmented,
  MSheetOption,
  MSnackbar,
  MStatus,
  MSwitch,
  MTabBar,
  MTabs,
  MTag,
  MTimePicker,
  MToast,
  MTopAppBar,
} from './lib';

const IconCamera = Icons.Camera;
const IconGrid = Icons.Grid;
const IconHeart = Icons.Heart;
const IconWardrobe = Icons.Wardrobe;
const IconUser = Icons.User;

/* A toggleable trigger + framed scrim region for a controlled overlay. */
const OverlayStage: React.FC<{
  label: string;
  height: number;
  testID: string;
  children: (visible: boolean, dismiss: () => void) => React.ReactNode;
}> = ({ label, height, testID, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.demoCol}>
      <Pressable
        style={styles.trigger}
        onPress={() => setOpen(o => !o)}
        testID={`${testID}-toggle`}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={styles.triggerText}>
          {open ? 'Hide' : 'Show'} {label}
        </Text>
      </Pressable>
      <View style={[styles.scrimBox, { height }]}>
        {children(open, () => setOpen(false))}
      </View>
    </View>
  );
};

/* A toggleable trigger for a controlled transient (snackbar/toast). */
const TransientStage: React.FC<{
  label: string;
  testID: string;
  children: (visible: boolean) => React.ReactNode;
}> = ({ label, testID, children }) => {
  const [shown, setShown] = useState(true);
  return (
    <View style={styles.demoCol}>
      <Pressable
        style={styles.trigger}
        onPress={() => setShown(s => !s)}
        testID={`${testID}-toggle`}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={styles.triggerText}>
          {shown ? 'Hide' : 'Show'} {label}
        </Text>
      </Pressable>
      {children(shown)}
    </View>
  );
};

const FILTERS = ['All', 'Tops', 'Bottoms', 'Shoes'];
const MENU_OPTS = [
  { value: 'all', label: 'All categories', tag: 'all' },
  { value: 'tops', label: 'Tops', tag: '01' },
  { value: 'bottoms', label: 'Bottoms', tag: '02' },
  { value: 'shoes', label: 'Shoes', tag: '03' },
];

export const ComponentsSection: React.FC = () => {
  // selection
  const [notify, setNotify] = useState(true);
  const [autoSync, setAutoSync] = useState(false);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [weekdays, setWeekdays] = useState(true);
  const [weekends, setWeekends] = useState(false);
  const [menuSel, setMenuSel] = useState<Record<string, boolean>>({
    tops: true,
  });
  // inputs
  const [email, setEmail] = useState('macgie@auxi.app');
  const [search, setSearch] = useState('Linen overshirt');
  const [pwd, setPwd] = useState('123');
  // chips
  const [chips, setChips] = useState<Record<string, boolean>>({ All: true });
  const [removable, setRemovable] = useState(['Calm', 'Effortless', 'Warm']);
  // tabs / segments
  const [segment, setSegment] = useState('Grid');
  const [tab, setTab] = useState('Outfits');
  const [tabBar, setTabBar] = useState('home');
  // cards
  const [pinnedA, setPinnedA] = useState(false);
  // pickers
  const [calDay, setCalDay] = useState(14);
  const [clockPeriod, setClockPeriod] = useState<'AM' | 'PM'>('AM');

  return (
    <View>
      <SectionHeader
        num="04"
        title="Components"
        blurb="Thirteen component groups from the lib/ primitive library — imported and rendered, nothing else. Buttons, dividers, selection, inputs, chips, rows, tabs, cards, avatars, navigation, overlays, date picker, keyboard."
      />

      {/* 1 — Buttons */}
      <SubHead label="Buttons" tag="5 variants · 3 sizes · states" />
      <Stage column>
        <View style={styles.rowWrap}>
          <MButton variant="primary" testID="ds-btn-primary">
            Primary
          </MButton>
          <MButton variant="secondary" testID="ds-btn-secondary">
            Secondary
          </MButton>
          <MButton variant="text" testID="ds-btn-text">
            Text
          </MButton>
        </View>
        <View style={styles.rowWrap}>
          <MButton variant="danger" testID="ds-btn-danger">
            Danger
          </MButton>
          <MButton variant="dangerOutline" testID="ds-btn-danger-outline">
            Danger outline
          </MButton>
          <MIconButton testID="ds-btn-icon" accessibilityLabel="Add item" />
        </View>
        <View style={styles.rowWrap}>
          <MButton size="lg" testID="ds-btn-lg">
            Large
          </MButton>
          <MButton size="md" testID="ds-btn-md">
            Medium
          </MButton>
          <MButton size="sm" testID="ds-btn-sm">
            Small
          </MButton>
        </View>
        <View style={styles.rowWrap}>
          <MButton disabled testID="ds-btn-disabled">
            Disabled
          </MButton>
          <MButton loading testID="ds-btn-loading">
            Loading
          </MButton>
        </View>
      </Stage>

      {/* 2 — Divider */}
      <SubHead label="Dividers" tag="h · labeled · inset" />
      <Stage column>
        <View style={styles.dividerWrap}>
          <MDivider testID="ds-divider-h" />
          <MDivider label="OR" testID="ds-divider-labelled" />
          <MDivider inset={56} testID="ds-divider-inset" />
        </View>
      </Stage>

      {/* 3 — Selection */}
      <SubHead
        label="Selection controls"
        tag="switch · checkbox · radio · checkmenu"
      />
      <Stage column>
        <View style={styles.selWrap}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Daily reminder</Text>
            <MSwitch
              value={notify}
              onValueChange={setNotify}
              testID="ds-switch-reminder"
              accessibilityLabel="Daily reminder"
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Auto-sync wardrobe</Text>
            <MSwitch
              value={autoSync}
              onValueChange={setAutoSync}
              testID="ds-switch-autosync"
              accessibilityLabel="Auto-sync wardrobe"
            />
          </View>
          <View style={styles.groupRow}>
            <MRadio
              label="AM"
              selected={period === 'AM'}
              onSelect={() => setPeriod('AM')}
              testID="ds-radio-am"
            />
            <MRadio
              label="PM"
              selected={period === 'PM'}
              onSelect={() => setPeriod('PM')}
              testID="ds-radio-pm"
            />
            <MRadio
              label="Disabled"
              selected={false}
              onSelect={() => {}}
              disabled
              testID="ds-radio-disabled"
            />
          </View>
          <View style={styles.groupRow}>
            <MCheckbox
              label="Weekdays"
              checked={weekdays}
              onChange={setWeekdays}
              testID="ds-check-weekdays"
            />
            <MCheckbox
              label="Weekends"
              checked={weekends}
              onChange={setWeekends}
              testID="ds-check-weekends"
            />
          </View>
          <MCheckMenu
            options={MENU_OPTS}
            selected={menuSel}
            onToggle={v => setMenuSel(s => ({ ...s, [v]: !s[v] }))}
            testID="ds-checkmenu"
          />
        </View>
      </Stage>

      {/* 4 — Inputs */}
      <SubHead label="Inputs" tag="label · focus · error · icon" />
      <Stage column>
        <View style={styles.colWrap}>
          <MInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            hint="We never share this."
            testID="ds-input-email"
          />
          <MInput
            label="Search wardrobe"
            value={search}
            onChangeText={setSearch}
            placeholder="Search…"
            testID="ds-input-search"
          />
          <MInput
            label="Password"
            value={pwd}
            onChangeText={setPwd}
            secureTextEntry
            error={pwd.length < 6 ? 'Too short' : undefined}
            testID="ds-input-password"
          />
        </View>
      </Stage>

      {/* 5 — Chips / tags / badges */}
      <SubHead label="Chips, tags & badges" tag="filter · removable · status" />
      <Stage column>
        <View style={styles.colWrap}>
          <Caption>Filter chips · tap to toggle (M · 44px)</Caption>
          <View style={styles.chipRow}>
            {FILTERS.map(f => (
              <MChip
                key={f}
                selected={!!chips[f]}
                onPress={() => setChips(c => ({ ...c, [f]: !c[f] }))}
                testID={`ds-chip-${f.toLowerCase()}`}
              >
                {f}
              </MChip>
            ))}
          </View>

          <Caption>Compact chips · SM (24px)</Caption>
          <View style={styles.chipRow}>
            {FILTERS.map(f => (
              <MChip
                key={`sm-${f}`}
                size="sm"
                selected={!!chips[f]}
                onPress={() => setChips(c => ({ ...c, [f]: !c[f] }))}
                testID={`ds-chip-sm-${f.toLowerCase()}`}
              >
                {f}
              </MChip>
            ))}
          </View>

          <View style={styles.removableHead}>
            <Caption>Removable chips · tap to remove</Caption>
            {removable.length < 3 && (
              <Pressable
                onPress={() => setRemovable(['Calm', 'Effortless', 'Warm'])}
                testID="ds-chip-removable-reset"
                accessibilityRole="button"
                accessibilityLabel="Reset removable chips"
              >
                <Text style={styles.resetLink}>Reset</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.chipRow}>
            {removable.map(r => (
              <MChip
                key={r}
                removable
                onRemove={() => setRemovable(list => list.filter(x => x !== r))}
                testID={`ds-chip-removable-${r.toLowerCase()}`}
              >
                {r}
              </MChip>
            ))}
          </View>

          <Caption>Tags & badges</Caption>
          <View style={styles.chipRow}>
            <MTag testID="ds-tag-new">NEW</MTag>
            <MBadge tone="cream" testID="ds-badge-cream">
              Cream
            </MBadge>
            <MBadge tone="tan" testID="ds-badge-tan">
              Tan
            </MBadge>
            <MBadge tone="soft" testID="ds-badge-soft">
              Soft
            </MBadge>
          </View>

          <Caption>Status</Caption>
          <View style={styles.chipRow}>
            <MStatus tone="ok" testID="ds-status-ok">
              Synced
            </MStatus>
            <MStatus tone="warn" testID="ds-status-warn">
              Generating
            </MStatus>
            <MStatus tone="err" testID="ds-status-err">
              Failed
            </MStatus>
            <MStatus tone="info" testID="ds-status-info">
              Info
            </MStatus>
          </View>
        </View>
      </Stage>

      {/* 6 — List rows */}
      <SubHead label="List rows" tag="value · chevron · danger" />
      <Stage variant="plain">
        <View style={styles.phone}>
          <MListRow
            label="Privacy"
            chevron
            onPress={() => {}}
            testID="ds-listrow-privacy"
          />
          <MListRow
            label="Style direction"
            value="Calm, Effortless"
            chevron
            onPress={() => {}}
            testID="ds-listrow-style"
          />
          <MListRow
            label="Your photos"
            chevron
            onPress={() => {}}
            testID="ds-listrow-photos"
          />
          <MListRow
            label="Delete data"
            danger
            onPress={() => {}}
            testID="ds-listrow-delete"
          />
        </View>
      </Stage>

      {/* 7 — Tabs / segments */}
      <SubHead label="Tabs & segments" tag="segmented · underline · dark bar" />
      <Caption>Segmented control</Caption>
      <Stage>
        <MSegmented
          options={['Grid', 'Collage']}
          value={segment}
          onChange={setSegment}
          testID="ds-segmented"
        />
      </Stage>
      <Caption>Underline tabs</Caption>
      <Stage>
        <MTabs
          tabs={['Outfits', 'Saved', 'History']}
          value={tab}
          onChange={setTab}
          testID="ds-tabs"
        />
      </Stage>
      <Caption>Dark tab bar</Caption>
      <Stage variant="dark">
        <MTabBar
          items={[
            { key: 'home', icon: IconGrid },
            { key: 'wardrobe', icon: IconWardrobe },
            { key: 'saved', icon: IconHeart },
            { key: 'me', icon: IconUser },
          ]}
          value={tabBar}
          onChange={setTabBar}
          testID="ds-tabbar"
        />
      </Stage>

      {/* 8 — Cards / tiles */}
      <SubHead label="Cards & tiles" tag="item · outfit · pin" />
      <Stage>
        <MCard
          caption="Linen overshirt"
          sub="Tops · Ecru"
          tag="item"
          fill={color.p200}
          pinned={pinnedA}
          onPinChange={setPinnedA}
          index={0}
          testID="ds-card-overshirt"
        />
        <MCard
          caption="Quiet Monday"
          sub="3 items · Balanced"
          tag="outfit"
          fill={color.n200}
          index={1}
          testID="ds-card-outfit"
        />
      </Stage>

      {/* 9 — Avatar */}
      <SubHead label="Avatar" tag="88 · 44 · initials · fallback" />
      <Stage>
        <MAvatar
          size="lg"
          initials="MG"
          testID="ds-avatar-lg"
          accessibilityLabel="Macgie"
        />
        <MAvatar
          size="sm"
          initials="AX"
          testID="ds-avatar-sm"
          accessibilityLabel="Auxi"
        />
        <MAvatar
          size="sm"
          testID="ds-avatar-fallback"
          accessibilityLabel="No avatar"
        />
      </Stage>

      {/* 10 — Navigation (top app bar) */}
      <SubHead label="Navigation" tag="top app bar" />
      <Stage variant="plain">
        <MTopAppBar
          title="Wardrobe"
          onBack={() => {}}
          onAction={() => {}}
          actionLabel="Add item"
          testID="ds-topbar"
        />
      </Stage>

      {/* 11 — Overlays */}
      <SubHead
        label="Overlays"
        tag="dialog · sheet · snackbar · action-sheet · toast"
      />
      <Stage>
        <OverlayStage label="dialog" height={220} testID="ds-dialog">
          {(visible, dismiss) => (
            <MDialog
              visible={visible}
              title="Delete data"
              message="Auxi will revert to day one. This cannot be undone."
              confirmLabel="Delete"
              destructive
              onConfirm={dismiss}
              onCancel={dismiss}
              testID="ds-dialog"
            />
          )}
        </OverlayStage>
        <OverlayStage label="sheet" height={200} testID="ds-sheet">
          {(visible, dismiss) => (
            <MBottomSheet
              visible={visible}
              onDismiss={dismiss}
              testID="ds-sheet"
            >
              <MSheetOption
                icon={IconCamera}
                label="Take a photo"
                testID="ds-sheet-camera"
              />
              <MSheetOption
                icon={IconGrid}
                label="Upload from gallery"
                testID="ds-sheet-gallery"
              />
            </MBottomSheet>
          )}
        </OverlayStage>
      </Stage>
      <Stage>
        <OverlayStage
          label="action sheet"
          height={300}
          testID="ds-action-sheet"
        >
          {(visible, dismiss) => (
            <MActionSheet
              visible={visible}
              onDismiss={dismiss}
              title="Manage outfit"
              options={[
                { label: 'Share', onPress: dismiss },
                { label: 'Add to favourites', onPress: dismiss },
                { label: 'Delete', destructive: true, onPress: dismiss },
              ]}
              testID="ds-action-sheet"
            />
          )}
        </OverlayStage>
      </Stage>
      <Stage column>
        <TransientStage label="snackbar" testID="ds-snackbar">
          {visible => (
            <MSnackbar
              visible={visible}
              message="Item moved to archive"
              actionLabel="UNDO"
              testID="ds-snackbar"
            />
          )}
        </TransientStage>
        <TransientStage label="mint snackbar" testID="ds-snackbar-mint">
          {visible => (
            <MSnackbar
              visible={visible}
              tone="mint"
              message="Outfit saved"
              actionLabel="UNDO"
              testID="ds-snackbar-mint"
            />
          )}
        </TransientStage>
        <TransientStage label="toast" testID="ds-toast">
          {visible => (
            <MToast
              visible={visible}
              message="Generating your look…"
              testID="ds-toast"
            />
          )}
        </TransientStage>
      </Stage>

      {/* 12 — Date picker */}
      <SubHead label="Date picker" tag="calendar · time" />
      <Stage>
        <MCalendar
          value={calDay}
          onChange={setCalDay}
          today={9}
          testID="ds-calendar"
        />
      </Stage>
      <Stage>
        <MTimePicker
          period={clockPeriod}
          onPeriodChange={setClockPeriod}
          testID="ds-time-picker"
        />
      </Stage>

      {/* 13 — Keyboard (showcase-only static demo) */}
      <SubHead label="Keyboard" tag="qwerty · showcase-only" />
      <Stage variant="plain">
        <MKeyboardDemo />
      </Stage>
    </View>
  );
};

const styles = StyleSheet.create({
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s3,
    alignItems: 'center',
  },
  dividerWrap: { width: '100%', gap: space.s5 },
  selWrap: { width: '100%', gap: space.s4 },
  colWrap: { width: '100%', gap: space.s3 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: { ...type.body, color: role.ink },
  groupRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s6 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s2,
    alignItems: 'center',
  },
  removableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.s2,
  },
  resetLink: {
    ...type.caption,
    fontFamily: type.h3.fontFamily,
    color: color.p600,
  },
  phone: {
    width: 320,
    backgroundColor: color.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: role.line,
    overflow: 'hidden',
  },
  demoCol: { alignItems: 'center', gap: space.s3 },
  trigger: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: role.ink,
  },
  triggerText: { ...type.bodySm, color: role.ink },
  scrimBox: {
    width: 320,
    borderRadius: radius['2xl'],
    overflow: 'hidden',
    backgroundColor: role.surface,
    borderWidth: 1,
    borderColor: role.lineCream,
  },
});
