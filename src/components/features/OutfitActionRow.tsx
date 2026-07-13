import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import IconRemix from '../../assets/images/icon_remix.svg';

// Home action row — [Remix]  ·  [Refine suggestions].
// "Refine suggestions" opens the context-refine bottom sheet — a deliberate
// tweak affordance. (The old "Show another" tap was dropped: a left-swipe
// already advances/explores, so the forward step needed no button.) All props
// optional so the loading-state caller (no handlers) renders a static
// [Remix] · disabled "Refine suggestions".
//
// The old set-position dots between the two actions were removed: users
// discover suggestions by swiping, so a position indicator added noise
// without helping navigation.
type Props = {
  onRemix?: () => void;
  onRefine?: () => void;
  testID?: string;
};

export const OutfitActionRow: React.FC<Props> = ({
  onRemix,
  onRefine,
  testID,
}) => {
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

      <TouchableOpacity
        testID="home-refine"
        accessibilityRole="button"
        accessibilityLabel={t('outfitActions.a11y_refine')}
        activeOpacity={0.82}
        onPress={onRefine}
        disabled={!onRefine}
        style={styles.sideSlot}
      >
        <Text
          style={[
            styles.showAnotherText,
            !onRefine && styles.showAnotherDisabled,
          ]}
          numberOfLines={1}
        >
          {t('outfitActions.refine')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 32,
    width: '100%',
  },
  // Remix (left) / Show another (right): content-sized, gap 8, px 12, pill radius.
  sideSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    paddingHorizontal: theme.spacing.uacDimension12,
    height: 32,
    borderRadius: 16,
  },
  remixText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
  },
  showAnotherText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
  },
  showAnotherDisabled: {
    color: theme.colors.figmaTextSecondary,
  },
});
