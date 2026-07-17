import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { motion } from '../../theme/motion';
import { useBackgroundScale } from '../../context/BackgroundScaleContext';

const { height: screenHeight } = Dimensions.get('window');

// Grace period between unmounting this sheet's native modal and telling the
// parent it can present another one. The dismissal is animated:NO
// (animationType="none") so it completes within a runloop; 80ms is safely
// past it and imperceptible after the 240ms slide-out.
const MODAL_HANDOFF_DELAY_MS = 80;

interface OutfitLimitSheetProps {
  visible: boolean;
  // Primary CTA — close the sheet and open the Refine sheet.
  onRefine: () => void;
  // Secondary CTA — dismiss and let the user keep swiping the existing looks.
  onKeepBrowsing: () => void;
  // Fires once the sheet's native modal is FULLY gone (exit animation done +
  // dismissal handoff). Chain any follow-up modal presentation (e.g. the
  // refine sheet) from here — presenting while this modal is still
  // dismissing fails silently on iOS and the new modal never appears.
  onDismissed?: () => void;
}

/**
 * Shown when the user reaches the end of the available outfit combinations for
 * their current selections (pool depleted). Offers a path forward — refine the
 * suggestions — or to keep browsing the looks already generated. Modal/animation
 * scaffolding follows the house pattern (ContextChipsModal / MoodFeedbackSheet).
 */
export const OutfitLimitSheet: React.FC<OutfitLimitSheetProps> = ({
  visible,
  onRefine,
  onKeepBrowsing,
  onDismissed,
}) => {
  const { t } = useTranslation();
  const [shouldRender, setShouldRender] = useState(visible);
  const { pushSheet, popSheet } = useBackgroundScale();
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  // Ref-mirror the callback so the animation effect below doesn't re-run (and
  // replay the enter animation) when the parent re-creates it.
  const onDismissedRef = useRef(onDismissed);
  useEffect(() => {
    onDismissedRef.current = onDismissed;
  });
  const handoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (handoffTimerRef.current != null) {
        clearTimeout(handoffTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }
    pushSheet();
    return () => popSheet();
  }, [visible, pushSheet, popSheet]);

  useEffect(() => {
    if (visible && !shouldRender) {
      setShouldRender(true);
      return;
    }

    if (visible) {
      slideAnim.setValue(screenHeight);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: motion.duration.medium,
        easing: motion.easing.enter,
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!shouldRender) {
      return;
    }

    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: motion.duration.normal,
      easing: motion.easing.exit,
      useNativeDriver: true,
    }).start(() => {
      setShouldRender(false);
      handoffTimerRef.current = setTimeout(() => {
        handoffTimerRef.current = null;
        onDismissedRef.current?.();
      }, MODAL_HANDOFF_DELAY_MS);
    });
  }, [shouldRender, slideAnim, visible]);

  if (!shouldRender) {
    return null;
  }

  const tips = [
    t('home.explore_limit_tip_occasion'),
    t('home.explore_limit_tip_unpin'),
    t('home.explore_limit_tip_wardrobe'),
  ];

  return (
    <Modal
      transparent
      visible={shouldRender}
      animationType="none"
      onRequestClose={onKeepBrowsing}
    >
      <View style={styles.overlay}>
        <Pressable
          testID="outfit-limit-backdrop"
          accessibilityLabel={t('home.explore_limit_keep_browsing')}
          style={StyleSheet.absoluteFillObject}
          onPress={onKeepBrowsing}
        />

        <Animated.View
          testID="outfit-limit-sheet"
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <Text style={styles.title}>{t('home.explore_limit_title')}</Text>
          <Text style={styles.body}>{t('home.explore_limit_body')}</Text>

          <Text style={styles.tipsIntro}>
            {t('home.explore_limit_tips_intro')}
          </Text>
          <View style={styles.tipList}>
            {tips.map(tip => (
              <View key={tip} style={styles.tipRow}>
                <Text style={styles.tipBullet}>{'•'}</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            testID="outfit-limit-refine"
            activeOpacity={0.85}
            style={styles.refineButton}
            onPress={onRefine}
          >
            <Text style={styles.refineText}>
              {t('home.explore_limit_refine')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="outfit-limit-keep-browsing"
            activeOpacity={0.7}
            style={styles.keepBrowsingButton}
            onPress={onKeepBrowsing}
          >
            <Text style={styles.keepBrowsingText}>
              {t('home.explore_limit_keep_browsing')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Dim tier — RN <Modal> host carries the scrim (see docs/Z_INDEX_LAYERING.md §1).
  // Matches the refine sheet (ContextChipsModal) scrim for visual parity.
  overlay: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    // Modal tier — sheet sits above the dim/dismiss layer.
    zIndex: theme.zIndex.modal,
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: theme.colors.figmaSurface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: theme.ds.color.shadow,
    shadowOffset: { width: 0, height: 19 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 16,
  },
  title: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.uacTextBase,
  },
  body: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.uacTextBase,
    marginTop: theme.spacing.s,
  },
  tipsIntro: {
    ...theme.typography.aliases.interBodySmTight,
    color: theme.colors.uacTextBase,
    marginTop: theme.spacing.m,
  },
  tipList: {
    marginTop: theme.spacing.xs,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipBullet: {
    ...theme.typography.aliases.interBodySmTight,
    color: theme.colors.uacTextBase,
    width: 16,
  },
  tipText: {
    ...theme.typography.aliases.interBodySmTight,
    color: theme.colors.uacTextBase,
    flex: 1,
  },
  // Full-width primary CTA. Height / radius / fill / text match the refine
  // sheet's confirm button (ContextChipsModal.confirmButton + confirmText).
  refineButton: {
    marginTop: theme.spacing.l,
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.figmaPrimaryButtonBg,
  },
  refineText: {
    ...theme.typography.aliases.interButton,
    color: theme.colors.figmaPrimaryButtonText,
  },
  // Secondary text button — mirrors the refine sheet's "Skip for now"
  // (ContextChipsModal.skipText): archivoBody @ color/primary/600.
  keepBrowsingButton: {
    marginTop: theme.spacing.xs,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepBrowsingText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaPrimary600,
  },
});
