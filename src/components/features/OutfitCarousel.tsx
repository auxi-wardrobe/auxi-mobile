// OutfitCarousel — full-width paging carousel for Home.
//
// The card DESIGN is unchanged from the swipe deck it replaces: one full-bleed,
// full-size suggestion fills the screen at rest, exactly as before. What changes
// is only the TRANSITION between suggestions — instead of the active card
// flinging off-screen while a hidden card is revealed behind it, the deck slides
// like a carousel: the current card slides out one side while the next slides in
// from the other, moving together as a strip. The neighbouring cards live one
// full screen-width away, so at rest they sit off-screen and only the active
// card is visible; they come into view only during the slide.
//
// Navigation semantics match the old deck (NOT like/skip): swipe LEFT advances
// to the next suggestion, swipe RIGHT goes BACK to the previous one. The
// back-swipe is blocked on the first card (index 0) — nothing older to return
// to — so a rightward drag there rubber-bands and springs home.
//
// Built on PanResponder + Animated (no new dep). Two lessons carry over from the
// deck sizing fix: the slot translations are memoised (stable native nodes
// survive a re-render mid-slide, e.g. the buffered fetch resolving while the
// strip settles), and the drag reset keys off the active card's IDENTITY, not
// the numeric index, so a list reconcile that swaps the active item never
// strands the strip off-centre.
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
import { motion, isCommit, useReducedMotion } from '../../theme/motion';
import { theme } from '../../theme/theme';

const { width: SCREEN_W } = Dimensions.get('window');

// Fixed render window: previous (-1), active (0), next (1). Cards are one full
// screen-width apart, so the slide pages exactly one card per commit.
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
      // Slide the strip exactly one screen-width in the swipe direction so the
      // incoming card lands centred before the index advances.
      Animated.timing(drag, {
        toValue: dir * SCREEN_W,
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
  // promoted card takes the centre slot already at drag 0, and the demoted card
  // slides off in the same frame. Keyed on the active card's IDENTITY, not the
  // numeric index: the deck can swap which item sits at the active slot without
  // the index moving (scheduled-prefix prepend at index 0, buffer reconcile);
  // watching identity resets the strip whenever the centred card changes.
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

  // Per-slot translateX, driven by the single drag value and memoised so the
  // native nodes stay stable across re-renders (a re-render mid-slide/spring
  // can't strand a card off-centre). Card in slot k sits at k * SCREEN_W + drag,
  // so at rest (drag 0) the active card fills the screen and its neighbours are
  // one full width away, off-screen either side.
  const slotTranslate = useMemo(() => {
    const build = (k: Offset) =>
      // Linear pass-through of drag with a constant k * SCREEN_W offset.
      drag.interpolate({
        inputRange: [-SCREEN_W, SCREEN_W],
        outputRange: [k * SCREEN_W - SCREEN_W, k * SCREEN_W + SCREEN_W],
      });
    return { '-1': build(-1), '0': build(0), '1': build(1) } as Record<
      string,
      Animated.AnimatedInterpolation<number>
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

  // Painted back-to-front: neighbours first, active last (on top). Keyed by ITEM
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
              isActive && styles.activeCard,
              { transform: [{ translateX: slotTranslate[String(offset)] }] },
            ]}
            pointerEvents={isActive ? 'auto' : 'none'}
            // Neighbours are decorative until promoted: keep their subtree out of
            // the accessibility / test tree so VoiceOver doesn't announce the
            // off-screen card and duplicate testIDs don't clash.
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
  stack: { flex: 1, width: '100%', position: 'relative' },
  // Full-bleed cards, one screen wide, positioned by translateX — identical
  // footprint to the swipe deck's cards.
  cardBase: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  // The moving active card carries a live translateX; clipping it to its own
  // bounds and backing it with the app surface keeps its edge clean as it slides
  // (the incoming card never bleeds a hairline at the screen edge).
  activeCard: {
    overflow: 'hidden',
    backgroundColor: theme.colors.figmaSurface,
  },
});
