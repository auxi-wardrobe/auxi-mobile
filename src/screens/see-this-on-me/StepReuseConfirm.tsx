/**
 * Reuse-confirm re-entry sheet (AU-354 pt.3 / UAC).
 *
 * WHY THIS EXISTS
 * ---------------
 * AU-346 persists the user's chosen body photo + shape as a reusable profile on
 * the server. Before this, re-entering the flow with a saved profile silently
 * auto-rendered the current outfit — the user never saw which photo was being
 * reused and had no chance to confirm or swap it. Viet's UAC: on return, SHOW
 * the previously selected photo with CONFIRM and RETAKE actions instead of
 * either redoing capture from scratch OR generating blindly.
 *
 * PRESENTATION
 * ------------
 * A bottom sheet (per design) rather than a full transcript step: the saved
 * body photo sits in a rounded 3:4 frame under a title + helper line, with the
 * two actions pinned below — "Retake" (drops the saved profile, restarts
 * capture from step 1) and "Use this photo" (renders the current outfit on the
 * saved body, moving to the generating step). Rides the shared
 * `ContextualBottomSheet` shell (full-width, scrim, reveal motion, safe-area)
 * and the `M*` button primitives so the look/motion match the app's other
 * contextual sheets.
 *
 * Behaviour (confirm → generate / retake → restart) + analytics stay owned by
 * SeeThisOnMeScreen; this file is pure presentation.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LoadableRemoteImage } from '../../components/features/LoadableRemoteImage';
import { ContextualBottomSheet } from '../../components/features/ContextualBottomSheet';
import { MButton } from '../../components/design-system/lib';
import { theme } from '../../theme/theme';

interface StepReuseConfirmProps {
  /** The persisted body photo to show (full-body preferred, else selfie). */
  photoUri: string;
  onConfirm: () => void;
  onRetake: () => void;
  /** Dismiss (backdrop / swipe-down) — leaves the See-this-on-me flow. */
  onDismiss: () => void;
}

export const StepReuseConfirm: React.FC<StepReuseConfirmProps> = ({
  photoUri,
  onConfirm,
  onRetake,
  onDismiss,
}) => {
  const { t } = useTranslation();

  return (
    <ContextualBottomSheet
      visible
      onDismiss={onDismiss}
      testID="stom-reuse-confirm"
    >
      <Text style={styles.title} testID="stom-reuse-confirm-title">
        {t('seeThisOnMe.reuseConfirm.title')}
      </Text>
      <Text style={styles.subtitle}>
        {t('seeThisOnMe.reuseConfirm.prompt')}
      </Text>

      <View style={styles.photoFrame}>
        <LoadableRemoteImage
          uri={photoUri}
          style={styles.photo}
          resizeMode="cover"
          imageTestID="stom-reuse-confirm-thumb"
          skeletonTestID="stom-reuse-confirm-thumb-skeleton"
        />
      </View>

      <View style={styles.actions}>
        <MButton
          variant="text"
          size="lg"
          onPress={onRetake}
          testID="stom-reuse-confirm-retake"
        >
          {t('seeThisOnMe.reuseConfirm.retake')}
        </MButton>
        <View style={styles.confirmSlot}>
          <MButton
            variant="primary"
            size="lg"
            onPress={onConfirm}
            testID="stom-reuse-confirm-use"
          >
            {t('seeThisOnMe.reuseConfirm.confirm')}
          </MButton>
        </View>
      </View>
    </ContextualBottomSheet>
  );
};

const styles = StyleSheet.create({
  title: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaTextPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  photoFrame: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: theme.borderRadius.uacPanel,
    overflow: 'hidden',
    backgroundColor: theme.colors.figmaCardSurface,
    marginTop: theme.spacing.l,
    marginBottom: theme.spacing.l,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
  },
  confirmSlot: {
    flex: 1,
  },
});
