// AU-307 — Pin confirm / replace sheet (Figma redesign, node 3276:31736).
//
// Full-width bottom-anchored sheet (rounded top corners + grabber) replacing
// the old centered two-button card. Per CEO decision 2:
//   - single full-width "Pin & build" CTA (no Cancel/Build two-button row)
//   - "Don't show this popup again" checkbox below the CTA
// Two variants share one component:
//   - 'confirm' — first pin, copy: "Keep this item"
//   - 'replace' — swap pinned, copy: "Replace pinned item?"
//
// Motion: slide-up open (medium + enter) / slide-down close (normal + exit)
// with an asymmetric open/close pair, AND a reduce-motion branch that snaps
// instead of sliding (motion-rules.md §4). Primary CTA debounced via local
// `isPressed` so a double-tap can't fire two dispatches before the parent
// reducer flips `outfit==='generating'`.

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import IconHomePin from '../../assets/images/icon_home_pin.svg';
import { theme } from '../../theme/theme';
import { motion, useReducedMotion } from '../../theme/motion';
import { useBackgroundScale } from '../../context/BackgroundScaleContext';

const { height: screenHeight } = Dimensions.get('window');

export type PinConfirmModalVariant = 'confirm' | 'replace';

export interface PinConfirmModalProps {
  visible: boolean;
  variant: PinConfirmModalVariant;
  itemImageUrl?: string | null;
  itemLabel?: string;
  /** Whether the pinned item is a system "common" essential (shows badge). */
  isCommonItem?: boolean;
  /** State of the "Don't show this popup again" checkbox. */
  dontShowAgain: boolean;
  onToggleDontShowAgain: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PinConfirmModal: React.FC<PinConfirmModalProps> = ({
  visible,
  variant,
  itemImageUrl,
  itemLabel,
  isCommonItem = false,
  dontShowAgain,
  onToggleDontShowAgain,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [shouldRender, setShouldRender] = useState(visible);
  const { pushSheet, popSheet } = useBackgroundScale();
  useEffect(() => {
    if (!visible) {
      return;
    }
    pushSheet();
    return () => popSheet();
  }, [visible, pushSheet, popSheet]);
  const [isPressed, setIsPressed] = useState(false);
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    if (visible && !shouldRender) {
      setShouldRender(true);
      return;
    }

    if (visible) {
      // Reset debounce guard on each fresh open.
      setIsPressed(false);
      if (reduceMotion) {
        // Reduce-motion: snap in, no slide.
        slideAnim.setValue(0);
        return;
      }
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

    if (reduceMotion) {
      // Reduce-motion: snap out, no slide.
      slideAnim.setValue(screenHeight);
      setShouldRender(false);
      return;
    }
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: motion.duration.normal,
      easing: motion.easing.exit,
      useNativeDriver: true,
    }).start(() => {
      setShouldRender(false);
    });
  }, [reduceMotion, shouldRender, slideAnim, visible]);

  if (!shouldRender) {
    return null;
  }

  const handleConfirm = () => {
    if (isPressed) {
      return;
    }
    setIsPressed(true);
    onConfirm();
  };

  const titleKey =
    variant === 'replace' ? 'pin.replace_title' : 'pin.modal_title';

  return (
    <Modal
      transparent
      visible={shouldRender}
      animationType="none"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay} accessibilityViewIsModal>
        <Pressable
          testID="pin-confirm-modal-scrim"
          style={StyleSheet.absoluteFillObject}
          onPress={onCancel}
        />

        <Animated.View
          testID="pin-confirm-modal-root"
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* Grabber handle (CEO decision 2). */}
          <View style={styles.grabber} accessibilityElementsHidden />

          <View style={styles.headerBlock}>
            <Text style={styles.title} testID="pin-confirm-modal-title">
              {t(titleKey)}
            </Text>
            <Text style={styles.subtitle} testID="pin-confirm-modal-subtitle">
              {t('pin.modal_subtitle')}
            </Text>
          </View>

          <View style={styles.itemPreview}>
            {itemImageUrl ? (
              <Image
                testID="pin-confirm-modal-image"
                source={{ uri: itemImageUrl }}
                style={styles.itemImage}
                resizeMode="cover"
                accessibilityLabel={itemLabel}
              />
            ) : (
              <View style={[styles.itemImage, styles.itemImagePlaceholder]} />
            )}
            {isCommonItem ? (
              <View style={styles.commonBadge} accessibilityElementsHidden>
                <Text style={styles.commonBadgeText} numberOfLines={1}>
                  {t('common.badge_common')}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Single full-width "Pin & build" CTA (CEO decision 2). */}
          <TouchableOpacity
            testID="pin-confirm-modal-confirm"
            accessibilityRole="button"
            accessibilityLabel={t('pin.build_cta')}
            activeOpacity={0.85}
            disabled={isPressed}
            style={[styles.confirmButton, isPressed && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmText}>{t('pin.build_cta')}</Text>
            <IconHomePin
              width={20}
              height={20}
              color={theme.colors.uacTextPrimaryBase}
            />
          </TouchableOpacity>

          {/* "Don't show this popup again" checkbox row. */}
          <TouchableOpacity
            testID="pin-confirm-modal-dont-show-again"
            accessibilityRole="checkbox"
            accessibilityLabel={t('pin.dont_show_again')}
            accessibilityState={{ checked: dontShowAgain }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.checkboxRow}
            onPress={onToggleDontShowAgain}
          >
            <View
              style={[
                styles.checkbox,
                dontShowAgain && styles.checkboxChecked,
              ]}
            >
              {dontShowAgain ? (
                <Text style={styles.checkMark} allowFontScaling={false}>
                  ✓
                </Text>
              ) : null}
            </View>
            <Text style={styles.checkboxLabel}>{t('pin.dont_show_again')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    // Figma scrim: color/neutral/black @ ~30%.
    backgroundColor: theme.colors.figmaOverlayScrim,
  },
  sheet: {
    zIndex: theme.zIndex.modal,
    width: '100%',
    borderTopLeftRadius: theme.ds.radius.md,
    borderTopRightRadius: theme.ds.radius.md,
    backgroundColor: theme.ds.color.surface,
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.m,
    paddingBottom: 36, // Figma button-group pb 36
    alignItems: 'center',
    ...theme.ds.shadow.sheet,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: theme.ds.radius.full,
    backgroundColor: theme.ds.color.tanStroke,
    marginBottom: theme.spacing.m,
  },
  headerBlock: {
    alignSelf: 'stretch',
    gap: theme.spacing.s,
    marginBottom: theme.spacing.m,
  },
  title: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
  },
  subtitle: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.uacTextBase,
  },
  itemPreview: {
    alignSelf: 'stretch',
    aspectRatio: 3 / 4,
    borderRadius: theme.ds.radius.md,
    backgroundColor: theme.colors.figmaCardSurface,
    overflow: 'hidden',
    marginBottom: theme.spacing.m,
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    borderWidth: 1,
    borderColor: theme.colors.figmaDivider,
  },
  commonBadge: {
    position: 'absolute',
    bottom: theme.spacing.m,
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.m - 4,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.figmaCardTag,
  },
  commonBadgeText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.white,
  },
  confirmButton: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    minHeight: theme.spacing.uacButtonHeight,
    borderRadius: theme.ds.radius.md,
    backgroundColor: theme.colors.figmaPrimaryButtonBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
    paddingHorizontal: theme.spacing.m,
    marginBottom: theme.spacing.m,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmText: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.figmaPrimaryButtonText,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: theme.ds.radius.xs,
    borderWidth: 1.5,
    borderColor: theme.ds.color.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.ds.color.black,
    borderColor: theme.ds.color.black,
  },
  checkMark: {
    color: theme.ds.color.white,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.uacTextBase,
  },
});
