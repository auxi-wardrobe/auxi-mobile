import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MButton } from '../../components/design-system/lib';
import { PressableScale } from '../../components/primitives/PressableScale';
import { Icons } from '../../assets/icons';
import { theme } from '../../theme/theme';
import {
  SKIN_TONE_BY_ID,
  SkinToneGender,
  SkinToneId,
  skinTonePortrait,
} from '../../content/skin-tones';

// "Best colors" grid: four tiles per row (Figma "Analysis" skin-tone card).
const BEST_COLOR_COUNT = 8;
const TIP_KEYS = ['1', '2', '3', '4', '5'] as const;

interface SkinToneCardProps {
  skinTone: SkinToneId | null;
  gender: SkinToneGender;
  /**
   * Items in a colour ≥70% alike to one of the tone's best colours, out of
   * all items. Null until the wardrobe has loaded (the banner is hidden).
   */
  paletteMatch?: { count: number; total: number } | null;
  onChange: () => void;
}

/**
 * Skin-tone card on Wardrobe Analysis (between the colour distribution and
 * Item Types). With a tone saved it shows how many items already sit in the
 * tone's best colours, the portrait + undertone, the colours that flatter it
 * and general tips; without one it invites the user to pick (opens the same
 * sheet).
 */
export const SkinToneCard = ({
  skinTone,
  gender,
  paletteMatch = null,
  onChange,
}: SkinToneCardProps) => {
  const { t } = useTranslation();

  if (!skinTone) {
    return (
      <View style={styles.card} testID="analysis-skin-tone-card-empty">
        <Text style={styles.emptyTitle}>
          {t('wardrobe.analysis.skin_tone.empty_title')}
        </Text>
        <Text style={styles.bodyText}>
          {t('wardrobe.analysis.skin_tone.empty_body')}
        </Text>
        <MButton
          variant="primary"
          onPress={onChange}
          testID="analysis-skin-tone-choose"
          accessibilityLabel={t('wardrobe.analysis.skin_tone.empty_cta')}
        >
          {t('wardrobe.analysis.skin_tone.empty_cta')}
        </MButton>
      </View>
    );
  }

  const tone = SKIN_TONE_BY_ID[skinTone];
  const toneLabel = t(`wardrobe.analysis.tones.${tone.labelKey}.label`);

  return (
    <View style={styles.card} testID={`analysis-skin-tone-card-${skinTone}`}>
      {paletteMatch ? (
        <View
          style={styles.matchBanner}
          testID="analysis-skin-tone-match"
          accessible
          accessibilityLabel={t('wardrobe.analysis.skin_tone.match_a11y', {
            count: paletteMatch.count,
            total: paletteMatch.total,
          })}
        >
          <Text style={[styles.matchLabel, styles.matchLabelText]}>
            {t('wardrobe.analysis.skin_tone.match_title')}
          </Text>
          <Text style={styles.matchCount}>
            {paletteMatch.count}
            <Text style={styles.matchTotal}>
              {t('wardrobe.analysis.skin_tone.match_total', {
                total: paletteMatch.total,
              })}
            </Text>
          </Text>
        </View>
      ) : null}
      <View style={styles.summaryRow}>
        <Image
          source={skinTonePortrait(gender, skinTone)}
          style={styles.portrait}
          accessibilityIgnoresInvertColors
        />
        <View style={styles.summaryText}>
          <Text style={styles.toneTitle}>
            {t('wardrobe.analysis.skin_tone.title', { tone: toneLabel })}
          </Text>
          <Text style={styles.bodyText}>
            {t(`wardrobe.analysis.tones.${tone.labelKey}.undertone`)}
          </Text>
        </View>
        <PressableScale
          onPress={onChange}
          style={styles.changeButton}
          activeOpacity={0.85}
          testID="analysis-skin-tone-change"
          accessibilityLabel={t('wardrobe.analysis.skin_tone.a11y_change')}
        >
          <Text style={styles.bodyText}>
            {t('wardrobe.analysis.skin_tone.change')}
          </Text>
          <Icons.ChevronRight
            width={16}
            height={16}
            color={theme.colors.figmaTextPrimary}
          />
        </PressableScale>
      </View>

      <Text style={styles.bodyText}>
        {t('wardrobe.analysis.skin_tone.best_colors_title')}
      </Text>
      <View style={styles.colorGrid}>
        {tone.palette.slice(0, BEST_COLOR_COUNT).map(swatch => (
          <View key={swatch.nameKey} style={styles.colorCell}>
            <View style={[styles.colorTile, { backgroundColor: swatch.hex }]} />
            <Text style={styles.colorName} numberOfLines={1}>
              {t(`wardrobe.analysis.colors.${swatch.nameKey}`)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.tipsTitle}>
        {t('wardrobe.analysis.skin_tone.tips_title')}
      </Text>
      <View style={styles.tips}>
        {TIP_KEYS.map(key => (
          <View key={key} style={styles.tipRow}>
            <Text style={styles.bodyText}>{'•'}</Text>
            <Text style={[styles.bodyText, styles.tipText]}>
              {t(`wardrobe.analysis.skin_tone.tip_${key}`)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const PORTRAIT_SIZE = 44;
const GRID_COLUMNS = 4;
const COLOR_CELL_PERCENT = 90 / GRID_COLUMNS;

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.ds.color.surface,
    borderRadius: theme.ds.radius.sm,
    padding: theme.spacing.uacDimension12,
    gap: theme.spacing.uacDimension12,
  },
  // Figma: warm band at the top of the card, label left, "15 /45" right.
  matchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    backgroundColor: theme.ds.color.warm100,
    borderRadius: theme.ds.radius.sm, // 12, like the other cards
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.m,
  },
  matchLabel: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextPrimary,
  },
  matchLabelText: {
    flex: 1,
  },
  matchCount: {
    ...theme.typography.aliases.interDisplayRegular,
    color: theme.colors.figmaTextPrimary,
  },
  matchTotal: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextPrimary,
  },
  emptyTitle: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.figmaTextPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.uacDimension12,
  },
  portrait: {
    width: PORTRAIT_SIZE,
    height: PORTRAIT_SIZE,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.ds.color.cream,
  },
  summaryText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  toneTitle: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.figmaTextPrimary,
    textTransform: 'uppercase',
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    minHeight: 24,
  },
  bodyText: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextPrimary,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: theme.spacing.uacDimension12,
  },
  // Four equal columns; the leftover width becomes the three column gaps
  // (percent-based so the grid never wraps to three on a narrow phone).
  colorCell: {
    width: `${COLOR_CELL_PERCENT}%`,
    gap: theme.spacing.xs,
  },
  colorTile: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.borderRadius.m, // 8
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.ds.line,
  },
  colorName: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextPrimary,
  },
  tipsTitle: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.figmaTextPrimary,
  },
  tips: {
    gap: 2,
  },
  tipRow: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    paddingLeft: theme.spacing.s,
  },
  tipText: {
    flex: 1,
  },
});
