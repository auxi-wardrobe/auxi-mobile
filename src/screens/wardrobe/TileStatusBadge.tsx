import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { TileStatus } from './wardrobe-grid';

type TileBadgeStatus = Exclude<TileStatus, null>;

interface TileStatusBadgeProps {
  status: TileBadgeStatus;
  itemId: string;
}

const styles = StyleSheet.create({
  tileBadgeWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    alignItems: 'center',
  },
  // Base status pill (bottom-centre). The "common" variant uses this as-is
  // (dark fill, white text); "new" / "less use" override only the colours.
  // F5: reuse the existing token instead of re-inlining the rgba duplicate
  // (figmaCardTag === rgba(18,18,18,0.75), theme.ts:23). DRY.
  tileBadge: {
    height: 24, // chip size SM
    paddingHorizontal: 12,
    borderRadius: 9999,
    backgroundColor: theme.colors.figmaCardTag,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileBadgeText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.white,
  },
  // "New" — mint fill (reuses the success/200 token) + dark text.
  tileNewBadge: {
    backgroundColor: theme.colors.figmaSnackbarSuccessBg,
  },
  tileNewBadgeText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.figmaTextPrimary,
  },
  // "Less use" — soft coral fill + danger-red text (matches the item-detail
  // "Less used" affordance colour).
  tileLessUsedBadge: {
    backgroundColor: theme.colors.figmaTileLessUsedBadgeBg,
  },
  tileLessUsedBadgeText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.figmaItemDetailDanger,
  },
});

// The three status pills are visually identical except fill/text colour, the
// testID prefix and the label key. Driving them from a single status→config
// map keeps the exact markup/styles while collapsing the near-duplicate blocks.
const BADGE_CONFIG: Record<
  TileBadgeStatus,
  {
    badgeStyle: StyleProp<ViewStyle>;
    textStyle: StyleProp<TextStyle>;
    testIdPrefix: string;
    labelKey: string;
  }
> = {
  new: {
    badgeStyle: [styles.tileBadge, styles.tileNewBadge],
    textStyle: styles.tileNewBadgeText,
    testIdPrefix: 'wardrobe-item-new',
    labelKey: 'wardrobe.new_badge',
  },
  less_use: {
    badgeStyle: [styles.tileBadge, styles.tileLessUsedBadge],
    textStyle: styles.tileLessUsedBadgeText,
    testIdPrefix: 'wardrobe-item-less-used',
    labelKey: 'wardrobe.less_used_badge',
  },
  common: {
    badgeStyle: styles.tileBadge,
    textStyle: styles.tileBadgeText,
    testIdPrefix: 'wardrobe-item-common',
    labelKey: 'common.badge_common',
  },
};

// A single status pill, bottom-centre (Figma): "less use" (demoted),
// "common" (catalog item) or "new" (fresh upload, not yet opened).
export const TileStatusBadge: React.FC<TileStatusBadgeProps> = ({
  status,
  itemId,
}) => {
  const { t } = useTranslation();
  const config = BADGE_CONFIG[status];
  const label = t(config.labelKey);

  return (
    <View style={styles.tileBadgeWrap}>
      <View
        style={config.badgeStyle}
        testID={`${config.testIdPrefix}-${itemId}`}
        accessibilityLabel={label}
      >
        <Text numberOfLines={1} style={config.textStyle}>
          {label}
        </Text>
      </View>
    </View>
  );
};
