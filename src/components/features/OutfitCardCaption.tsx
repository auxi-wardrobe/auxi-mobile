import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { MarqueeText } from '../atoms/MarqueeText';

// Home | Grid View — title row (Figma Frame 2104).
// Caption pill (color/primary/100 bg, HUG) holding the V05 `reasoning_human`
// text. The lightbulb/insight pill was removed — the outfit-temperature
// override is now reached through the header weather widget, not from here.
//
// `caption` is the V05 `reasoning_human` text, threaded from the /build and
// /try_another responses (HomeScreen buildViaV05 → normalizeOutfits). The
// t('outfitActions.default_caption') fallback below covers the rare case the
// field is absent (empty/fallback batch or a legacy cached payload).

type Props = {
  caption?: string | null;
  testID?: string;
};

export const OutfitCardCaption: React.FC<Props> = ({ caption, testID }) => {
  const { t } = useTranslation();
  const text = caption?.trim() || t('outfitActions.default_caption');

  return (
    <View testID={testID} style={styles.row}>
      <View style={styles.captionPill}>
        <MarqueeText text={text} style={styles.captionText} />
      </View>
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
    borderRadius: theme.borderRadius.m, // chat bubble — 8px (border-radius/md)
    backgroundColor: theme.colors.figmaCaptionPillBg,
    // `stretch` lets the marquee viewport fill the bubble width so it can clip
    // and scroll overflowing text; `center` would keep it at its intrinsic
    // (un-clipped) width. Vertical centering stays via justifyContent.
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  captionText: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextBase,
  },
});
