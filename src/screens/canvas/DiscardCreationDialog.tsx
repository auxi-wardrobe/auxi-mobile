/**
 * Discard-unsaved-creation confirmation — full-width bottom sheet shown when the
 * user leaves the Outfit Canvas with unsaved changes.
 *
 * Motion follows the "Refine suggestions" sheet (ContextChipsModal): a
 * transparent Modal slide-up with the page behind scaling down / lifting via
 * `useBackgroundScale` (Macgie Motion "04. Contextual Bottom Sheet Reveal").
 * Instant under OS "Reduce Motion".
 *
 * Layout: a full-width panel (top corners rounded) with the title/body over a
 * single row of two full-width buttons — a secondary "Save" (persist then
 * leave) and a danger "Discard" (leave without saving).
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { motion, useReducedMotion } from '../../theme/motion';
import { MButton } from '../../components/design-system/lib';
import { useBackgroundScale } from '../../context/BackgroundScaleContext';

const { height: screenHeight } = Dimensions.get('window');

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

  // Page-behind scale-down / lift — the "Refine suggestions" reveal motion.
  const { pushSheet, popSheet } = useBackgroundScale();
  useEffect(() => {
    if (!visible) {
      return;
    }
    pushSheet();
    return () => popSheet();
  }, [visible, pushSheet, popSheet]);

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
          outputRange: [screenHeight, 0],
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

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + theme.spacing.l },
            sheetStyle,
          ]}
          testID="canvas-discard-dialog"
        >
          <Text style={styles.title}>{t('outfitCanvas.discard_title')}</Text>
          <Text style={styles.body}>{t('outfitCanvas.discard_body')}</Text>

          <View style={styles.actions}>
            {/* Save — secondary (outlined); persists then continues the exit. */}
            <View style={styles.actionCell}>
              <MButton
                variant="secondary"
                disabled={isBusy}
                loading={isBusy}
                onPress={onSave}
                testID="canvas-discard-save"
                accessibilityLabel={t('outfitCanvas.discard_save')}
              >
                {t('outfitCanvas.discard_save')}
              </MButton>
            </View>
            {/* Discard — danger (destructive); leaves without saving. */}
            <View style={styles.actionCell}>
              <MButton
                variant="danger"
                disabled={isBusy}
                onPress={onDiscard}
                testID="canvas-discard-confirm"
                accessibilityLabel={t('outfitCanvas.discard_discard')}
              >
                {t('outfitCanvas.discard_discard')}
              </MButton>
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
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.uacPanel,
    borderTopRightRadius: theme.borderRadius.uacPanel,
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.l,
  },
  title: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.figmaTextPrimary,
  },
  body: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    marginTop: theme.spacing.s,
  },
  actions: {
    marginTop: theme.spacing.l,
    flexDirection: 'row',
    gap: theme.spacing.uacDimension12,
  },
  actionCell: {
    flex: 1,
  },
});
