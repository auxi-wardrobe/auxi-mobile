/**
 * Design System — List rows + Tabs/Segments (NEW showcase).
 * List rows: press → bg fade + chevron nudge. Segmented control + underline tabs
 * share a SLIDING spring indicator (translateX + width, spring.confident). Dark
 * tab bar: active icon springs up. Springy floating-pill footer → DsFloatingPill.
 */
import React, { useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useReducedMotion } from '../../theme/motion';
import { Icons } from '../../assets/icons';
import { color, radius, role, shadow, space, type } from './ds-tokens';
import { usePressHighlight, useToggleValue } from './DsMotion';

/**
 * Shared sliding-indicator hook for segmented control + underline tabs: measures
 * each segment's x/width, then springs an Animated x + width to the active one
 * (spring.confident). Reduce-motion jumps. Returns the indicator anim values +
 * an onLayout factory + a move(i) commit.
 */
const useSlidingIndicator = (active: number) => {
  const reduce = useReducedMotion();
  const x = useRef(new Animated.Value(0)).current;
  const w = useRef(new Animated.Value(0)).current;
  const xs = useRef<number[]>([]);
  const widths = useRef<number[]>([]);

  const settle = (i: number) => {
    const tx = xs.current[i] ?? 0;
    const tw = widths.current[i] ?? 0;
    if (reduce) {
      x.setValue(tx);
      w.setValue(tw);
      return;
    }
    const cfg = {
      stiffness: 350,
      damping: 28,
      mass: 1,
      useNativeDriver: false,
    };
    Animated.spring(x, { toValue: tx, ...cfg }).start();
    Animated.spring(w, { toValue: tw, ...cfg }).start();
  };

  const onLayout = (i: number) => (e: LayoutChangeEvent) => {
    const { x: lx, width } = e.nativeEvent.layout;
    xs.current[i] = lx;
    widths.current[i] = width;
    if (i === active) {
      x.setValue(lx);
      w.setValue(width);
    }
  };

  return { x, w, onLayout, settle };
};

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
}> = ({ label, value, chevron, danger }) => {
  // press → bg fade + chevron nudges right a few px.
  const { v, onPressIn, onPressOut } = usePressHighlight();
  const bg = v.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', color.n50],
  });
  const nudge = v.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });
  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      testID={`ds-listrow-${label.toLowerCase().replace(/\s+/g, '-')}`}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.row, { backgroundColor: bg }]}>
        <Text style={[styles.rowLabel, danger && styles.rowDanger]}>
          {label}
        </Text>
        {!!value && <Text style={styles.rowValue}>{value}</Text>}
        {danger ? (
          <IconTrash width={20} height={20} color={color.da400} />
        ) : chevron ? (
          <Animated.View style={{ transform: [{ translateX: nudge }] }}>
            <IconChevronRight width={20} height={20} color={role.ink3} />
          </Animated.View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
};

/* ---------------- segmented ---------------- */
export const DsSegmented: React.FC = () => {
  const opts = ['Grid', 'Collage'];
  const [idx, setIdx] = useState(0);
  const { x, w, onLayout, settle } = useSlidingIndicator(idx);
  return (
    <View style={styles.seg}>
      <Animated.View style={[styles.segThumb, { left: x, width: w }]} />
      {opts.map((o, i) => {
        const sel = i === idx;
        return (
          <Pressable
            key={o}
            onLayout={onLayout(i)}
            onPress={() => {
              setIdx(i);
              settle(i);
            }}
            style={styles.segBtn}
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
  const [idx, setIdx] = useState(0);
  const { x, w, onLayout, settle } = useSlidingIndicator(idx);
  return (
    <View style={styles.tabs}>
      <Animated.View style={[styles.tabUnderline, { left: x, width: w }]} />
      {tabs.map((tb, i) => {
        const sel = i === idx;
        return (
          <Pressable
            key={tb}
            onLayout={onLayout(i)}
            onPress={() => {
              setIdx(i);
              settle(i);
            }}
            style={styles.tab}
            testID={`ds-tab-${tb.toLowerCase()}${sel ? '-active' : ''}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: sel }}
          >
            <Text style={[styles.tabText, sel && styles.tabTextOn]}>{tb}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

/* ---------------- dark tab bar ---------------- */
const TabBarItem: React.FC<{
  itemKey: string;
  Icon: React.FC<any>;
  sel: boolean;
  onPress: () => void;
}> = ({ itemKey, Icon, sel, onPress }) => {
  // active icon springs up (scale 1 → 1.12) when selected.
  const pop = useToggleValue(sel, 200);
  const iconScale = pop.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  return (
    <Pressable
      onPress={onPress}
      style={styles.tbItem}
      testID={`ds-tabbar-${itemKey}${sel ? '-active' : ''}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: sel }}
    >
      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
        <Icon width={24} height={24} color={sel ? color.p50 : color.n400} />
      </Animated.View>
      <Text style={[styles.tbLabel, sel && styles.tbLabelOn]}>{itemKey}</Text>
    </Pressable>
  );
};

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
      {items.map(({ key, Icon }) => (
        <TabBarItem
          key={key}
          itemKey={key}
          Icon={Icon}
          sel={key === on}
          onPress={() => setOn(key)}
        />
      ))}
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
  },
  segThumb: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: color.white,
    borderRadius: radius.full,
    ...shadow.card,
  },
  segBtn: {
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: radius.full,
  },
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
