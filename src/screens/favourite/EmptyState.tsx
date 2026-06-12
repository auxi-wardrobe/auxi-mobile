import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import IconHeartFilled from '../../assets/images/icon_home_heart_filled.svg';

// Favourite | empty state (Figma `3539:23335` dimmed canvas): a centred green
// heart glyph above the "Tap 'Wear this' button to add an outfit" caption.
// The grid/collage footer is rendered by the screen, not here.
export const FavouriteEmptyState: React.FC<{ testID?: string }> = ({
  testID,
}) => {
  const { t } = useTranslation();

  return (
    <View testID={testID} style={styles.container}>
      <IconHeartFilled
        width={28}
        height={28}
        color={theme.colors.success}
        accessibilityLabel={t('favourite.empty_a11y')}
      />
      <Text style={styles.caption}>{t('favourite.empty_body')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
    paddingHorizontal: theme.spacing.l,
  },
  caption: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
});
