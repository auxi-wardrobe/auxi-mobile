// OutfitSwipeDeck — single-axis card deck for Home.
// See docs/superpowers/specs/2026-06-12-home-tinder-swipe-design.md and
// docs/MOTION_SYSTEM.md. Built on PanResponder + Animated (no new dep),
// mirroring OutfitCanvasSurface. The card follows the finger live; on release
// it either commits (flies off) or springs back (critically damped, no bounce).
//
// Navigation semantics (not "like/skip"): swipe LEFT advances to the next
// suggestion, swipe RIGHT goes BACK to the previous one. The back-swipe is
// blocked on the first card (index 0) — there is nothing older to return to —
// so a rightward drag there rubber-bands and springs home instead of
// committing. The card revealed behind the active one is direction-aware: the
// previous card while dragging right, the next card while dragging left.
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
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
  /** Swipe LEFT — advance to the next suggestion. */
  onSwipeNext: (item: T) => void;
  /** Swipe RIGHT — go back to the previous suggestion (blocked at index 0). */
  onSwipeBack: (item: T) => void;
  /** Optional cue overlay driven by the live drag position (back, next). */
  renderCue?: (
    backOpacity: Animated.AnimatedInterpolation<number>,
    nextOpacity: Animated.AnimatedInterpolation<number>,
  ) => React.ReactNode;
  testID?: string;
};

export function OutfitSwipeDeck<T>({
  items,
  activeIndex,
  swipeEnabled,
  keyOf,
  renderCard,
  onSwipeNext,
  onSwipeBack,
  renderCue,
  testID,
}: Props<T>) {
  const reduced = useReducedMotion();
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const active = items[activeIndex];
  // The card revealed behind the active one depends on swipe direction: the
  // previous card when dragging right (back), the next card when dragging left.
  const nextPeek = items[activeIndex + 1];
  const prevPeek = activeIndex > 0 ? items[activeIndex - 1] : undefined;

  // Latest props for the gesture closures (the PanResponder is created once).
  // Reading these from refs keeps `commit`/the responder stable across card
  // advances (no mid-gesture responder teardown) and means `commit` always
  // resolves the CURRENT active item, not a stale one captured at create time.
  const itemsRef = useRef(items);
  const activeIndexRef = useRef(activeIndex);
  const onSwipeNextRef = useRef(onSwipeNext);
  const onSwipeBackRef = useRef(onSwipeBack);
  useEffect(() => {
    itemsRef.current = items;
    activeIndexRef.current = activeIndex;
    onSwipeNextRef.current = onSwipeNext;
    onSwipeBackRef.current = onSwipeBack;
  });
  // True while a commit fling is in flight — drops a second rapid swipe so it
  // cannot double-save / double-advance the same card.
  const committingRef = useRef(false);
  // Set when a commit fling has landed and we're waiting for the parent to
  // advance activeIndex. Cleared by the index-change layout effect (normal
  // path) or by the rAF fallback below (parent didn't advance — e.g. forward
  // swipe on the last card while the buffer is still empty).
  const awaitingAdvanceRef = useRef(false);

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
        // Advance FIRST and leave the pan at the flung offset. Resetting the
        // pan here (before the parent's setState re-renders) snaps the OLD
        // card back to centre on the native side for the frame(s) it takes
        // React to commit the new index — the visible "old card flashes then
        // disappears" glitch. Keeping the pan flung means the screen keeps
        // showing the revealed peek card, and the layout effect below resets
        // the pan inside the SAME commit that promotes it to active.
        awaitingAdvanceRef.current = true;
        if (dir === 1) {
          onSwipeBackRef.current(item);
        } else {
          onSwipeNextRef.current(item);
        }
        // Fallback: if the parent could not advance (last card, buffer still
        // filling), the index never changes and no layout effect fires —
        // spring the stranded card back home so the deck isn't left blank.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (awaitingAdvanceRef.current) {
              awaitingAdvanceRef.current = false;
              committingRef.current = false;
              Animated.spring(pan, {
                toValue: { x: 0, y: 0 },
                stiffness: motion.spring.standard.stiffness,
                damping: motion.spring.standard.damping,
                mass: 1,
                useNativeDriver: true,
              }).start();
            }
          });
        });
      });
    },
    [pan],
  );

  // Runs inside the same React commit that changes the active card, before the
  // frame paints — so the pan reset and the role swap are atomic: the promoted
  // card takes the active slot already centred, and the demoted card becomes a
  // peek (hidden at pan 0) in the same frame. No intermediate frame can show
  // the old card at centre.
  const prevActiveIndexRef = useRef(activeIndex);
  useLayoutEffect(() => {
    if (prevActiveIndexRef.current === activeIndex) {
      return;
    }
    prevActiveIndexRef.current = activeIndex;
    pan.setValue({ x: 0, y: 0 });
    awaitingAdvanceRef.current = false;
    committingRef.current = false;
  }, [activeIndex, pan]);

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
        onPanResponderMove: (_, g) => {
          // No previous suggestion to return to on the first card — let the
          // rightward drag move only a fraction so it reads as a soft wall.
          const atStart = activeIndexRef.current <= 0;
          const dx = atStart && g.dx > 0 ? g.dx * 0.2 : g.dx;
          pan.setValue({ x: dx, y: 0 });
        },
        onPanResponderRelease: (_, g) => {
          const atStart = activeIndexRef.current <= 0;
          // Block the back-swipe at index 0: spring home, never commit.
          if (atStart && g.dx > 0) {
            cancel();
            return;
          }
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

  // Back cue rises as the card is dragged right; next cue as it's dragged left.
  const backOpacity = pan.x.interpolate({
    inputRange: [0, SCREEN_W * 0.3],
    outputRange: [motion.opacity.hidden, motion.opacity.visible],
    extrapolate: 'clamp',
  });
  const nextOpacity = pan.x.interpolate({
    inputRange: [-SCREEN_W * 0.3, 0],
    outputRange: [motion.opacity.visible, motion.opacity.hidden],
    extrapolate: 'clamp',
  });
  // Reveal the previous card only while dragging right, the next card only
  // while dragging left — a step at x=0 so the wrong card never bleeds through.
  const prevPeekOpacity = pan.x.interpolate({
    inputRange: [0, 1],
    outputRange: [motion.opacity.hidden, motion.opacity.visible],
    extrapolate: 'clamp',
  });
  const nextPeekOpacity = pan.x.interpolate({
    inputRange: [-1, 0],
    outputRange: [motion.opacity.visible, motion.opacity.hidden],
    extrapolate: 'clamp',
  });

  // Every card renders at its true size. An earlier build drove a live
  // "carousel cross-scale" (active recedes to 0.92 while the incoming card
  // grows to full) off the drag position, but because scale and translateX
  // share `pan.x`, back-and-forth swiping left cards momentarily shrunk below
  // full size — the "cards appear smaller than their real size" glitch. The
  // deck is a simple stack: peek cards fade in behind the active one (opacity
  // only) and the active card slides on the live drag; nothing scales.

  // Cards fill the deck via absolute insets (see cardBase), so the deck stack
  // flex-fills its parent and the card height follows the available space.
  const cardStyle: ViewStyle = { width: '100%' };
  const a11yActions = useMemo(
    () => [
      { name: 'next' as const, label: 'Next outfit' },
      { name: 'back' as const, label: 'Previous outfit' },
    ],
    [],
  );

  if (!active) {
    return null;
  }

  // Windowed cards, painted back-to-front: peek(s) first, active last (on top).
  // Keyed by ITEM IDENTITY (keyOf), NEVER by role — so a card promoted from
  // peek → active is the SAME React instance. No remount means the OptionSheet
  // reveal animation never replays; that replay was the visible "jump" after a
  // swipe. See docs/superpowers/specs/2026-07-02-home-swipe-image-pop-fix-design.md.
  const windowCards: { item: T; role: Role; peek?: 'prev' | 'next' }[] = [];
  if (prevPeek) {
    windowCards.push({ item: prevPeek, role: 'peek', peek: 'prev' });
  }
  if (nextPeek) {
    windowCards.push({ item: nextPeek, role: 'peek', peek: 'next' });
  }
  windowCards.push({ item: active, role: 'active' });

  return (
    <View testID={testID} style={styles.stack}>
      {windowCards.map(({ item, role, peek }) => {
        const isActive = role === 'active';
        const peekOpacity = peek === 'prev' ? prevPeekOpacity : nextPeekOpacity;
        return (
          <Animated.View
            key={keyOf(item)}
            accessibilityActions={isActive ? a11yActions : undefined}
            onAccessibilityAction={
              isActive
                ? e => {
                    if (e.nativeEvent.actionName === 'next') {
                      onSwipeNext(active);
                    }
                    if (
                      e.nativeEvent.actionName === 'back' &&
                      activeIndex > 0
                    ) {
                      onSwipeBack(active);
                    }
                  }
                : undefined
            }
            style={[
              styles.cardBase,
              cardStyle,
              isActive
                ? [
                    styles.activeCard,
                    { transform: [{ translateX: pan.x }] },
                  ]
                : { opacity: peekOpacity },
            ]}
            pointerEvents={isActive ? 'auto' : 'none'}
            // Peek cards are decorative until promoted: keep their subtree out
            // of the accessibility / test tree so VoiceOver doesn't announce the
            // hidden card and duplicate testIDs (e.g. home-remix) don't clash.
            accessibilityElementsHidden={!isActive}
            importantForAccessibility={isActive ? 'auto' : 'no-hide-descendants'}
            {...(isActive ? responder.panHandlers : {})}
          >
            {/* Cue slot rendered in BOTH roles (null when peek) so the card
                content stays at a stable child index across promotion — the
                OptionSheet child is never remounted. */}
            {isActive && renderCue ? renderCue(backOpacity, nextOpacity) : null}
            {renderCard(item, role)}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flex: 1, width: '100%', position: 'relative' },
  cardBase: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  // AU-359: during a hold/swipe the active card carries a live translateX.
  // Clipping the moving card to its own bounds and backing it with the white
  // app surface keeps its edge clean as it slides — the peek card's cream tile
  // surface (figmaCardSurface) never bleeds a hairline at the screen edge, and
  // the corners read white-on-white against the screen. Applied to the ACTIVE
  // card only; the peek cards stay unclipped.
  activeCard: {
    overflow: 'hidden',
    backgroundColor: theme.colors.figmaSurface,
  },
});
