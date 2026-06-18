import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import IconIdea from '../../assets/images/icon_idea.svg';

// Home | Grid View — title row (Figma Frame 2104, 382×40).
// Caption pill (color/primary/100 bg, HUG) + insight icon pill
// (color/primary/200 bg, 40×40) holding the carbon:idea lightbulb.
// Gap 4 between them, both radius border-radius/xs (4).
//
// `caption` is the V05 `reasoning_human` text, threaded from the /build and
// /try_another responses (HomeScreen buildViaV05 → normalizeOutfits). The
// t('outfitActions.default_caption') fallback below covers the rare case the
// field is absent (empty/fallback batch or a legacy cached payload).

type Props = {
  caption?: string | null;
  testID?: string;
  /**
   * AU-362: when provided, the idea/lightbulb pill becomes the temperature
   * override trigger (tap → open the "Outfit Temperature" sheet). When absent
   * (e.g. Favourites), the pill stays a non-interactive insight indicator.
   */
  onPressInsight?: () => void;
  /** AU-362: highlights the lightbulb pill while an override is active. */
  insightActive?: boolean;
};

export const OutfitCardCaption: React.FC<Props> = ({
  caption,
  testID,
  onPressInsight,
  insightActive,
}) => {
  const { t } = useTranslation();
  const text = caption?.trim() || t('outfitActions.default_caption');

  const glyph = (
    <IconIdea
      width={24}
      height={24}
      color={insightActive ? theme.colors.white : theme.colors.uacTextBase}
    />
  );

  return (
    <View testID={testID} style={styles.row}>
      <View style={styles.captionPill}>
        <Text style={styles.captionText} numberOfLines={1}>
          {text}
        </Text>
      </View>
      {onPressInsight ? (
        <TouchableOpacity
          testID={
            insightActive ? 'home-temp-trigger-active' : 'home-temp-trigger'
          }
          accessibilityRole="button"
          accessibilityLabel={t(
            insightActive ? 'home.a11y_temp_active' : 'home.a11y_temp_idle',
          )}
          accessibilityState={{ selected: !!insightActive }}
          activeOpacity={0.82}
          style={[styles.insightPill, insightActive && styles.insightPillActive]}
          onPress={onPressInsight}
        >
          {glyph}
        </TouchableOpacity>
      ) : (
        <View
          style={styles.insightPill}
          accessibilityRole="image"
          accessibilityLabel={t('outfitActions.a11y_why_outfit')}
        >
          {glyph}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    width: '100%',
  },
  captionPill: {
    flexShrink: 1,
    height: 40,
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingVertical: theme.spacing.s,
    borderRadius: theme.borderRadius.s,
    backgroundColor: theme.colors.figmaCaptionPillBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionText: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
  },
  insightPill: {
    width: 40,
    height: 40,
    // AU-253: padding dropped so the now-24×24 idea icon sits centred inside
    // the fixed 40×40 pill (8px margin all round). The old 12/8 padding left a
    // 16px-wide inner box that clipped a 24px glyph. Pill footprint unchanged.
    borderRadius: theme.borderRadius.s,
    backgroundColor: theme.colors.figmaInsightPillBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // AU-362: active/highlighted lightbulb pill when a temperature override is on
  // (Figma `degree selected` — darker fill, light glyph).
  insightPillActive: {
    backgroundColor: theme.colors.figmaChipBg,
  },
});
