// OutfitSwipeDeck — Tinder-style single-axis card deck for Home.
// See docs/superpowers/specs/2026-06-12-home-tinder-swipe-design.md and
// docs/MOTION_SYSTEM.md. Built on PanResponder + Animated (no new dep),
// mirroring OutfitCanvasSurface. The card follows the finger live; on release
// it either commits (flies off) or springs back (critically damped, no bounce).
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { motion, isCommit, useReducedMotion } from '../../theme/motion';
import { theme } from '../../theme/theme';

const { width: SCREEN_W } = Dimensions.get('window');

type Role = 'active' | 'peek';

type Props<T> = {
  items: T[];
  activeIndex: number;
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

  // Latest props for the gesture closures (the PanResponder is created once).
  // Reading these from refs keeps `commit`/the responder stable across card
  // advances (no mid-gesture responder teardown) and means `commit` always
  // resolves the CURRENT active item, not a stale one captured at create time.
  const itemsRef = useRef(items);
  const activeIndexRef = useRef(activeIndex);
  const onLikeRef = useRef(onLike);
  const onSkipRef = useRef(onSkip);
  useEffect(() => {
    itemsRef.current = items;
    activeIndexRef.current = activeIndex;
    onLikeRef.current = onLike;
    onSkipRef.current = onSkip;
  });
  // True while a commit fling is in flight — drops a second rapid swipe so it
  // cannot double-save / double-advance the same card.
  const committingRef = useRef(false);

  const commit = useCallback(
    (dir: 1 | -1) => {
      if (committingRef.current) {
        return;
      }
      committingRef.current = true;
      const item = itemsRef.current[activeIndexRef.current];
      Animated.timing(pan, {
        toValue: { x: dir * SCREEN_W * 1.4, y: 0 },
        duration: motion.duration.normal,
        easing: motion.easing.exit,
        useNativeDriver: true,
      }).start(() => {
        // Reset the shared pan BEFORE advancing so the promoted card mounts at
        // centre (not at the flung offset) — avoids a one-frame centre-flash.
        pan.setValue({ x: 0, y: 0 });
        committingRef.current = false;
        if (dir === 1) {
          onLikeRef.current(item);
        } else {
          onSkipRef.current(item);
        }
      });
    },
    [pan],
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
          !committingRef.current &&
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

  // Cards fill the deck via absolute insets (see cardBase), so the deck stack
  // flex-fills its parent and the card height follows the available space.
  const cardStyle: ViewStyle = { width: '100%' };
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
    <View testID={testID} style={styles.stack}>
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
          styles.activeCard,
          cardStyle,
          { transform: [{ translateX: pan.x }] },
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
  stack: { flex: 1, width: '100%', position: 'relative' },
  cardBase: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  // AU-359: during a hold/swipe the active card carries a live translateX +
  // rotate (±6°). Without self-clipping, the rotation exposes a hairline of the
  // peek card's cream tile surface (figmaCardSurface) at the screen edge and a
  // ragged corner seam where iOS can't anti-alias a child tile's overflow mask
  // mid-transform. Clipping the moving card to its own bounds and backing it
  // with the white app surface makes the rotated corners read as white-on-white
  // (matching the screen) and masks the peek card beneath — clean photo edge.
  // Applied to the ACTIVE card only; the peek card must stay unclipped so its
  // scale-up affordance still reads behind the active card.
  activeCard: {
    overflow: 'hidden',
    backgroundColor: theme.colors.figmaSurface,
  },
});
