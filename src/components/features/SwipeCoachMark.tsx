/**
 * SwipeCoachMark — first-time Home guidance overlay (AU-303, Figma node
 * 3140-8191). Parameterized to render BOTH guidance overlays, which differ
 * ONLY by icon + copy (qa-ui review-extraction PASS 2026-05-31):
 *
 *   - HORIZONTAL (frame "first time" 3140:9395 / overlay 3140:9520): fires the
 *     first time Home shows outfits. Copy: "Swipe left or right to explore
 *     different outfit options." Icon: icon_swipe_hand (54×54).
 *   - VERTICAL (frame "after see 1 set" 3140:9763 / overlay 3140:9797): fires
 *     after the user has viewed all 3 outfits of the first set. Copy: two text
 *     nodes — "Swipe up to explore another outfit set." + "Swipe down to go
 *     back" (NO trailing period — intentional, two distinct Figma text nodes).
 *     Icon: icon_swipe_up (54×54).
 *
 * Both: centered white card (366w, radius 16), #262421@70% scrim, "Got it" pill.
 * Dismiss is "Got it" ONLY (CEO 2026-05-31, overrides the ticket's "touch every
 * to close"). Each overlay persists its own AsyncStorage one-time flag.
 *
 * Persistence uses an AsyncStorage one-time flag — NOT `user.is_first_login`,
 * which is already `false` by the time Home mounts (flipped during onboarding).
 */
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import IconSwipeHand from '../../assets/images/icon_swipe_hand.svg';
import IconSwipeUp from '../../assets/images/icon_swipe_up.svg';
import { PillButton } from '../primitives/FigmaPrimitives';
import { theme } from '../../theme/theme';

export type SwipeCoachMarkVariant = 'horizontal' | 'vertical';

// AsyncStorage keys for the two overlays. Exported so HomeScreen can retire the
// old single-overlay key on mount (so existing users see the corrected
// two-axis first-time flow once).
export const COACHMARK_STORAGE_KEYS = {
  horizontal: '@auxi/coachmark/swipe-outfit',
  vertical: '@auxi/coachmark/swipe-set',
} as const;
export const LEGACY_COACHMARK_STORAGE_KEY = '@auxi/coachmark/swipe-home';

// Per-variant config — copy lives here (not inline JSX) per auxi conventions;
// lift into src/translations/* when Home adopts i18n.
const VARIANT_CONFIG: Record<
  SwipeCoachMarkVariant,
  { storageKey: string; lines: string[] }
> = {
  horizontal: {
    storageKey: COACHMARK_STORAGE_KEYS.horizontal,
    lines: ['Swipe left or right to explore different outfit options.'],
  },
  vertical: {
    storageKey: COACHMARK_STORAGE_KEYS.vertical,
    // Two distinct text nodes (Figma 3140:9803 + 3140:9906); second line has
    // NO trailing period by design.
    lines: ['Swipe up to explore another outfit set.', 'Swipe down to go back'],
  },
};

const CTA_LABEL = 'Got it';

interface SwipeCoachMarkProps {
  variant: SwipeCoachMarkVariant;
  /** Only arm the one-time hint once its trigger condition is met. */
  enabled: boolean;
  /**
   * Fired once after `enabled` becomes true and the AsyncStorage flag is read,
   * reporting whether the overlay will actually SHOW (`true` — flag was unset)
   * or was already seen this/prior session (`false`). Lets the parent sequence
   * colliding UI: defer the recurring context modal only if `shown` is true.
   */
  onResolved?: (shown: boolean) => void;
  /**
   * Fired after the overlay is dismissed AND its flag persisted — lets the
   * parent advance any sequenced UI (e.g. the context modal held back while the
   * vertical overlay had priority on the 3rd browse).
   */
  onDismissed?: () => void;
}

export const SwipeCoachMark: React.FC<SwipeCoachMarkProps> = ({
  variant,
  enabled,
  onResolved,
  onDismissed,
}) => {
  const [visible, setVisible] = useState(false);
  const config = VARIANT_CONFIG[variant];
  const Icon = variant === 'vertical' ? IconSwipeUp : IconSwipeHand;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(config.storageKey);
        if (cancelled) return;
        const willShow = seen == null;
        if (willShow) setVisible(true);
        onResolved?.(willShow);
      } catch (err) {
        // On storage error, fail closed (don't nag) rather than show twice.
        if (__DEV__) {
          console.warn('[SwipeCoachMark] AsyncStorage read failed', err);
        }
        onResolved?.(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // onResolved intentionally excluded from deps — it's a stable callback and
    // we only want this to run on enable/key change, not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, config.storageKey]);

  const dismiss = async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(config.storageKey, 'true');
    } catch (err) {
      if (__DEV__) {
        console.warn('[SwipeCoachMark] AsyncStorage write failed', err);
      }
    }
    onDismissed?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
      testID={`home-coachmark-${variant}`}
    >
      <View style={styles.root}>
        {/* Scrim: background/primary/bold_600 (#262421) @ 70%. Dismiss is the
            "Got it" button ONLY — the scrim is NOT tappable (CEO 2026-05-31). */}
        <View style={styles.scrim} />
        <View style={styles.dialog}>
          <View style={styles.titleBlock}>
            <Icon width={54} height={54} color={theme.colors.figmaTextDark} />
            {config.lines.map((line, index) => (
              <Text key={`coachmark-line-${index}`} style={styles.headline}>
                {line}
              </Text>
            ))}
          </View>
          <View style={styles.actions}>
            <PillButton
              variant="text"
              title={CTA_LABEL}
              onPress={dismiss}
              style={styles.gotItButton}
              textStyle={styles.gotItText}
              testID={`home-coachmark-dismiss-${variant}`}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.figmaOverlayScrim, // #262421 @ 70%
  },
  dialog: {
    width: 366,
    maxWidth: '90%',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.uacPanel, // 16
    overflow: 'hidden',
  },
  titleBlock: {
    alignItems: 'center',
    gap: theme.spacing.m, // 16
    paddingTop: theme.spacing.l, // 24
    paddingHorizontal: theme.spacing.l, // 24
    paddingBottom: theme.spacing.xs, // 4
  },
  headline: {
    ...theme.typography.aliases.poppinsBody, // Poppins Regular 16/24
    color: theme.colors.uacTextBase, // #1d1f23
    textAlign: 'center',
  },
  actions: {
    paddingTop: theme.spacing.uacDimension12, // 12
    paddingBottom: theme.spacing.l, // 24
    paddingHorizontal: theme.spacing.l, // 24
  },
  gotItButton: {
    height: theme.spacing.uacButtonHeight, // 56
    alignSelf: 'stretch',
  },
  gotItText: {
    color: theme.colors.uacTextBase, // #1d1f23 (override PillButton default)
  },
});
