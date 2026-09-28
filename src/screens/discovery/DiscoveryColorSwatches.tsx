import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import type { DiscoveryColor } from '../../services/discoveryService';
import { SWATCH_ROW_HEIGHT } from './discovery-grid';

/** Dots shown before collapsing the rest into "+N" — fits a 2-column tile. */
export const MAX_VISIBLE_SWATCHES = 5;

interface DiscoveryColorSwatchesProps {
  colors: DiscoveryColor[];
  testID?: string;
}

/**
 * Localised name for a palette color: `discovery.colors.<CODE>` when the app
 * has it, else the English label the backend sent (a new palette code must
 * never render as a raw key).
 */
export const useColorLabel = () => {
  const { t } = useTranslation();
  return (color: Pick<DiscoveryColor, 'code' | 'label'>) =>
    t(`discovery.colors.${color.code}`, { defaultValue: color.label });
};

/**
 * The outfit's item colors as a row of dots, directly under the card title.
 *
 * Always renders at SWATCH_ROW_HEIGHT — even with no colors — because the
 * masonry packer budgets a fixed caption block per tile (CAPTION_BLOCK_HEIGHT)
 * before layout; a row that came and went would make that estimate wrong and
 * the columns would drift.
 *
 * `hex` is server data (a display color per palette code), not a styling
 * literal, so it is the one color here that does not come from the theme.
 * Every dot carries a hairline border so white / cream still read on the
 * white screen.
 */
export const DiscoveryColorSwatches: React.FC<DiscoveryColorSwatchesProps> = ({
  colors,
  testID,
}) => {
  const { t } = useTranslation();
  const colorLabel = useColorLabel();
  const visible = colors.slice(0, MAX_VISIBLE_SWATCHES);
  const overflow = colors.length - visible.length;

  return (
    <View
      style={styles.row}
      testID={testID}
      accessible={colors.length > 0}
      accessibilityLabel={
        colors.length > 0
          ? t('discovery.colors_a11y', {
              colors: colors.map(colorLabel).join(', '),
            })
          : undefined
      }
    >
      {visible.map(color => (
        <View
          key={color.code}
          testID={testID ? `${testID}-${color.code}` : undefined}
          style={[styles.dot, { backgroundColor: color.hex }]}
        />
      ))}
      {overflow > 0 ? <Text style={styles.more}>{`+${overflow}`}</Text> : null}
    </View>
  );
};

const DOT_SIZE = 12;

const styles = StyleSheet.create({
  row: {
    height: SWATCH_ROW_HEIGHT - theme.spacing.xs,
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: theme.borderRadius.round,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  more: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.figmaTextSecondary,
  },
});
