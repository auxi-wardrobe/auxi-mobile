/**
 * Remove-from-creations confirmation — bottom sheet. Same component family as
 * RemoveFavouriteDialog (bottom-anchored panel + blurred button slab, slide-up
 * motion off the shared tokens, instant under Reduce Motion); only the copy and
 * testIDs differ so it reads as "My Creations" rather than "Favourite".
 *
 *   Title : "Remove from your Creations"
 *   Body  : "Are you sure to remove this outfit from your creation list?"
 *   CTA 1 : Yes 🗑  — red-text ghost (destructive), on the LEFT
 *   CTA 2 : Cancel  — outlined secondary, on the RIGHT
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { motion, useReducedMotion } from '../../theme/motion';
import { Icons } from '../../assets/icons';
import { PillButton } from '../../components/primitives/FigmaPrimitives';

type Props = {
  visible: boolean;
  isBusy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const RemoveCreationDialog: React.FC<Props> = ({
  visible,
  isBusy,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  // 0 = hidden (sheet off-screen / scrim transparent), 1 = shown.
  const progress = useRef(new Animated.Value(0)).current;
  // Keep the Modal mounted through the exit animation so the slide-down plays.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }
    if (reduced) {
      progress.setValue(visible ? 1 : 0);
      if (!visible) {
        setMounted(false);
      }
      return;
    }
    // Open/close asymmetry (motion-rules): enter slower + eased-in, exit faster.
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? motion.duration.medium : motion.duration.normal,
      easing: visible ? motion.easing.enter : motion.easing.exit,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) {
        setMounted(false);
      }
    });
  }, [visible, reduced, progress]);

  if (!mounted) {
    return null;
  }

  const scrimStyle = {
    opacity: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
  };
  // Slide the whole sheet (panel + button block) up from below.
  const sheetStyle = {
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [320, 0],
        }),
      },
    ],
  };

  return (
    <Modal
      transparent
      animationType="none"
      visible={mounted}
      onRequestClose={onCancel}
    >
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={onCancel}>
          <Animated.View style={[styles.scrim, scrimStyle]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.sheet, sheetStyle]}>
          {/* Panel — top corners only, square bottom (sits flush above the
              button block). */}
          <View style={styles.panel} testID="creation-remove-dialog">
            <Text style={styles.title}>{t('myCreations.remove_title')}</Text>
            <Text style={styles.body}>{t('myCreations.remove_body')}</Text>
          </View>

          {/* Button block — separate bottom slab: backdrop blur + home-indicator
              safe-area inset, pinned to the screen bottom. */}
          <View
            style={[
              styles.buttonBlock,
              { paddingBottom: insets.bottom + theme.spacing.l },
            ]}
          >
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="light"
              blurAmount={4}
              reducedTransparencyFallbackColor={theme.colors.white}
              pointerEvents="none"
            />
            <View style={styles.buttonTint} pointerEvents="none" />

            <View style={styles.actions}>
              {/* Destructive "Yes" on the LEFT — red-text ghost + trash icon. */}
              <TouchableOpacity
                testID="creation-remove-confirm"
                accessibilityRole="button"
                accessibilityLabel={t('myCreations.remove_confirm')}
                activeOpacity={0.82}
                disabled={isBusy}
                style={[
                  styles.action,
                  styles.ghostAction,
                  isBusy && styles.disabledAction,
                ]}
                onPress={onConfirm}
              >
                <Text style={styles.dangerLabel}>
                  {t('myCreations.remove_confirm')}
                </Text>
                <Icons.Trash
                  width={24}
                  height={24}
                  color={theme.colors.figmaItemDetailDanger}
                />
              </TouchableOpacity>

              {/* "Cancel" on the RIGHT — the canonical secondary button. */}
              <PillButton
                testID="creation-remove-cancel"
                accessibilityLabel={t('myCreations.remove_cancel')}
                title={t('myCreations.remove_cancel')}
                variant="outline"
                disabled={isBusy}
                style={styles.action}
                onPress={onCancel}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.figmaOverlayScrim,
  },
  sheet: {
    width: '100%',
  },
  panel: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.uacPanel,
    borderTopRightRadius: theme.borderRadius.uacPanel,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.l,
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
  buttonBlock: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.m,
    overflow: 'hidden',
  },
  buttonTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.figmaItemDetailHeaderBg,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension12,
  },
  action: {
    flex: 1,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  ghostAction: {
    borderRadius: theme.borderRadius.round,
  },
  dangerLabel: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.figmaItemDetailDanger,
  },
  disabledAction: {
    opacity: 0.55,
  },
});
