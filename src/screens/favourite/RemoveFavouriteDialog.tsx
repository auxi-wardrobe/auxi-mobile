/**
 * Remove-from-favourite confirmation — bottom sheet (Figma node 3539:23335 →
 * sheet 3539:23380).
 *
 * Structure (CEO 2026-06-19): a bottom-anchored sheet, NOT a centred modal.
 *   - Panel pinned to the screen bottom, `borderTopLeft/RightRadius: 16` only
 *     (square bottom corners), white surface, slide-up on open.
 *   - Button group is a SEPARATE bottom block with a `backdrop-blur-4`
 *     (BlurView, same treatment as HomeViewToggleFooter) + a home-indicator
 *     safe-area inset (`pb-36`), over a dim scrim.
 *   - Destructive action on the LEFT (diverges from the shared SettingsDialog):
 *       "Yes 🗑"  → red-text ghost button + trash icon (no border/fill)
 *       "Cancel"  → outlined secondary button (1.5px neutral border)
 *
 * Motion: slide + scrim fade run off `src/theme/motion.ts` tokens with an
 * open/close asymmetry (enter slower/eased-in, exit faster/eased-out) and an
 * instant fallback under OS "Reduce Motion".
 *
 * Red comes from the `figmaItemDetailDanger` token (icon/danger/base #c0392b),
 * never a literal. testIDs match the prior wiring so Maestro flows keep working
 * (favourite-remove-confirm / favourite-remove-cancel).
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

export const RemoveFavouriteDialog: React.FC<Props> = ({
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
    // Open/close asymmetry (motion-rules): enter is slower + eased-in,
    // exit is faster + eased-out.
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
          <View style={styles.panel} testID="favourite-remove-dialog">
            <Text style={styles.title}>{t('favourite.remove_title')}</Text>
            <Text style={styles.body}>{t('favourite.remove_body')}</Text>
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
                testID="favourite-remove-confirm"
                accessibilityRole="button"
                accessibilityLabel={t('favourite.remove_confirm')}
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
                  {t('favourite.remove_confirm')}
                </Text>
                <Icons.Trash
                  width={24}
                  height={24}
                  color={theme.colors.figmaItemDetailDanger}
                />
              </TouchableOpacity>

              {/* "Cancel" on the RIGHT — the canonical secondary button. */}
              <PillButton
                testID="favourite-remove-cancel"
                accessibilityLabel={t('favourite.remove_cancel')}
                title={t('favourite.remove_cancel')}
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
  // Bottom-anchored sheet wrapper (panel + button block slide together).
  sheet: {
    width: '100%',
  },
  // Panel — top corners radius 16 only (square bottom), px16 / py24.
  panel: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.uacPanel,
    borderTopRightRadius: theme.borderRadius.uacPanel,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.l,
  },
  // Sheet header — Inter SemiBold 14/20 (body/sm Semibold).
  title: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.uacTextBase,
  },
  // Body — Inter Regular 14/20 (body/sm Regular); gap-8 below the title.
  body: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.uacTextBase,
    marginTop: theme.spacing.s,
  },
  // Separate bottom button slab — backdrop-blur-4 over a white tint.
  buttonBlock: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.m,
    overflow: 'hidden',
  },
  // White@90% tint over the blur (matches the header/footer treatment).
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
  // "Yes" ghost: no border/fill, container invisible until interacted (Figma
  // Text-button spec) — rounded so the press ripple/highlight stays pill-shaped.
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
