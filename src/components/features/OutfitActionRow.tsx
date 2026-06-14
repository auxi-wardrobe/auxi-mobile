import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import IconRemix from '../../assets/images/icon_remix.svg';

// Home action row. With the move to the Tinder swipe deck, the pagination dots
// and the "Show another" button were removed — the swipe gesture now handles
// browse (skip) and the deck advances on its own. Only the "Remix" text-button
// remains; pressing it opens the Outfit Canvas (AU-285 Remix editor) via the
// `onRemix` callback threaded from HomeScreen.
type Props = {
  onRemix?: () => void;
  testID?: string;
};

export const OutfitActionRow: React.FC<Props> = ({ onRemix, testID }) => {
  const { t } = useTranslation();

  return (
    <View testID={testID} style={styles.row}>
      <TouchableOpacity
        testID="home-remix"
        accessibilityRole="button"
        accessibilityLabel={t('outfitActions.a11y_remix')}
        activeOpacity={0.82}
        onPress={onRemix}
        style={styles.sideSlot}
      >
        <Text style={styles.remixText} numberOfLines={1}>
          {t('outfitActions.remix')}
        </Text>
        <IconRemix width={16} height={16} color={theme.colors.uacTextBase} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    width: '100%',
  },
  // Remix button (Figma left Button, content-sized): flush-left, gap 8, px 12,
  // pill radius — same geometry as before, just without the dots / show-another.
  sideSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    paddingHorizontal: theme.spacing.uacDimension12,
    height: 32,
    borderRadius: theme.borderRadius.round,
  },
  remixText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
  },
});
