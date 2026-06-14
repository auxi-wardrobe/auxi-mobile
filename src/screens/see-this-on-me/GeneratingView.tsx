/**
 * Generating / error state for the try-on flow. The high-res render takes
 * ~10-20s; on failure this shows the error copy + a retry action.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PillButton } from '../../components/primitives/FigmaPrimitives';
import { theme } from '../../theme/theme';
import { MacgieLoader } from '../../components/macgie';

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
        <MacgieLoader label={t('seeThisOnMe.generating')} />
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
  errorText: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaRed,
    textAlign: 'center',
  },
  retryButton: {
    minWidth: 160,
  },
});
