/**
 * SwipeCoachMark — first-time Home coach-mark overlay (Figma node 3140:9520,
 * frame "first time" 3140:9395). Shown ONCE the first time the user reaches
 * Home with outfits to swipe, explaining the horizontal swipe-to-explore
 * gesture. Dismissed via "Got it"; persisted so it never shows again.
 *
 * Persistence uses an AsyncStorage one-time flag — NOT `user.is_first_login`,
 * which is already `false` by the time Home mounts (flipped during onboarding).
 */
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import IconSwipeHand from '../../assets/images/icon_swipe_hand.svg';
import { PillButton } from '../primitives/FigmaPrimitives';
import { theme } from '../../theme/theme';

const STORAGE_KEY = '@auxi/coachmark/swipe-home';

// i18n-ready: HomeScreen does not wire i18n yet, so copy lives here as
// constants (consistent with the screen). Lift into `src/translations/*`
// when Home adopts i18n.
const COPY = {
  headline: 'Swipe left or right to explore different outfit options.',
  cta: 'Got it',
};

interface SwipeCoachMarkProps {
  /** Only arm the one-time hint once there is content to swipe. */
  enabled: boolean;
  testID?: string;
}

export const SwipeCoachMark: React.FC<SwipeCoachMarkProps> = ({
  enabled,
  testID = 'home-coachmark',
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && seen == null) setVisible(true);
      } catch (err) {
        // On storage error, fail closed (don't nag) rather than show twice.
        if (__DEV__) {
          console.warn('[SwipeCoachMark] AsyncStorage read failed', err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const dismiss = async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } catch (err) {
      if (__DEV__) {
        console.warn('[SwipeCoachMark] AsyncStorage write failed', err);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
      testID={testID}
    >
      <View style={styles.root}>
        {/* Scrim: background/primary/bold_600 (#262421) @ 70% */}
        <View style={styles.scrim} />
        <View style={styles.dialog}>
          <View style={styles.titleBlock}>
            <IconSwipeHand width={54} height={54} />
            <Text style={styles.headline}>{COPY.headline}</Text>
          </View>
          <View style={styles.actions}>
            <PillButton
              variant="text"
              title={COPY.cta}
              onPress={dismiss}
              style={styles.gotItButton}
              textStyle={styles.gotItText}
              testID="home-coachmark-got-it"
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
    backgroundColor: theme.colors.figmaCtaLabel, // #262421
    opacity: 0.7,
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
