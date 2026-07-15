// Macgie Motion System v1.0 — see docs/MOTION_SYSTEM.md (Linear AU-333…338).
// Single source of truth for animation values. Do NOT hardcode timings,
// distances, or easings in components — reference a token here.
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Easing } from 'react-native';

export const motion = {
  duration: {
    instant: 50,
    fast: 120,
    normal: 250,
    medium: 350,
    slow: 500,
    reveal: 700,
  },
  distance: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  scale: { background: 0.96, press: 0.97, hover: 1.02, select: 1.03, emphasis: 1.05 },
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

// Swipe-deck carousel depth: the active card sits foregrounded at full size
// (1.0) while its neighbours rest smaller behind it at DECK_PEEK_SCALE. The
// scale is driven live by the drag, so as a card is held and swiped it recedes
// to the neighbour scale while the incoming card grows to full — a carousel
// cross-scale rather than a card popping in after it lands.
export const DECK_PEEK_SCALE = 0.92;

// Home outfit carousel (coverflow) geometry. The active suggestion sits centred
// at CARD_CAROUSEL_WIDTH_RATIO of the screen width; the previous and next
// suggestions peek either side, separated by CARD_CAROUSEL_GAP, receding to
// DECK_PEEK_SCALE and dimming to motion.opacity.subtle. Neighbour centres sit
// one (card width + gap) apart, so a card is centred when the drag offsets it
// exactly onto the middle slot.
export const CARD_CAROUSEL_WIDTH_RATIO = 0.78;
export const CARD_CAROUSEL_GAP = 12;
export const CARD_CAROUSEL_SIDE_OPACITY = 0.6;

// Swipe-deck geometry constants (spec §2.2).
export const SWIPE_ROTATION_CAP_DEG = 6;
export const SWIPE_COMMIT_RATIO = 0.3; // fraction of screen width
export const SWIPE_COMMIT_VELOCITY = 0.4;

/** Card tilt (deg) for a horizontal drag of `dx` over a card of `width`, capped ±6°. */
export const rotationForDx = (dx: number, width: number): number => {
  const raw = (dx / width) * (SWIPE_ROTATION_CAP_DEG * 2);
  return Math.max(
    -SWIPE_ROTATION_CAP_DEG,
    Math.min(SWIPE_ROTATION_CAP_DEG, raw),
  );
};

/** Whether a release commits the swipe (past 30% of width OR a fast flick). */
export const isCommit = (dx: number, vx: number, width: number): boolean =>
  Math.abs(dx) > width * SWIPE_COMMIT_RATIO ||
  Math.abs(vx) > SWIPE_COMMIT_VELOCITY;

export type EmotionDirection =
  | 'calm'
  | 'confident'
  | 'creative'
  | 'social'
  | 'comfort'
  | 'none';

export type MotionConfig = { duration: number; stagger: number };

/**
 * Emotion Motion Layer (AU-334): scales an EXISTING motion config per the
 * user's desired identity direction. It only adjusts duration/stagger — it
 * never introduces new motion. Stays subtle by design.
 */
export const applyEmotion = (
  dir: EmotionDirection,
  cfg: MotionConfig,
): MotionConfig => {
  switch (dir) {
    case 'calm':
      return {
        duration: Math.round(cfg.duration * 1.15),
        stagger: cfg.stagger + 30,
      };
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

/** Tracks the OS "Reduce Motion" setting (spec §3.2 fallback). */
export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) {
        setReduced(value);
      }
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
};
