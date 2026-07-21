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
// user already wore (see HomeScreen wear-history). A "Worn N days ago" note
// sits before the caption as its OWN pill — same rounded, light-brown chip as
// the caption bubble — so the repeat reads as a peer system message ("Worn 12
// days ago" · "Calm and Clear"). Only shown once the look is genuinely stale
// (> WORN_BADGE_MIN_DAYS): a fresh or just-worn outfit needs no reminder.
// Suppressed for scheduled cards (their message is already the schedule note).

// Only badge a repeat once it's been more than this many days — recently worn
// (and brand-new) looks stay unbadged.
const WORN_BADGE_MIN_DAYS = 3;

type Props = {
  caption?: string | null;
  scheduled?: boolean;
  /**
   * Whole days since the user last wore this outfit, or null/undefined when it
   * has never been worn. The "Worn N days ago" badge shows only when this
   * exceeds {@link WORN_BADGE_MIN_DAYS}.
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
    !scheduled &&
    typeof wornDaysAgo === 'number' &&
    wornDaysAgo > WORN_BADGE_MIN_DAYS
      ? t('home.worn_days_ago', { count: wornDaysAgo })
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
        <View
          testID={testID ? `${testID}-worn` : undefined}
          style={styles.wornPill}
        >
          <Text style={styles.wornText} numberOfLines={1}>
            {wornLabel}
          </Text>
        </View>
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
  // "Worn N days ago" chip — same rounded, light-brown bubble as the caption
  // pill so the two read as peer system messages. Hugs its (short) text and
  // never shrinks, leaving the caption pill to own any horizontal overflow.
  wornPill: {
    flexShrink: 0,
    height: 40,
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingVertical: theme.spacing.s,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.figmaCaptionPillBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wornText: {
    ...theme.typography.aliases.interBody,
    color: theme.colors.uacTextBase,
  },
});
