# Home Tinder-Style Swipe Deck — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Home's two-axis FlatList paging with a calm, motion-system-aligned Tinder-style card deck (swipe right = like/quick-save, left = skip), the card following the finger live.

**Architecture:** New `src/theme/motion.ts` (Macgie Motion v1.0 tokens + helpers). New `OutfitSwipeDeck` (PanResponder + Animated, top card + peeking card, reuses `OptionSheet` as the card body via a render prop). HomeScreen swaps the set-pager for the deck and moves from `(setIndex, outfitIndex)` to a single `activeIndex` into the flat `listOutfits`; favourite/prefetch/coach-mark/collage data layers are retained and re-keyed.

**Tech Stack:** React Native 0.83, TypeScript, `Animated` + `PanResponder` (no new dep), jest for pure-logic tests.

**Spec:** `docs/superpowers/specs/2026-06-12-home-tinder-swipe-design.md` · **Motion rule:** `docs/MOTION_SYSTEM.md`

---

## File structure

| File | Responsibility |
|---|---|
| `src/theme/motion.ts` (new) | Motion tokens (duration/distance/scale/opacity/stagger/easing/spring), `applyEmotion()`, swipe helpers (`rotationForDx`, `isCommit`), `useReducedMotion()` |
| `src/theme/__tests__/motion.test.ts` (new) | Unit tests for the pure motion math |
| `src/components/features/OutfitSwipeDeck.tsx` (new) | Gesture deck: top + peek card, drag/commit/cancel, like/skip cue, a11y actions |
| `src/screens/HomeScreen.tsx` | `activeIndex` model; render deck; re-key buffer/recordBrowse; single coach-mark; drop dots/show-another |
| `src/components/features/OutfitActionRow.tsx` | Remove dots + "Show another"; keep Remix |
| `src/components/features/SwipeCoachMark.tsx` | Single horizontal variant; i18n copy |
| `src/translations/{en-EN,vi-VN,fr-FR}.json` | New keys |
| `maestro/flows/home/swipe.yaml` | Rewrite for left/right deck |

---

## Task 1: Motion tokens + pure helpers (`src/theme/motion.ts`)

**Files:**
- Create: `src/theme/motion.ts`
- Test: `src/theme/__tests__/motion.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/theme/__tests__/motion.test.ts
import { motion, rotationForDx, isCommit, applyEmotion } from '../motion';

describe('motion tokens', () => {
  it('exposes Macgie v1.0 duration tokens', () => {
    expect(motion.duration).toEqual({
      instant: 50, fast: 120, normal: 250, medium: 350, slow: 500, reveal: 700,
    });
  });
  it('spring-standard is critically damped (no bounce)', () => {
    expect(motion.spring.standard).toEqual({ stiffness: 300, damping: 35 });
  });
});

describe('rotationForDx', () => {
  it('is 0 at center', () => expect(rotationForDx(0, 400)).toBe(0));
  it('caps at +6deg far right', () => expect(rotationForDx(400, 400)).toBeCloseTo(6));
  it('caps at -6deg far left', () => expect(rotationForDx(-400, 400)).toBeCloseTo(-6));
  it('never exceeds the cap', () => expect(rotationForDx(9999, 400)).toBe(6));
});

describe('isCommit', () => {
  const W = 400; // commit at 30% width = 120px, or |vx| > 0.4
  it('commits past 30% width', () => expect(isCommit(130, 0, W)).toBe(true));
  it('does not commit below threshold with low velocity', () =>
    expect(isCommit(80, 0.1, W)).toBe(false));
  it('commits on a fast flick even if short', () =>
    expect(isCommit(40, 0.6, W)).toBe(true));
});

describe('applyEmotion', () => {
  it('Confident shortens duration ~10%', () =>
    expect(applyEmotion('confident', { duration: 250, stagger: 80 }).duration).toBe(225));
  it('Calm lengthens duration ~15% and adds stagger', () => {
    const r = applyEmotion('calm', { duration: 250, stagger: 80 });
    expect(r.duration).toBe(288); // round(250*1.15)
    expect(r.stagger).toBe(110);  // 80 + 30
  });
  it('unknown direction is identity', () =>
    expect(applyEmotion('none', { duration: 250, stagger: 80 })).toEqual({ duration: 250, stagger: 80 }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn jest src/theme/__tests__/motion.test.ts`
Expected: FAIL — `Cannot find module '../motion'`.

- [ ] **Step 3: Write `src/theme/motion.ts`**

```ts
// Macgie Motion System v1.0 — see docs/MOTION_SYSTEM.md (Linear AU-333…338).
// Single source of truth for animation values. Do NOT hardcode timings.
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Easing } from 'react-native';

export const motion = {
  duration: { instant: 50, fast: 120, normal: 250, medium: 350, slow: 500, reveal: 700 },
  distance: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  scale: { press: 0.97, hover: 1.02, select: 1.03, emphasis: 1.05 },
  opacity: { hidden: 0, subtle: 0.6, visible: 1 },
  stagger: { tight: 40, normal: 80, relaxed: 120 },
  elevation: { sm: 2, md: 4, lg: 8 },
  radius: { small: 8, medium: 16, large: 24, full: 999 },
  // Easing as RN bezier fns (mirror the cubic-beziers in the token doc).
  easing: {
    standard: Easing.bezier(0.2, 0, 0, 1),
    enter: Easing.bezier(0, 0, 0, 1),
    exit: Easing.bezier(0.4, 0, 1, 1),
    emphasized: Easing.bezier(0.2, 0, 0, 1),
  },
  // Critically damped springs (no bounce). Tuned for Animated.spring.
  spring: {
    soft: { stiffness: 250, damping: 30 },
    standard: { stiffness: 300, damping: 35 },
    confident: { stiffness: 350, damping: 40 },
  },
} as const;

// Swipe-deck geometry constants (spec §2.2).
export const SWIPE_ROTATION_CAP_DEG = 6;
export const SWIPE_COMMIT_RATIO = 0.3; // of screen width
export const SWIPE_COMMIT_VELOCITY = 0.4;

/** Card tilt for a horizontal drag of `dx` over a card of `width`, capped ±6°. */
export const rotationForDx = (dx: number, width: number): number => {
  const raw = (dx / width) * (SWIPE_ROTATION_CAP_DEG * 2);
  return Math.max(-SWIPE_ROTATION_CAP_DEG, Math.min(SWIPE_ROTATION_CAP_DEG, raw));
};

/** Whether a release commits the swipe (past 30% width OR fast flick). */
export const isCommit = (dx: number, vx: number, width: number): boolean =>
  Math.abs(dx) > width * SWIPE_COMMIT_RATIO || Math.abs(vx) > SWIPE_COMMIT_VELOCITY;

export type EmotionDirection =
  | 'calm' | 'confident' | 'creative' | 'social' | 'comfort' | 'none';

type MotionConfig = { duration: number; stagger: number };

/** Emotion Motion Layer (AU-334): scales an existing config, never adds motion. */
export const applyEmotion = (dir: EmotionDirection, cfg: MotionConfig): MotionConfig => {
  switch (dir) {
    case 'calm':
      return { duration: Math.round(cfg.duration * 1.15), stagger: cfg.stagger + 30 };
    case 'confident':
      return { duration: Math.round(cfg.duration * 0.9), stagger: cfg.stagger };
    case 'creative':
      return { duration: cfg.duration, stagger: cfg.stagger + 40 };
    case 'comfort':
      return { duration: Math.round(cfg.duration * 0.8), stagger: cfg.stagger };
    case 'social':
    case 'none':
    default:
      return cfg;
  }
};

/** Tracks the OS Reduce Motion setting (spec §3.2). */
export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => mounted && setReduced(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { mounted = false; sub.remove(); };
  }, []);
  return reduced;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn jest src/theme/__tests__/motion.test.ts`
Expected: PASS (all 4 describe blocks).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (legacy `_HomeScreen.tsx` errors only).

---

## Task 2: `OutfitSwipeDeck` component

**Files:**
- Create: `src/components/features/OutfitSwipeDeck.tsx`

Reuses the `OptionSheet` already defined in `HomeScreen.tsx`. To avoid a circular
import, `OptionSheet` is passed in as a render prop (`renderCard`) rather than imported.

- [ ] **Step 1: Implement the deck** (see code block — generic `OutfitSwipeDeck<T>` with `items`, `activeIndex`, `cardHeight`, `swipeEnabled`, `keyOf`, `renderCard(item, role)`, `onLike`, `onSkip`, `renderCue`. PanResponder claims only horizontal drags (`|dx|>|dy| && |dx|>6`) when `swipeEnabled && !reduced`; `onPanResponderMove` → `pan.setValue`; release → `isCommit` ? `commit(dir)` : `cancel()`. `commit` = `Animated.timing` off-screen with `motion.easing.exit`/`motion.duration.normal`, then reset pan + fire `onLike`/`onSkip`. `cancel` = `Animated.spring` to 0 with `motion.spring.standard` (no bounce). Interpolations: `rotate` (±6° via `rotationForDx`), `likeOpacity`/`skipOpacity` (`hidden→visible` over 30% width), `peekScale` (0.98→1). Active card carries `accessibilityActions` like/skip → `onLike`/`onSkip`.)

```tsx
import React, { useCallback, useMemo, useRef } from 'react';
import {
  Animated, Dimensions, PanResponder, StyleSheet, View, ViewStyle,
} from 'react-native';
import { motion, rotationForDx, isCommit, useReducedMotion } from '../../theme/motion';

const { width: SCREEN_W } = Dimensions.get('window');

type Props<T> = {
  items: T[];
  activeIndex: number;
  cardHeight: number;
  swipeEnabled: boolean;
  keyOf: (item: T) => string;
  renderCard: (item: T, role: 'active' | 'peek') => React.ReactNode;
  onLike: (item: T) => void;
  onSkip: (item: T) => void;
  renderCue?: (
    likeOpacity: Animated.AnimatedInterpolation<number>,
    skipOpacity: Animated.AnimatedInterpolation<number>,
  ) => React.ReactNode;
  testID?: string;
};

export function OutfitSwipeDeck<T>({
  items, activeIndex, cardHeight, swipeEnabled, keyOf, renderCard,
  onLike, onSkip, renderCue, testID,
}: Props<T>) {
  const reduced = useReducedMotion();
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const active = items[activeIndex];
  const peek = items[activeIndex + 1];

  const commit = useCallback((dir: 1 | -1) => {
    const item = items[activeIndex];
    Animated.timing(pan, {
      toValue: { x: dir * SCREEN_W * 1.4, y: 0 },
      duration: motion.duration.normal,
      easing: motion.easing.exit,
      useNativeDriver: true,
    }).start(() => {
      pan.setValue({ x: 0, y: 0 });
      if (dir === 1) onLike(item); else onSkip(item);
    });
  }, [activeIndex, items, onLike, onSkip, pan]);

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
          swipeEnabled && !reduced && Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 6,
        onPanResponderMove: (_, g) => pan.setValue({ x: g.dx, y: 0 }),
        onPanResponderRelease: (_, g) => {
          if (isCommit(g.dx, g.vx, SCREEN_W)) commit(g.dx > 0 ? 1 : -1);
          else cancel();
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
    inputRange: [0, SCREEN_W * 0.3], outputRange: [motion.opacity.hidden, motion.opacity.visible], extrapolate: 'clamp',
  });
  const skipOpacity = pan.x.interpolate({
    inputRange: [-SCREEN_W * 0.3, 0], outputRange: [motion.opacity.visible, motion.opacity.hidden], extrapolate: 'clamp',
  });
  const peekScale = pan.x.interpolate({
    inputRange: [-SCREEN_W, 0, SCREEN_W], outputRange: [1, 0.98, 1], extrapolate: 'clamp',
  });

  const cardStyle: ViewStyle = { height: cardHeight, width: '100%' };
  const a11yActions = useMemo(
    () => [{ name: 'like' as const, label: 'Like outfit' }, { name: 'skip' as const, label: 'Skip outfit' }],
    [],
  );

  if (!active) return null;

  return (
    <View testID={testID} style={[styles.stack, { height: cardHeight }]}>
      {peek ? (
        <Animated.View
          key={`peek-${keyOf(peek)}`}
          style={[styles.cardBase, cardStyle, { transform: [{ scale: peekScale }] }]}
          pointerEvents="none"
        >
          {renderCard(peek, 'peek')}
        </Animated.View>
      ) : null}

      <Animated.View
        key={`active-${keyOf(active)}`}
        accessibilityActions={a11yActions}
        onAccessibilityAction={e => {
          if (e.nativeEvent.actionName === 'like') onLike(active);
          if (e.nativeEvent.actionName === 'skip') onSkip(active);
        }}
        style={[styles.cardBase, cardStyle, { transform: [{ translateX: pan.x }, { rotate }] }]}
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
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit` → no new errors.

---

## Task 3: `OptionSheet` interruptible assembly entrance

**Files:**
- Modify: `src/screens/HomeScreen.tsx` (the `OptionSheet` component + grid render)

- [ ] **Step 1:** Add `reveal?: 'full' | 'light' | 'none'` to `OptionSheet`. On mount, stagger the grid item wrappers' opacity (0→1) + translateY (`motion.distance.sm`→0): `full` → `motion.stagger.normal` (80ms) + `motion.easing.enter` over `motion.duration.reveal`; `light` → `motion.stagger.tight` over `motion.duration.fast`; `none` → render visible immediately. Each item wrapper holds its own `Animated.Value`. On unmount or `reveal==='none'`, settle to visible immediately (no blocked interaction).
- [ ] **Step 2:** In the HomeScreen `renderCard`, pass `reveal="full"` when `activeIndex === 0 && role === 'active'`, `reveal="light"` for other active cards, `reveal="none"` for the peek card.
- [ ] **Step 3: Typecheck** — `npx tsc --noEmit` → no new errors.

---

## Task 4: `OutfitActionRow` — drop dots + "Show another"

**Files:**
- Modify: `src/components/features/OutfitActionRow.tsx`

- [ ] **Step 1:** Remove the dots `View` and the "Show another" `TouchableOpacity`; keep "Remix". Remove unused props (`dotCount`, `activeIndex`, `onShowAnother`, `showAnotherDisabled`) + their types.
- [ ] **Step 2:** Remove those props from the `OptionSheet`/`OutfitActionRow` call sites in `HomeScreen.tsx`.
- [ ] **Step 3: Typecheck** — `npx tsc --noEmit`.

---

## Task 5: HomeScreen integration — `activeIndex` model + deck

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1:** Replace `[setIndex]/[outfitIndex]` + their refs + `clampedOutfitIndex` with `const [activeIndex, setActiveIndex] = useState(0)` + `activeIndexRef`; `activeOutfit = listOutfits[activeIndex]`.
- [ ] **Step 2:** Replace `handleOutfitChange`/`handleSetChange`/`handleSetMomentumEnd`/`handleHorizontalMomentumEnd`/`handleShowAnother` with:
  - `handleLike(outfit)` → existing quick-save path (same as header heart), reset `unfavoritedSwipeCountRef`, then advance `activeIndex`.
  - `handleSkip(outfit)` → mark seen, `maybeArmHorizontalCoach` as needed, count unfavourited skip → `openContextModalSequenced()` at `UNFAVORITED_SWIPE_THRESHOLD`, `ensureBuffer()`, advance `activeIndex`.
- [ ] **Step 3:** Re-key `ensureBuffer` to `activeIndexRef.current` vs `listOutfits.length` with `TARGET_AHEAD`.
- [ ] **Step 4:** Replace the `home-set-pager` FlatList + `OutfitSetRow` with `<OutfitSwipeDeck … testID="home-swipe-deck" />`; `renderCard` returns the existing `<OptionSheet>` for the given outfit (pin, saveState, collage, Wear-this, Remix, reveal). Delete `OutfitSetRow`.
- [ ] **Step 5:** Coach-mark: keep only `<SwipeCoachMark variant="horizontal" enabled={listOutfits.length > 0} />`; delete the vertical `<SwipeCoachMark variant="vertical">` and all `verticalCoach*` state/handlers; on mount remove AsyncStorage `@auxi/coachmark/swipe-set` (next to the existing `swipe-home` retirement).
- [ ] **Step 6:** End-of-deck: when `activeIndex >= listOutfits.length - 1` and `hasCycled`/depleted, show `home-cycled-hint` with the "all caught up" copy; last card stays.
- [ ] **Step 7: Typecheck + lint** — `npx tsc --noEmit` (no new errors) and `yarn lint` (no new over baseline 4/3).

---

## Task 6: i18n keys

**Files:**
- Modify: `src/translations/en-EN.json`, `vi-VN.json`, `fr-FR.json`

- [ ] **Step 1:** Add under `home`: `coachmark_swipe_lr` (en "Swipe right to save, swipe left to skip." · vi "Vuốt phải để lưu, vuốt trái để bỏ qua." · fr "Glissez à droite pour enregistrer, à gauche pour passer."), `all_caught_up` (en "You're all caught up for now." + vi/fr), `a11y_like`, `a11y_skip`. Grep-verify and drop obsolete `outfitActions.show_another` if unreferenced.
- [ ] **Step 2: Typecheck** — `npx tsc --noEmit`.

---

## Task 7: Rewrite Maestro flow

**Files:**
- Modify: `maestro/flows/home/swipe.yaml`

- [ ] **Step 1:** Replace vertical-swipe / `home-mode-pill-*` / `home-outfit-sheet-0` steps with: wait `home-swipe-deck`; `swipe direction: RIGHT` → assert `home-heart-toggle-saved`; `swipe direction: LEFT` → assert next card present; tap `home-wear-this` → assert mood sheet. Update/relocate pin steps to the active card's tile testIDs or drop if no longer addressable.
- [ ] **Step 2:** Note in-file that swipe-gesture fidelity is verified by the sim walk (spec §8); Maestro covers structure/regression.

---

## Task 8: Verification

- [ ] `yarn jest src/theme/__tests__/motion.test.ts` → PASS.
- [ ] `npx tsc --noEmit` → no new errors.
- [ ] `yarn lint` → no new errors over baseline.
- [ ] iOS sim (`9DCBFE8A…`): drag tracks finger with ≤6° tilt; <30% release springs back (no bounce); right→`home-heart-toggle-saved` + next card; left→next; 3 unfavourited skips→`ContextChipsModal`; reduced-motion shows no fling; end-of-deck keeps last card + hint.
- [ ] Commit only when the user asks (repo rule).

---

## Self-review notes
- Spec §2–§7 each map to Tasks 1–7; §3 motion values centralised in Task 1 tokens, consumed everywhere (no hardcoded timings). §3.2 reduced-motion: Task 1 `useReducedMotion` + Task 2 gesture gate + Task 6 a11y labels. §3.3 emotion layer = `applyEmotion` hook (Task 1); HomeScreen passes default `confident` until mode wiring lands.
- Naming consistency across tasks: `onLike`/`onSkip`, `activeIndex`, `OutfitSwipeDeck`, `motion.*`, `applyEmotion`, `useReducedMotion`, `rotationForDx`, `isCommit`.
- Open risk: `OptionSheet` currently lives inside `HomeScreen.tsx`; passing it as a render prop avoids a circular import. If HomeScreen grows unwieldy, extracting `OptionSheet` to its own file is a reasonable follow-up (not required for this plan).
