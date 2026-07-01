import React from 'react';
import { Animated, Text } from 'react-native';
import IconChevronLeft from '../../../assets/images/icon_chevron_left.svg';
import { styles } from '../styles';

type DeckCueProps = {
  backOpacity: Animated.AnimatedInterpolation<number>;
  nextOpacity: Animated.AnimatedInterpolation<number>;
  /** Hidden on the first card — there is nothing to return to. */
  showBack: boolean;
  backLabel: string;
  skipLabel: string;
};

/**
 * Swipe-affordance cues rendered over the outfit deck: a "back" chevron on the
 * right edge (swipe right → previous) and a "skip" cue on the left edge (swipe
 * left → next). Opacities are driven by the deck's gesture interpolations.
 */
export const DeckCue = ({
  backOpacity,
  nextOpacity,
  showBack,
  backLabel,
  skipLabel,
}: DeckCueProps) => (
  <>
    {/* Swipe right → previous: back chevron on the right edge
        (hidden on the first card — nothing to return to). */}
    {showBack ? (
      <Animated.View
        pointerEvents="none"
        style={[styles.deckCue, styles.deckCueLike, { opacity: backOpacity }]}
      >
        <IconChevronLeft width={20} height={20} />
        <Text style={styles.deckCueSkipText}>{backLabel}</Text>
      </Animated.View>
    ) : null}
    {/* Swipe left → next: cue on the left edge. */}
    <Animated.View
      pointerEvents="none"
      style={[styles.deckCue, styles.deckCueSkip, { opacity: nextOpacity }]}
    >
      <Text style={styles.deckCueSkipText}>{skipLabel}</Text>
    </Animated.View>
  </>
);
