/**
 * AU-307 phase 04 — inline fallback banner shown below the outfit grid when
 * the BE returns `low_confidence: true` (relaxed-constraint outfit). No CTA;
 * purely informational. Auto-dismisses: fades out ~5s after mount so it never
 * lingers over the grid.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { motion, useReducedMotion } from '../../theme/motion';

/** How long the notice stays fully visible before it begins fading out. */
const VISIBLE_MS = 5000;

export interface PinFallbackNoticeProps {
  testID?: string;
}

export const PinFallbackNotice: React.FC<PinFallbackNoticeProps> = ({
  testID = 'pin-fallback-notice',
}) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(true);
  const opacity = useRef(new Animated.Value(motion.opacity.visible)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (reduce) {
        setMounted(false);
        return;
      }
      Animated.timing(opacity, {
        toValue: motion.opacity.hidden,
        duration: motion.duration.slow,
        easing: motion.easing.exit,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [opacity, reduce]);

  if (!mounted) {
    return null;
  }

  return (
    <Animated.View
      testID={testID}
      style={[styles.container, { opacity }]}
      accessibilityRole="alert"
    >
      <Text style={styles.message} numberOfLines={2}>
        {t('pin.fallback_message')}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    backgroundColor: theme.colors.figmaCaptionPillBg,
    borderRadius: 12,
  },
  message: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextPrimary,
  },
});

export default PinFallbackNotice;
