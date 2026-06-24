/**
 * MTabBar — self-contained dark bottom tab bar (icon springs up when active).
 *
 *   import { MTabBar } from '../components/design-system/lib';
 *   <MTabBar items={[{ key:'home', icon: IconGrid }]} value={tab} onChange={setTab} />
 *
 * Active icon springs (scale 1→1.12). Tokens + motion encapsulated INSIDE.
 * Honors reduce-motion.
 */
import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, type } from '../m-tokens';
import { useToggleValue } from '../MMotion';

type IconCmp = React.FC<{ width?: number; height?: number; color?: string }>;

export interface MTabBarItem {
  key: string;
  icon: IconCmp;
  label?: string;
}

export interface MTabBarProps {
  items: MTabBarItem[];
  value: string;
  onChange: (key: string) => void;
  testID?: string;
}

const Item: React.FC<{
  item: MTabBarItem;
  sel: boolean;
  onPress: () => void;
  testID?: string;
}> = ({ item, sel, onPress, testID }) => {
  const pop = useToggleValue(sel, 200);
  const iconScale = pop.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  return (
    <Pressable
      onPress={onPress}
      style={styles.tbItem}
      testID={testID}
      accessibilityRole="tab"
      accessibilityState={{ selected: sel }}
      accessibilityLabel={item.label ?? item.key}
    >
      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
        <item.icon
          width={24}
          height={24}
          color={sel ? color.p50 : color.n400}
        />
      </Animated.View>
      <Text style={[styles.tbLabel, sel && styles.tbLabelOn]}>
        {item.label ?? item.key}
      </Text>
    </Pressable>
  );
};

export const MTabBar: React.FC<MTabBarProps> = ({
  items,
  value,
  onChange,
  testID,
}) => (
  <View style={styles.tabbar} testID={testID}>
    {items.map(item => {
      const sel = item.key === value;
      return (
        <Item
          key={item.key}
          item={item}
          sel={sel}
          onPress={() => onChange(item.key)}
          testID={
            testID ? `${testID}-${item.key}${sel ? '-active' : ''}` : undefined
          }
        />
      );
    })}
  </View>
);

const styles = StyleSheet.create({
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
