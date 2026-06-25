/**
 * Discard-unsaved-creation confirmation — bottom sheet shown when the user
 * leaves the Outfit Canvas with unsaved changes. Mirrors RemoveFavouriteDialog's
 * structure (bottom-anchored panel + blurred button slab, slide-up motion off
 * the shared motion tokens, instant under Reduce Motion) so the two read as the
 * same component family.
 *
 *   Title : "Discard this creation?"
 *   Body  : "Your changes haven't been saved."
 *   CTA 1 : Save    — outlined primary; persists then proceeds with the exit.
 *   CTA 2 : Discard — red-text ghost (destructive); leaves without saving.
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

type Props = {
  visible: boolean;
  isBusy?: boolean;
  /** Backdrop / hardware-back dismiss — stay on the canvas, no exit. */
  onCancel: () => void;
  /** Persist the creation, then continue leaving. */
  onSave: () => void;
  /** Leave without saving. */
  onDiscard: () => void;
};

export const DiscardCreationDialog: React.FC<Props> = ({
  visible,
  isBusy = false,
  onCancel,
  onSave,
  onDiscard,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  const progress = useRef(new Animated.Value(0)).current;
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
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
  };
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
          <View style={styles.panel} testID="canvas-discard-dialog">
            <Text style={styles.title}>{t('outfitCanvas.discard_title')}</Text>
            <Text style={styles.body}>{t('outfitCanvas.discard_body')}</Text>
          </View>

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
              {/* CTA 1: Save — outlined primary. */}
              <TouchableOpacity
                testID="canvas-discard-save"
                accessibilityRole="button"
                accessibilityLabel={t('outfitCanvas.discard_save')}
                activeOpacity={0.82}
                disabled={isBusy}
                style={[
                  styles.action,
                  styles.outlinedAction,
                  isBusy && styles.disabledAction,
                ]}
                onPress={onSave}
              >
                <Text style={styles.saveLabel}>
                  {t('outfitCanvas.discard_save')}
                </Text>
              </TouchableOpacity>

              {/* CTA 2: Discard — red-text ghost (destructive). */}
              <TouchableOpacity
                testID="canvas-discard-confirm"
                accessibilityRole="button"
                accessibilityLabel={t('outfitCanvas.discard_discard')}
                activeOpacity={0.82}
                disabled={isBusy}
                style={[
                  styles.action,
                  styles.ghostAction,
                  isBusy && styles.disabledAction,
                ]}
                onPress={onDiscard}
              >
                <Text style={styles.dangerLabel}>
                  {t('outfitCanvas.discard_discard')}
                </Text>
              </TouchableOpacity>
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
  // "Save" outlined primary: 1.5px neutral border, CTA radius.
  outlinedAction: {
    borderWidth: 1.5,
    borderColor: theme.colors.uacTextBase,
    borderRadius: theme.borderRadius.uacButtonCta,
  },
  // "Discard" ghost: no border/fill, rounded press highlight.
  ghostAction: {
    borderRadius: theme.borderRadius.round,
  },
  saveLabel: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.uacTextBase,
  },
  dangerLabel: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.figmaItemDetailDanger,
  },
  disabledAction: {
    opacity: 0.55,
  },
});
