/**
 * Generating / error state for the try-on flow. The high-res render takes
 * ~10-20s; on failure this shows the error copy + a retry action.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { theme } from '../../theme/theme';

interface GeneratingViewProps {
  errored: boolean;
  onRetry: () => void;
}

export const GeneratingView: React.FC<GeneratingViewProps> = ({
  errored,
  onRetry,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.centerFill} testID="stom-generating">
      {errored ? (
        <>
          <Text style={styles.errorText}>{t('seeThisOnMe.error')}</Text>
          <PillButton
            testID="stom-retry"
            title={t('seeThisOnMe.retry')}
            variant="filled"
            onPress={onRetry}
            style={styles.retryButton}
          />
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={theme.colors.figmaAction} />
          <Text style={styles.loadingText}>{t('seeThisOnMe.generating')}</Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.l,
    gap: theme.spacing.m,
  },
  loadingText: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
  errorText: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaRed,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 160,
  },
});
