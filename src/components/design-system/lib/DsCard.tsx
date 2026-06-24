/**
 * DsCard / DsTile — self-contained item/outfit tile (image · caption · pin).
 *
 *   import { DsCard } from '../components/design-system/lib';
 *   <DsCard caption="Linen overshirt" sub="Tops · Ecru" tag="item"
 *           source={{ uri }} pinned={p} onPinChange={setP} />
 *   <DsTile caption="Quiet Monday" sub="3 items" tag="outfit" fill="#E0D2C4" />
 *
 * Entrance fade-up stagger (index) + press scale; pin button (press scale 1.06)
 * + pin-status slide-in. Controlled `pinned`+`onPinChange` ⇒ pinnable. Tokens +
 * motion encapsulated INSIDE. Honors reduce-motion. `DsTile` aliases `DsCard`.
 */
import React from 'react';
import {
  Animated,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Icons } from '../../../assets/icons';
import { color, MONO, radius, role, shadow, type } from '../ds-tokens';
import { useEntrance, usePressHighlight, useToggleValue } from '../DsMotion';

const IconPlus = Icons.Plus;
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-');

export interface DsCardProps {
  caption: string;
  sub?: string;
  tag?: string;
  /** solid placeholder fill when no image */
  fill?: string;
  source?: ImageSourcePropType;
  /** controlled pin state; presence of onPinChange makes the tile pinnable */
  pinned?: boolean;
  onPinChange?: (next: boolean) => void;
  onPress?: () => void;
  /** entrance stagger index when a row of tiles mounts */
  index?: number;
  testID?: string;
  accessibilityLabel?: string;
}

export const DsCard: React.FC<DsCardProps> = ({
  caption,
  sub,
  tag,
  fill = color.p200,
  source,
  pinned = false,
  onPinChange,
  onPress,
  index = 0,
  testID,
  accessibilityLabel,
}) => {
  const statusV = useToggleValue(pinned, 200);
  const press = usePressHighlight();
  const entrance = useEntrance(index);
  const pinnable = !!onPinChange;
  const translateY = statusV.interpolate({
    inputRange: [0, 1],
    outputRange: [-3, 0],
  });
  const pressScale = press.v.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.97],
  });
  const base = testID ?? `ds-card-${slug(caption)}`;

  return (
    <Animated.View style={entrance}>
      <Pressable
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        testID={base}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? caption}
      >
        <Animated.View
          style={[styles.tile, { transform: [{ scale: pressScale }] }]}
        >
          <View style={[styles.tileImg, { backgroundColor: fill }]}>
            {!!source && <Image source={source} style={styles.img} />}
            {pinnable && (
              <PinButton
                pinned={pinned}
                onPress={() => onPinChange(!pinned)}
                testID={`${base}-pin`}
              />
            )}
            {pinnable && (
              <Animated.View
                style={[
                  styles.pinStatus,
                  { opacity: statusV, transform: [{ translateY }] },
                ]}
                testID={`${base}-pin-status`}
              >
                <View style={styles.pinStatusDot} />
                <Text style={styles.pinStatusText}>Pinned</Text>
              </Animated.View>
            )}
            {!!tag && (
              <View style={styles.tileTag}>
                <Text style={styles.tileTagText}>{tag}</Text>
              </View>
            )}
          </View>
          <View style={styles.tileCap}>
            <Text style={styles.tileCapText}>{caption}</Text>
            {!!sub && <Text style={styles.tileSub}>{sub}</Text>}
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

export const DsTile = DsCard;

const PinButton: React.FC<{
  pinned: boolean;
  onPress: () => void;
  testID: string;
}> = ({ pinned, onPress, testID }) => {
  const v = useToggleValue(false, 160);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  return (
    <Pressable
      onPressIn={() => v.setValue(1)}
      onPressOut={() => v.setValue(0)}
      onPress={onPress}
      testID={pinned ? `${testID}-pinned` : testID}
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
  img: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' },
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
});
