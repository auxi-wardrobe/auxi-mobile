import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import IconHeartFilled from '../../assets/images/icon_heart_filled.svg';

// Favourite | empty state (Figma `2852:22228` → content `2852:22230`): a
// centred neutral 24×24 filled-heart glyph above the "Tap 'Wear this' button
// to add an outfit" caption, gap-12. The glyph is `icon/primary/bold_700`
// (neutral, NOT the green save-heart) tinted to text/neutral/base. The
// grid/collage footer is rendered by the screen, not here.
export const FavouriteEmptyState: React.FC<{ testID?: string }> = ({
  testID,
}) => {
  const { t } = useTranslation();

  return (
    <View testID={testID} style={styles.container}>
      <IconHeartFilled
        width={24}
        height={24}
        color={theme.colors.uacTextBase}
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
    gap: theme.spacing.uacDimension12,
    paddingHorizontal: theme.spacing.m,
  },
  caption: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
});
