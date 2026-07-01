/**
 * Remove-from-favourite confirmation — full-width bottom sheet.
 *
 * Motion follows the "Refine suggestions" sheet (ContextChipsModal): a
 * transparent Modal slide-up with the page behind scaling down / lifting via
 * `useBackgroundScale` (Macgie Motion "04. Contextual Bottom Sheet Reveal").
 * Instant under OS "Reduce Motion".
 *
 * Layout: a full-width panel (top corners rounded) with the title/body over a
 * single row of two full-width buttons — a secondary "Cancel" and a danger
 * "Yes" (trash icon). Same component shape as RemoveCreationDialog; only the
 * copy and testIDs differ (favourite-remove-confirm / favourite-remove-cancel,
 * preserved so Maestro flows keep working).
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
import { Icons } from '../../assets/icons';
import { MButton } from '../../components/design-system/lib';
import { useBackgroundScale } from '../../context/BackgroundScaleContext';

const { height: screenHeight } = Dimensions.get('window');

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

  // Page-behind scale-down / lift — the "Refine suggestions" reveal motion.
  const { pushSheet, popSheet } = useBackgroundScale();
  useEffect(() => {
    if (!visible) {
      return;
    }
    pushSheet();
    return () => popSheet();
  }, [visible, pushSheet, popSheet]);

  // 0 = hidden (sheet below screen / scrim transparent), 1 = shown.
  const progress = useRef(new Animated.Value(0)).current;
  // Keep the Modal mounted through the exit so the slide-down plays.
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
          testID="favourite-remove-dialog"
        >
          <Text style={styles.title}>{t('favourite.remove_title')}</Text>
          <Text style={styles.body}>{t('favourite.remove_body')}</Text>

          <View style={styles.actions}>
            {/* Cancel — canonical secondary (outlined), on the LEFT. */}
            <View style={styles.actionCell}>
              <MButton
                variant="secondary"
                disabled={isBusy}
                onPress={onCancel}
                testID="favourite-remove-cancel"
                accessibilityLabel={t('favourite.remove_cancel')}
              >
                {t('favourite.remove_cancel')}
              </MButton>
            </View>
            {/* Destructive confirm — danger button + trash icon, on the RIGHT. */}
            <View style={styles.actionCell}>
              <MButton
                variant="danger"
                rightIcon={Icons.Trash}
                disabled={isBusy}
                loading={isBusy}
                onPress={onConfirm}
                testID="favourite-remove-confirm"
                accessibilityLabel={t('favourite.remove_confirm')}
              >
                {t('favourite.remove_confirm')}
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
  // Full-width sheet pinned to the bottom, top corners rounded only.
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
  // Two full-width buttons side by side (each cell flexes to half the row).
  actions: {
    marginTop: theme.spacing.l,
    flexDirection: 'row',
    gap: theme.spacing.uacDimension12,
  },
  actionCell: {
    flex: 1,
  },
});
