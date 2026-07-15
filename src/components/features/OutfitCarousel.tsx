// OutfitCarousel — center-focused (coverflow) card carousel for Home.
//
// Replaces the single-card OutfitSwipeDeck: the active suggestion sits centred
// at full size while the PREVIOUS and NEXT suggestions peek at either edge,
// smaller and dimmed. The whole strip follows the finger on a horizontal drag;
// on release it snaps to the nearest card (commit) or springs back (cancel).
//
// Navigation semantics match the old deck (NOT like/skip): swipe LEFT advances
// to the next suggestion, swipe RIGHT goes BACK to the previous one. The
// back-swipe is blocked on the first card (index 0) — there is nothing older to
// return to — so a rightward drag there rubber-bands and springs home.
//
// Built on PanResponder + Animated (no new dep), same as the deck it replaces.
// Two hard-won lessons carry over:
//   * interpolations are MEMOISED so their native animated nodes are stable —
//     a re-render landing mid-animation (e.g. the buffered fetch resolving
//     while the strip springs home) can't strand a card at the wrong scale;
//   * the drag reset keys off the active card's IDENTITY, not the numeric
//     index, so a list reconcile that swaps which item sits at the active slot
//     (scheduled-prefix prepend, buffer refill) never leaves the strip
//     off-centre.
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
} from 'react-native';
import {
  motion,
  isCommit,
  useReducedMotion,
  DECK_PEEK_SCALE,
  CARD_CAROUSEL_WIDTH_RATIO,
  CARD_CAROUSEL_GAP,
  CARD_CAROUSEL_SIDE_OPACITY,
} from '../../theme/motion';
import { theme } from '../../theme/theme';

const { width: SCREEN_W } = Dimensions.get('window');

// Card width and the centre-to-centre distance between neighbouring cards.
const CARD_W = Math.round(SCREEN_W * CARD_CAROUSEL_WIDTH_RATIO);
const STRIDE = CARD_W + CARD_CAROUSEL_GAP;
// Horizontal inset that centres a CARD_W card in the full-width stack.
const CENTER_OFFSET = Math.round((SCREEN_W - CARD_W) / 2);

// Fixed render window: the previous (-1), active (0), and next (1)
// suggestions. Painted side-by-side (not stacked) and driven by a single drag
// value.
type Offset = -1 | 0 | 1;

type Role = 'active' | 'peek';

type Props<T> = {
  items: T[];
  activeIndex: number;
  /** False while a collage item is being dragged — freezes the carousel. */
  swipeEnabled: boolean;
  keyOf: (item: T) => string;
  renderCard: (item: T, role: Role) => React.ReactNode;
  /** Swipe LEFT — advance to the next suggestion. */
  onSwipeNext: (item: T) => void;
  /** Swipe RIGHT — go back to the previous suggestion (blocked at index 0). */
  onSwipeBack: (item: T) => void;
  testID?: string;
};

export function OutfitCarousel<T>({
  items,
  activeIndex,
  swipeEnabled,
  keyOf,
  renderCard,
  onSwipeNext,
  onSwipeBack,
  testID,
}: Props<T>) {
  const reduced = useReducedMotion();
  // Single X offset for the whole strip. 0 at rest (active centred); the finger
  // drives it live, and commit/cancel animate it.
  const drag = useRef(new Animated.Value(0)).current;

  const active = items[activeIndex];
  const prev = activeIndex > 0 ? items[activeIndex - 1] : undefined;
  const next = items[activeIndex + 1];

  // Latest props/index for the gesture closures (the PanResponder is created
  // once). Reading these from refs keeps the responder stable across advances
  // and means commit always resolves the CURRENT active item.
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

  // True while a commit slide is in flight — drops a second rapid swipe so it
  // cannot double-advance the same card.
  const committingRef = useRef(false);
  // Set when a commit slide has landed and we're waiting for the parent to
  // advance activeIndex. Cleared by the identity layout effect (normal path) or
  // the rAF fallback below (parent couldn't advance — e.g. last card, buffer
  // still filling).
  const awaitingAdvanceRef = useRef(false);

  const cancel = useCallback(() => {
    Animated.spring(drag, {
      toValue: 0,
      stiffness: motion.spring.standard.stiffness,
      damping: motion.spring.standard.damping,
      mass: 1,
      useNativeDriver: true,
    }).start();
  }, [drag]);

  const commit = useCallback(
    (dir: 1 | -1) => {
      if (committingRef.current) {
        return;
      }
      committingRef.current = true;
      const item = itemsRef.current[activeIndexRef.current];
      // Slide the strip exactly one slot in the swipe direction so the incoming
      // card lands dead-centre before the index advances.
      Animated.timing(drag, {
        toValue: dir * STRIDE,
        duration: motion.duration.normal,
        easing: motion.easing.exit,
        useNativeDriver: true,
      }).start(() => {
        // Advance FIRST and leave the strip slid over. Resetting drag here
        // (before the parent's setState re-renders) would snap the OLD active
        // card back to centre for the frame(s) React takes to commit the new
        // index. Keeping it slid means the incoming card stays centred, and the
        // identity layout effect below resets drag inside the SAME commit that
        // re-indexes the window.
        awaitingAdvanceRef.current = true;
        if (dir === 1) {
          onSwipeBackRef.current(item);
        } else {
          onSwipeNextRef.current(item);
        }
        // Fallback: if the parent could not advance (last card, buffer still
        // filling) the index never changes and no layout effect fires — spring
        // the stranded strip back so the carousel isn't left off-centre.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (awaitingAdvanceRef.current) {
              awaitingAdvanceRef.current = false;
              committingRef.current = false;
              cancel();
            }
          });
        });
      });
    },
    [drag, cancel],
  );

  // Runs inside the same React commit that changes the active card, before the
  // frame paints — so the drag reset and the window re-index are atomic: the
  // promoted card takes the centre slot already at drag 0 (full size), and the
  // demoted card becomes a peek in the same frame. Keyed on the active card's
  // IDENTITY, not the numeric index: the deck can swap which item sits at the
  // active slot without the index moving (scheduled-prefix prepend at index 0,
  // buffer reconcile); watching identity resets the strip whenever the centred
  // card actually changes.
  const activeKey = active ? keyOf(active) : undefined;
  const prevActiveKeyRef = useRef(activeKey);
  useLayoutEffect(() => {
    if (prevActiveKeyRef.current === activeKey) {
      return;
    }
    prevActiveKeyRef.current = activeKey;
    drag.setValue(0);
    awaitingAdvanceRef.current = false;
    committingRef.current = false;
  }, [activeKey, drag]);

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
          // No previous suggestion on the first card — let a rightward drag move
          // only a fraction so it reads as a soft wall.
          const atStart = activeIndexRef.current <= 0;
          const dx = atStart && g.dx > 0 ? g.dx * 0.2 : g.dx;
          drag.setValue(dx);
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
    [swipeEnabled, reduced, drag, commit, cancel],
  );

  // Per-slot animated transforms, driven by the single drag value and memoised
  // so the native nodes stay stable across re-renders (a re-render mid-slide/
  // spring can't strand a card at the wrong scale). A card in slot k is centred
  // when drag === -k * STRIDE; one slot away it sits at DECK_PEEK_SCALE, dimmed.
  const slotAnims = useMemo(() => {
    const build = (k: Offset) => {
      const centered = -k * STRIDE;
      return {
        // translateX = drag + k * STRIDE (linear pass-through, no clamp).
        translateX: drag.interpolate({
          inputRange: [-STRIDE, STRIDE],
          outputRange: [centered - STRIDE, centered + STRIDE],
        }),
        scale: drag.interpolate({
          inputRange: [centered - STRIDE, centered, centered + STRIDE],
          outputRange: [DECK_PEEK_SCALE, 1, DECK_PEEK_SCALE],
          extrapolate: 'clamp',
        }),
        opacity: drag.interpolate({
          inputRange: [centered - STRIDE, centered, centered + STRIDE],
          outputRange: [
            CARD_CAROUSEL_SIDE_OPACITY,
            motion.opacity.visible,
            CARD_CAROUSEL_SIDE_OPACITY,
          ],
          extrapolate: 'clamp',
        }),
      };
    };
    return { '-1': build(-1), '0': build(0), '1': build(1) } as Record<
      string,
      { translateX: Animated.AnimatedInterpolation<number>; scale: Animated.AnimatedInterpolation<number>; opacity: Animated.AnimatedInterpolation<number> }
    >;
  }, [drag]);

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

  // Painted back-to-front: peeks first, active last (on top). Keyed by ITEM
  // IDENTITY (keyOf), NEVER by slot — so a card promoted from peek → active is
  // the SAME React instance (no remount, no reveal-animation replay).
  const windowCards: { item: T; role: Role; offset: Offset }[] = [];
  if (prev) {
    windowCards.push({ item: prev, role: 'peek', offset: -1 });
  }
  if (next) {
    windowCards.push({ item: next, role: 'peek', offset: 1 });
  }
  windowCards.push({ item: active, role: 'active', offset: 0 });

  return (
    <View testID={testID} style={styles.stack}>
      {windowCards.map(({ item, role, offset }) => {
        const isActive = role === 'active';
        const anims = slotAnims[String(offset)];
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
              styles.card,
              {
                opacity: anims.opacity,
                transform: [
                  { translateX: anims.translateX },
                  { scale: anims.scale },
                ],
              },
            ]}
            pointerEvents={isActive ? 'auto' : 'none'}
            // Peek cards are decorative until promoted: keep their subtree out of
            // the accessibility / test tree so VoiceOver doesn't announce the
            // hidden card and duplicate testIDs don't clash.
            accessibilityElementsHidden={!isActive}
            importantForAccessibility={isActive ? 'auto' : 'no-hide-descendants'}
            {...(isActive ? responder.panHandlers : {})}
          >
            {renderCard(item, role)}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { flex: 1, width: '100%', position: 'relative', overflow: 'visible' },
  // Each card is a fixed-width panel centred in the stack via CENTER_OFFSET; the
  // live translateX slides it from there. Clipped + white-backed so the rounded
  // corners read cleanly as the cards cross-scale past one another.
  card: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: CENTER_OFFSET,
    width: CARD_W,
    borderRadius: theme.borderRadius.figmaTile,
    overflow: 'hidden',
    backgroundColor: theme.colors.figmaSurface,
  },
});
