/**
 * See-on-me quit-during-generation confirmation — a full-width contextual
 * bottom sheet shown when the user taps back while an AI job (body shapes or
 * outfit render) is still generating.
 *
 * The generation runs OUTSIDE React in `tryOnGenerationStore`, so leaving the
 * loading screen doesn't have to cancel it. This sheet makes that choice
 * explicit: keep it running in the background (we notify on completion) or
 * discard it and stop now. Backdrop / swipe-down dismiss keeps the user on the
 * loading screen with the job untouched.
 *
 * Shell (full-width panel + reveal motion + scrim + reduce-motion + safe-area)
 * comes from ContextualBottomSheet — the same shell the reuse-confirm sheet in
 * this flow already uses; this file just supplies the content.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { MButton } from '../../components/design-system/lib';
import { ContextualBottomSheet } from '../../components/features/ContextualBottomSheet';

type Props = {
  visible: boolean;
  /** Backdrop / swipe-down / hardware-back dismiss — stay on the loading screen. */
  onCancel: () => void;
  /** Leave the loading screen but keep the job running + notify on completion. */
  onNotify: () => void;
  /** Cancel the in-flight job and leave. */
  onDiscard: () => void;
};

export const DiscardGenerationDialog: React.FC<Props> = ({
  visible,
  onCancel,
  onNotify,
  onDiscard,
}) => {
  const { t } = useTranslation();

  return (
    <ContextualBottomSheet
      visible={visible}
      onDismiss={onCancel}
      testID="stom-quit-dialog"
    >
      <Text style={styles.title}>{t('seeThisOnMe.quit.confirmTitle')}</Text>
      <Text style={styles.body}>{t('seeThisOnMe.quit.confirmBody')}</Text>

      <View style={styles.actions}>
        {/* Notify — secondary (outlined); keeps the job alive in the background. */}
        <View style={styles.actionCell}>
          <MButton
            variant="secondary"
            onPress={onNotify}
            testID="stom-quit-notify"
            accessibilityLabel={t('seeThisOnMe.quit.notify')}
          >
            {t('seeThisOnMe.quit.notify')}
          </MButton>
        </View>
        {/* Discard — danger (destructive); cancels the in-flight job. */}
        <View style={styles.actionCell}>
          <MButton
            variant="danger"
            onPress={onDiscard}
            testID="stom-quit-discard"
            accessibilityLabel={t('seeThisOnMe.quit.discard')}
          >
            {t('seeThisOnMe.quit.discard')}
          </MButton>
        </View>
      </View>
    </ContextualBottomSheet>
  );
};

const styles = StyleSheet.create({
  title: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.uacTextBase,
  },
  body: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.uacTextBase,
    marginTop: theme.spacing.s,
  },
  actions: {
    marginTop: theme.spacing.m,
    flexDirection: 'row',
    gap: theme.spacing.uacDimension12,
  },
  actionCell: {
    flex: 1,
  },
});
