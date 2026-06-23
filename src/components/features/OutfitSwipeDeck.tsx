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
import {
  motion,
  rotationForDx,
  isCommit,
  useReducedMotion,
} from '../../theme/motion';
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
  /** Advance to the next suggestion (swipe left). */
  onForward: (item: T) => void;
  /** Return to the previous suggestion (swipe right). No-op at the first card. */
  onBack: (item: T) => void;
  /** Optional next/back cue overlay driven by the live drag position. */
  renderCue?: (
    forwardOpacity: Animated.AnimatedInterpolation<number>,
    backOpacity: Animated.AnimatedInterpolation<number>,
  ) => React.ReactNode;
  testID?: string;
};

export function OutfitSwipeDeck<T>({
  items,
  activeIndex,
  swipeEnabled,
  keyOf,
  renderCard,
  onForward,
  onBack,
  renderCue,
  testID,
}: Props<T>) {
  const reduced = useReducedMotion();
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const active = items[activeIndex];
  const peek = items[activeIndex + 1];
  const prev = items[activeIndex - 1];

  // Latest props for the gesture closures (the PanResponder is created once).
  // Reading these from refs keeps `commit`/the responder stable across card
  // advances (no mid-gesture responder teardown) and means `commit` always
  // resolves the CURRENT active item, not a stale one captured at create time.
  const itemsRef = useRef(items);
  const activeIndexRef = useRef(activeIndex);
  const onForwardRef = useRef(onForward);
  const onBackRef = useRef(onBack);
  useEffect(() => {
    itemsRef.current = items;
    activeIndexRef.current = activeIndex;
    onForwardRef.current = onForward;
    onBackRef.current = onBack;
  });
  // True while a commit fling is in flight — drops a second rapid swipe so it
  // cannot double-save / double-advance the same card.
  const committingRef = useRef(false);

  const commit = useCallback(
    (direction: 'forward' | 'back') => {
      if (committingRef.current) {
        return;
      }
      committingRef.current = true;
      const item = itemsRef.current[activeIndexRef.current];
      // Forward (swipe left) flings the card off-screen to the left; back
      // (swipe right) flings it to the right and restores the previous card.
      const toX = direction === 'forward' ? -SCREEN_W * 1.4 : SCREEN_W * 1.4;
      Animated.timing(pan, {
        toValue: { x: toX, y: 0 },
        duration: motion.duration.normal,
        easing: motion.easing.exit,
        useNativeDriver: true,
      }).start(() => {
        // Reset the shared pan BEFORE re-indexing so the promoted card mounts at
        // centre (not at the flung offset) — avoids a one-frame centre-flash.
        pan.setValue({ x: 0, y: 0 });
        committingRef.current = false;
        if (direction === 'forward') {
          onForwardRef.current(item);
        } else {
          onBackRef.current(item);
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
            // Swipe left → next suggestion (only if one exists ahead); swipe
            // right → previous (only if not on the first card). Anything else
            // springs back — so the first card can't be swiped right.
            const idx = activeIndexRef.current;
            if (g.dx < 0 && itemsRef.current[idx + 1]) {
              commit('forward');
              return;
            }
            if (g.dx > 0 && idx > 0) {
              commit('back');
              return;
            }
          }
          cancel();
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
  // Forward cue fades in on a leftward drag; back cue on a rightward drag.
  const forwardOpacity = pan.x.interpolate({
    inputRange: [-SCREEN_W * 0.3, 0],
    outputRange: [motion.opacity.visible, motion.opacity.hidden],
    extrapolate: 'clamp',
  });
  const backOpacity = pan.x.interpolate({
    inputRange: [0, SCREEN_W * 0.3],
    outputRange: [motion.opacity.hidden, motion.opacity.visible],
    extrapolate: 'clamp',
  });
  const peekScale = pan.x.interpolate({
    inputRange: [-SCREEN_W, 0, SCREEN_W],
    outputRange: [1, 0.98, 1],
    extrapolate: 'clamp',
  });
  // Background cards: the next card is revealed while dragging left (forward),
  // the previous card while dragging right (back). The opaque active card masks
  // both at rest, so peek can stay at full opacity until a right drag swaps it
  // out for prev.
  const peekOpacity = pan.x.interpolate({
    inputRange: [0, SCREEN_W * 0.08],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const prevOpacity = pan.x.interpolate({
    inputRange: [0, SCREEN_W * 0.08],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Cards fill the deck via absolute insets (see cardBase), so the deck stack
  // flex-fills its parent and the card height follows the available space.
  const cardStyle: ViewStyle = { width: '100%' };
  const a11yActions = useMemo(
    () => [
      { name: 'next' as const, label: 'Next outfit' },
      { name: 'previous' as const, label: 'Previous outfit' },
    ],
    [],
  );

  if (!active) {
    return null;
  }

  return (
    <View testID={testID} style={styles.stack}>
      {/* Previous card — revealed from behind on a rightward (back) drag. */}
      {prev ? (
        <Animated.View
          key={`prev-${keyOf(prev)}`}
          style={[styles.cardBase, cardStyle, { opacity: prevOpacity }]}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {renderCard(prev, 'peek')}
        </Animated.View>
      ) : null}

      {peek ? (
        <Animated.View
          key={`peek-${keyOf(peek)}`}
          style={[
            styles.cardBase,
            cardStyle,
            { opacity: peekOpacity, transform: [{ scale: peekScale }] },
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
          if (e.nativeEvent.actionName === 'next') {
            onForward(active);
          }
          if (e.nativeEvent.actionName === 'previous') {
            onBack(active);
          }
        }}
        style={[
          styles.cardBase,
          styles.activeCard,
          cardStyle,
          { transform: [{ translateX: pan.x }, { rotate }] },
        ]}
        {...responder.panHandlers}
      >
        {renderCue ? renderCue(forwardOpacity, backOpacity) : null}
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
