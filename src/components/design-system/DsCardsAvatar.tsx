/**
 * Design System — Cards/Tiles + Avatar + Top app bar (NEW showcase).
 * Tile: entrance fade-up stagger on mount + press scale .97; pin button (press →
 * scale 1.06) + pin-status slide-in (opacity + translateY -3→0). Avatar 88 / 44.
 * Top app bar: back + title + action, each icon presses (scale .88 + bg fade).
 */
import React, { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icons } from '../../assets/icons';
import { color, MONO, radius, role, shadow, space, type } from './ds-tokens';
import { useEntrance, usePressHighlight, useToggleValue } from './DsMotion';

const IconChevronLeft = Icons.ChevronLeft;
const IconPlus = Icons.Plus;
const IconUser = Icons.User;

/* ---------------- tile ---------------- */
export const DsTile: React.FC<{
  caption: string;
  sub: string;
  tag: string;
  pinnable?: boolean;
  fill: string;
  /** entrance stagger index when a row of tiles mounts (default 0). */
  index?: number;
}> = ({ caption, sub, tag, pinnable, fill, index = 0 }) => {
  const [pinned, setPinned] = useState(false);
  const statusV = useToggleValue(pinned, 200);
  const press = usePressHighlight();
  const entrance = useEntrance(index);
  const opacity = statusV;
  const translateY = statusV.interpolate({
    inputRange: [0, 1],
    outputRange: [-3, 0],
  });
  const pressScale = press.v.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.97],
  });

  return (
    <Animated.View style={entrance}>
      <Pressable
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        testID={`ds-tile-${caption.toLowerCase().replace(/\s+/g, '-')}`}
        accessibilityRole="button"
        accessibilityLabel={caption}
      >
        <Animated.View
          style={[styles.tile, { transform: [{ scale: pressScale }] }]}
        >
          <View style={[styles.tileImg, { backgroundColor: fill }]}>
            {pinnable && (
              <PinButton pinned={pinned} onPress={() => setPinned(p => !p)} />
            )}
            {pinnable && (
              <Animated.View
                style={[
                  styles.pinStatus,
                  { opacity, transform: [{ translateY }] },
                ]}
                testID="ds-tile-pin-status"
              >
                <View style={styles.pinStatusDot} />
                <Text style={styles.pinStatusText}>Pinned</Text>
              </Animated.View>
            )}
            <View style={styles.tileTag}>
              <Text style={styles.tileTagText}>{tag}</Text>
            </View>
          </View>
          <View style={styles.tileCap}>
            <Text style={styles.tileCapText}>{caption}</Text>
            <Text style={styles.tileSub}>{sub}</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const PinButton: React.FC<{ pinned: boolean; onPress: () => void }> = ({
  pinned,
  onPress,
}) => {
  const v = useToggleValue(false, 160);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  return (
    <Pressable
      onPressIn={() => v.setValue(1)}
      onPressOut={() => v.setValue(0)}
      onPress={onPress}
      testID={pinned ? 'ds-tile-pin-pinned' : 'ds-tile-pin'}
      accessibilityRole="button"
      accessibilityLabel={pinned ? 'Unpin item' : 'Pin item'}
      accessibilityState={{ selected: pinned }}
    >
      <Animated.View
        style={[styles.pin, pinned && styles.pinOn, { transform: [{ scale }] }]}
      >
        <IconPlus
          width={16}
          height={16}
          color={pinned ? color.white : role.ink}
        />
      </Animated.View>
    </Pressable>
  );
};

/* ---------------- avatar ---------------- */
export const DsAvatars: React.FC = () => (
  <View style={styles.avatarRow}>
    <View style={styles.avLg} testID="ds-avatar-lg-initials">
      <Text style={styles.avLgText}>MG</Text>
    </View>
    <View style={styles.avSm} testID="ds-avatar-sm-initials">
      <Text style={styles.avSmText}>AX</Text>
    </View>
    <View style={[styles.avSm, styles.avFallback]} testID="ds-avatar-fallback">
      <IconUser width={22} height={22} color={color.p50} />
    </View>
  </View>
);

/* ---------------- top app bar ---------------- */
const TopIcon: React.FC<{
  Icon: React.FC<any>;
  testID: string;
  accessibilityLabel: string;
}> = ({ Icon, testID, accessibilityLabel }) => {
  const press = usePressHighlight();
  const scale = press.v.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.88],
  });
  const bg = press.v.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', color.n100],
  });
  return (
    <Pressable
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={[styles.topIcon, { backgroundColor: bg, transform: [{ scale }] }]}
      >
        <Icon width={22} height={22} color={role.ink} />
      </Animated.View>
    </Pressable>
  );
};

export const DsTopBar: React.FC = () => (
  <View style={styles.topbar} testID="ds-topbar">
    <TopIcon
      Icon={IconChevronLeft}
      testID="ds-topbar-back"
      accessibilityLabel="Back"
    />
    <Text style={styles.topTitle}>Wardrobe</Text>
    <TopIcon
      Icon={IconPlus}
      testID="ds-topbar-action"
      accessibilityLabel="Add item"
    />
  </View>
);

const styles = StyleSheet.create({
  tile: {
    width: 158,
    backgroundColor: color.white,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: role.line,
    overflow: 'hidden',
    ...shadow.card,
  },
  tileImg: { height: 200 },
  pin: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: color.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  pinOn: { backgroundColor: role.ink },
  pinStatus: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: color.white,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    ...shadow.card,
  },
  pinStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.su200,
  },
  pinStatusText: {
    fontFamily: type.caption.fontFamily,
    fontSize: 10.5,
    color: role.ink,
  },
  tileTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: color.white,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.full,
  },
  tileTagText: {
    fontFamily: MONO,
    fontSize: 9.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: role.ink2,
  },
  tileCap: { paddingHorizontal: 11, paddingTop: 9, paddingBottom: 11 },
  tileCapText: {
    ...type.bodySm,
    fontFamily: type.h3.fontFamily,
    color: role.ink,
  },
  tileSub: { ...type.caption, color: role.ink3, marginTop: 2 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  avLg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: role.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avLgText: { fontFamily: type.h1.fontFamily, fontSize: 30, color: color.p50 },
  avSm: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: role.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avSmText: { fontFamily: type.h3.fontFamily, fontSize: 16, color: color.p50 },
  avFallback: { backgroundColor: color.p400 },
  topbar: {
    width: 300,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: role.line,
    paddingHorizontal: space.s3,
    paddingVertical: space.s2,
  },
  topIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { ...type.h3, color: role.ink },
});
