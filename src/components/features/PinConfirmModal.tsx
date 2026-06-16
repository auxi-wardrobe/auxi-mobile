// AU-307 — Pin confirm / replace modal.
//
// Two variants share one component:
//   - 'confirm' — first pin, copy: "Keep this item"
//   - 'replace' — swap pinned, copy: "Replace pinned item?"
//
// Layout mirrors ContextChipsModal: RN <Modal transparent>, dim overlay
// (rgba(0,0,0,0.5)), tap-scrim dismiss, animated slide-up card. Primary CTA
// debounced via local `isPressed` state so a double-tap can't fire two
// dispatches before the parent reducer flips `outfit==='generating'`.

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
import { motion } from '../../theme/motion';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const MODAL_WIDTH = Math.min(screenWidth - 32, 360);
const ITEM_IMAGE_SIZE = 144;

export type PinConfirmModalVariant = 'confirm' | 'replace';

export interface PinConfirmModalProps {
  visible: boolean;
  variant: PinConfirmModalVariant;
  itemImageUrl?: string | null;
  itemLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PinConfirmModal: React.FC<PinConfirmModalProps> = ({
  visible,
  variant,
  itemImageUrl,
  itemLabel,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [shouldRender, setShouldRender] = useState(visible);
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
    });
  }, [shouldRender, slideAnim, visible]);

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
          style={[
            styles.card,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
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
            <View style={styles.pinIndicator} accessibilityElementsHidden>
              <IconHomePin width={20} height={20} />
            </View>
          </View>

          <Text style={styles.title} testID="pin-confirm-modal-title">
            {t(titleKey)}
          </Text>
          <Text style={styles.subtitle} testID="pin-confirm-modal-subtitle">
            {t('pin.modal_subtitle')}
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              testID="pin-confirm-modal-cancel"
              accessibilityRole="button"
              accessibilityLabel={t('pin.cancel_cta')}
              activeOpacity={0.85}
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>{t('pin.cancel_cta')}</Text>
            </TouchableOpacity>

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
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  card: {
    zIndex: theme.zIndex.modal,
    width: MODAL_WIDTH,
    borderRadius: 20,
    backgroundColor: theme.colors.figmaSurface,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 19 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 16,
  },
  itemPreview: {
    width: ITEM_IMAGE_SIZE,
    height: ITEM_IMAGE_SIZE,
    marginBottom: 16,
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: theme.colors.figmaIconSurface,
  },
  itemImagePlaceholder: {
    borderWidth: 1,
    borderColor: theme.colors.figmaDivider,
  },
  pinIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.figmaAction,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.aliases.playfairDisplaySection,
    color: theme.colors.figmaAction,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaAction,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.figmaDivider,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cancelText: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaAction,
  },
  confirmButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: theme.colors.figmaAction,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmText: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.white,
  },
});
