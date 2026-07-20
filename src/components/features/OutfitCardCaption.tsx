import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { Icons } from '../../assets/icons';
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
//
// When `scheduled` is set the card is one of the user's outfits planned for
// today (surfaced ahead of the AI suggestions). A 24×24 calendar glyph sits
// alongside the pill and the message reads as the scheduled note so the user
// knows this look came from their schedule, not the recommender.
//
// When `wornDaysAgo` is a number the recommender has re-surfaced a look the
// user already wore (see HomeScreen wear-history). A "Worn N days ago" note is
// prepended before the caption, divided by a pipe — "Worn 12 days ago | Calm
// and Clear" — so the user recognises the repeat at a glance. Suppressed for
// scheduled cards (their message is already the schedule note).

type Props = {
  caption?: string | null;
  scheduled?: boolean;
  /**
   * Whole days since the user last wore this outfit (0 = earlier today), or
   * null/undefined when it has never been worn. Drives the "Worn N days ago"
   * note.
   */
  wornDaysAgo?: number | null;
  testID?: string;
};

export const OutfitCardCaption: React.FC<Props> = ({
  caption,
  scheduled = false,
  wornDaysAgo,
  testID,
}) => {
  const { t } = useTranslation();
  const text = scheduled
    ? t('home.scheduled_outfit_caption')
    : caption?.trim() || t('outfitActions.default_caption');

  const wornLabel =
    !scheduled && typeof wornDaysAgo === 'number' && wornDaysAgo >= 0
      ? wornDaysAgo === 0
        ? t('home.worn_today')
        : t('home.worn_days_ago', { count: wornDaysAgo })
      : null;

  return (
    <View testID={testID} style={styles.row}>
      {scheduled ? (
        <Icons.Calendar
          width={24}
          height={24}
          color={theme.colors.uacTextBase}
          testID={testID ? `${testID}-scheduled-badge` : undefined}
          accessibilityLabel={t('home.a11y_scheduled_outfit')}
        />
      ) : null}
      {wornLabel ? (
        <>
          <Text
            testID={testID ? `${testID}-worn` : undefined}
            style={styles.wornText}
            numberOfLines={1}
          >
            {wornLabel}
          </Text>
          <Text style={styles.wornDivider}>|</Text>
        </>
      ) : null}
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
    ...theme.typography.aliases.interBody,
    color: theme.colors.uacTextBase,
  },
  // "Worn N days ago" note — sits to the left of the caption pill, kept on one
  // line so the pill (marquee) owns any horizontal overflow.
  wornText: {
    ...theme.typography.aliases.interBody,
    color: theme.colors.figmaTextSecondary,
    flexShrink: 0,
  },
  wornDivider: {
    ...theme.typography.aliases.interBody,
    color: theme.colors.figmaTextSecondary,
    flexShrink: 0,
  },
});
