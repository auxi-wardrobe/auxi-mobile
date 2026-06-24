/**
 * DsSegmented / DsTabs — self-contained sliding-indicator controls.
 *
 *   import { DsSegmented, DsTabs } from '../components/design-system/lib';
 *   <DsSegmented options={['Grid','Collage']} value={v} onChange={setV} />
 *   <DsTabs tabs={['Outfits','Saved']} value={v} onChange={setV} />
 *
 * Both share a spring sliding thumb / underline (useSlidingIndicator). Tokens +
 * motion encapsulated INSIDE. Honors reduce-motion (jumps).
 */
import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, role, shadow, space, type } from '../ds-tokens';
import { useSlidingIndicator } from './useSlidingIndicator';

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');

export interface DsSegmentedProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  testID?: string;
}

export const DsSegmented: React.FC<DsSegmentedProps> = ({
  options,
  value,
  onChange,
  testID,
}) => {
  const idx = Math.max(0, options.indexOf(value));
  const { x, w, onLayout, settle } = useSlidingIndicator(idx);
  return (
    <View style={styles.seg} testID={testID}>
      <Animated.View style={[styles.segThumb, { left: x, width: w }]} />
      {options.map((o, i) => {
        const sel = o === value;
        return (
          <Pressable
            key={o}
            onLayout={onLayout(i)}
            onPress={() => {
              onChange(o);
              settle(i);
            }}
            style={styles.segBtn}
            testID={
              testID ? `${testID}-${slug(o)}${sel ? '-active' : ''}` : undefined
            }
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

export interface DsTabsProps {
  tabs: string[];
  value: string;
  onChange: (value: string) => void;
  testID?: string;
}

export const DsTabs: React.FC<DsTabsProps> = ({
  tabs,
  value,
  onChange,
  testID,
}) => {
  const idx = Math.max(0, tabs.indexOf(value));
  const { x, w, onLayout, settle } = useSlidingIndicator(idx);
  return (
    <View style={styles.tabs} testID={testID}>
      <Animated.View style={[styles.tabUnderline, { left: x, width: w }]} />
      {tabs.map((tb, i) => {
        const sel = tb === value;
        return (
          <Pressable
            key={tb}
            onLayout={onLayout(i)}
            onPress={() => {
              onChange(tb);
              settle(i);
            }}
            style={styles.tab}
            testID={
              testID
                ? `${testID}-${slug(tb)}${sel ? '-active' : ''}`
                : undefined
            }
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

const styles = StyleSheet.create({
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
});
