// OutfitSwipeDeck — Tinder-style single-axis card deck for Home.
// See docs/superpowers/specs/2026-06-12-home-tinder-swipe-design.md and
// docs/MOTION_SYSTEM.md. Built on PanResponder + Animated (no new dep),
// mirroring OutfitCanvasSurface. The card follows the finger live; on release
// it either commits (flies off) or springs back (critically damped, no bounce).
import React, { useCallback, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import {
  motion,
  rotationForDx,
  isCommit,
  useReducedMotion,
} from '../../theme/motion';

const { width: SCREEN_W } = Dimensions.get('window');

type Role = 'active' | 'peek';

type Props<T> = {
  items: T[];
  activeIndex: number;
  cardHeight: number;
  /** False while a collage item is being dragged — freezes the deck swipe. */
  swipeEnabled: boolean;
  keyOf: (item: T) => string;
  renderCard: (item: T, role: Role) => React.ReactNode;
  onLike: (item: T) => void;
  onSkip: (item: T) => void;
  /** Optional like/skip cue overlay driven by the live drag position. */
  renderCue?: (
    likeOpacity: Animated.AnimatedInterpolation<number>,
    skipOpacity: Animated.AnimatedInterpolation<number>,
  ) => React.ReactNode;
  testID?: string;
};

export function OutfitSwipeDeck<T>({
  items,
  activeIndex,
  cardHeight,
  swipeEnabled,
  keyOf,
  renderCard,
  onLike,
  onSkip,
  renderCue,
  testID,
}: Props<T>) {
  const reduced = useReducedMotion();
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const active = items[activeIndex];
  const peek = items[activeIndex + 1];

  const commit = useCallback(
    (dir: 1 | -1) => {
      const item = items[activeIndex];
      Animated.timing(pan, {
        toValue: { x: dir * SCREEN_W * 1.4, y: 0 },
        duration: motion.duration.normal,
        easing: motion.easing.exit,
        useNativeDriver: true,
      }).start(() => {
        // Advance first (remounts the next card keyed differently), then reset
        // the shared pan for the promoted card — avoids a centre-flash frame.
        if (dir === 1) {
          onLike(item);
        } else {
          onSkip(item);
        }
        pan.setValue({ x: 0, y: 0 });
      });
    },
    [activeIndex, items, onLike, onSkip, pan],
  );

  const cancel = useCallback(() => {
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      stiffness: motion.spring.standard.stiffness,
      damping: motion.spring.standard.damping,
      mass: 1,
      useNativeDriver: true,
    }).start();
  }, [pan]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          swipeEnabled &&
          !reduced &&
          Math.abs(g.dx) > Math.abs(g.dy) &&
          Math.abs(g.dx) > 6,
        onPanResponderMove: (_, g) => pan.setValue({ x: g.dx, y: 0 }),
        onPanResponderRelease: (_, g) => {
          if (isCommit(g.dx, g.vx, SCREEN_W)) {
            commit(g.dx > 0 ? 1 : -1);
          } else {
            cancel();
          }
        },
        onPanResponderTerminate: cancel,
        onPanResponderTerminationRequest: () => false,
      }),
    [swipeEnabled, reduced, pan, commit, cancel],
  );

  const cap = rotationForDx(SCREEN_W, SCREEN_W);
  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_W, 0, SCREEN_W],
    outputRange: [`${-cap}deg`, '0deg', `${cap}deg`],
  });
  const likeOpacity = pan.x.interpolate({
    inputRange: [0, SCREEN_W * 0.3],
    outputRange: [motion.opacity.hidden, motion.opacity.visible],
    extrapolate: 'clamp',
  });
  const skipOpacity = pan.x.interpolate({
    inputRange: [-SCREEN_W * 0.3, 0],
    outputRange: [motion.opacity.visible, motion.opacity.hidden],
    extrapolate: 'clamp',
  });
  const peekScale = pan.x.interpolate({
    inputRange: [-SCREEN_W, 0, SCREEN_W],
    outputRange: [1, 0.98, 1],
    extrapolate: 'clamp',
  });

  const cardStyle: ViewStyle = { height: cardHeight, width: '100%' };
  const a11yActions = useMemo(
    () => [
      { name: 'like' as const, label: 'Like outfit' },
      { name: 'skip' as const, label: 'Skip outfit' },
    ],
    [],
  );

  if (!active) {
    return null;
  }

  return (
    <View testID={testID} style={[styles.stack, { height: cardHeight }]}>
      {peek ? (
        <Animated.View
          key={`peek-${keyOf(peek)}`}
          style={[
            styles.cardBase,
            cardStyle,
            { transform: [{ scale: peekScale }] },
          ]}
          pointerEvents="none"
          // The background card is decorative until promoted: keep its subtree
          // out of the accessibility / test tree so VoiceOver doesn't announce
          // the hidden card and duplicate testIDs (e.g. home-remix) don't clash.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {renderCard(peek, 'peek')}
        </Animated.View>
      ) : null}

      <Animated.View
        key={`active-${keyOf(active)}`}
        accessibilityActions={a11yActions}
        onAccessibilityAction={e => {
          if (e.nativeEvent.actionName === 'like') {
            onLike(active);
          }
          if (e.nativeEvent.actionName === 'skip') {
            onSkip(active);
          }
        }}
        style={[
          styles.cardBase,
          cardStyle,
          { transform: [{ translateX: pan.x }, { rotate }] },
        ]}
        {...responder.panHandlers}
      >
        {renderCue ? renderCue(likeOpacity, skipOpacity) : null}
        {renderCard(active, 'active')}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { width: '100%', position: 'relative' },
  cardBase: { position: 'absolute', top: 0, left: 0, right: 0 },
});
