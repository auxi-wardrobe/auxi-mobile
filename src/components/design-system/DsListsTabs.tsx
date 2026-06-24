/**
 * Design System — List rows + Tabs/Segments (NEW showcase).
 * List: value · chevron · danger. Segmented control · underline tabs · dark tab
 * bar. The springy floating-pill footer lives in DsFloatingPill.tsx.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icons } from '../../assets/icons';
import { color, radius, role, shadow, space, type } from './ds-tokens';

const IconChevronRight = Icons.ChevronRight;
const IconTrash = Icons.Trash;
const IconGrid = Icons.Grid;
const IconHeart = Icons.Heart;
const IconWardrobe = Icons.Wardrobe;
const IconUser = Icons.User;

/* ---------------- list rows ---------------- */
export const DsListRows: React.FC = () => (
  <View style={styles.phone}>
    <Row label="Privacy" chevron />
    <Row label="Style direction" value="Calm, Effortless" chevron />
    <Row label="Your photos" chevron />
    <Row label="Delete data" danger />
  </View>
);

const Row: React.FC<{
  label: string;
  value?: string;
  chevron?: boolean;
  danger?: boolean;
}> = ({ label, value, chevron, danger }) => (
  <View
    style={styles.row}
    testID={`ds-listrow-${label.toLowerCase().replace(/\s+/g, '-')}`}
  >
    <Text style={[styles.rowLabel, danger && styles.rowDanger]}>{label}</Text>
    {!!value && <Text style={styles.rowValue}>{value}</Text>}
    {danger ? (
      <IconTrash width={20} height={20} color={color.da400} />
    ) : chevron ? (
      <IconChevronRight width={20} height={20} color={role.ink3} />
    ) : null}
  </View>
);

/* ---------------- segmented ---------------- */
export const DsSegmented: React.FC = () => {
  const opts = ['Grid', 'Collage'];
  const [on, setOn] = useState(opts[0]);
  return (
    <View style={styles.seg}>
      {opts.map(o => {
        const sel = o === on;
        return (
          <Pressable
            key={o}
            onPress={() => setOn(o)}
            style={[styles.segBtn, sel && styles.segBtnOn]}
            testID={`ds-segmented-${o.toLowerCase()}${sel ? '-active' : ''}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: sel }}
          >
            <Text style={[styles.segText, sel && styles.segTextOn]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

/* ---------------- underline tabs ---------------- */
export const DsTabs: React.FC = () => {
  const tabs = ['Outfits', 'Saved', 'History'];
  const [on, setOn] = useState(tabs[0]);
  return (
    <View style={styles.tabs}>
      {tabs.map(tb => {
        const sel = tb === on;
        return (
          <Pressable
            key={tb}
            onPress={() => setOn(tb)}
            style={styles.tab}
            testID={`ds-tab-${tb.toLowerCase()}${sel ? '-active' : ''}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: sel }}
          >
            <Text style={[styles.tabText, sel && styles.tabTextOn]}>{tb}</Text>
            {sel && <View style={styles.tabUnderline} />}
          </Pressable>
        );
      })}
    </View>
  );
};

/* ---------------- dark tab bar ---------------- */
export const DsTabBar: React.FC = () => {
  const items: Array<{ key: string; Icon: React.FC<any> }> = [
    { key: 'home', Icon: IconGrid },
    { key: 'wardrobe', Icon: IconWardrobe },
    { key: 'saved', Icon: IconHeart },
    { key: 'me', Icon: IconUser },
  ];
  const [on, setOn] = useState('home');
  return (
    <View style={styles.tabbar}>
      {items.map(({ key, Icon }) => {
        const sel = key === on;
        return (
          <Pressable
            key={key}
            onPress={() => setOn(key)}
            style={styles.tbItem}
            testID={`ds-tabbar-${key}${sel ? '-active' : ''}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: sel }}
          >
            <Icon width={24} height={24} color={sel ? color.p50 : color.n400} />
            <Text style={[styles.tbLabel, sel && styles.tbLabelOn]}>{key}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  phone: {
    width: 320,
    backgroundColor: color.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: role.line,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingVertical: space.s4,
    paddingHorizontal: space.s4,
    borderBottomWidth: 1,
    borderBottomColor: role.lineCream,
  },
  rowLabel: { ...type.bodySm, color: role.ink, flex: 1, fontSize: 15 },
  rowDanger: { color: color.da400 },
  rowValue: { ...type.bodySm, color: role.ink3, fontSize: 13.5 },
  seg: {
    flexDirection: 'row',
    backgroundColor: color.n100,
    borderRadius: radius.full,
    padding: 4,
    gap: 2,
  },
  segBtn: {
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: radius.full,
  },
  segBtnOn: { backgroundColor: color.white, ...shadow.card },
  segText: { ...type.bodySm, color: role.ink3 },
  segTextOn: { color: role.ink, fontFamily: type.h3.fontFamily },
  tabs: {
    flexDirection: 'row',
    gap: space.s5,
    borderBottomWidth: 1,
    borderBottomColor: role.line,
  },
  tab: { paddingBottom: 10, alignItems: 'center' },
  tabText: { ...type.bodySm, color: role.ink3 },
  tabTextOn: { color: role.ink, fontFamily: type.h3.fontFamily },
  tabUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 2.5,
    borderRadius: 3,
    backgroundColor: role.ink,
  },
  tabbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: color.n800,
    paddingTop: 12,
    paddingBottom: 18,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    width: 300,
  },
  tbItem: { alignItems: 'center', gap: 4 },
  tbLabel: {
    fontFamily: type.caption.fontFamily,
    fontSize: 10,
    color: color.n400,
    textTransform: 'capitalize',
  },
  tbLabelOn: { color: color.p50 },
});
