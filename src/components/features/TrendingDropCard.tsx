/**
 * TrendingDropCard — AU-438 inline, non-blocking promo card at the top of Home.
 *
 * On-system by construction (no Figma frame): mirrors WardrobeWelcomeDialog's
 * style language + the `MButton` DS primitive, reading canonical `theme.ds.*`
 * tokens (color / radius) with `theme.spacing.*` + `theme.typography.aliases.*`.
 * No raw hex, no font literals. Adaptive: compact on short viewports so it does
 * not starve the outfit deck. Shows the featured item image (fallback chain),
 * the admin-authored
 * title + description, and two actions:
 *   • "Add to my wardrobe" — primary CTA → clones the item (onAdd)
 *   • "Not interested"     — text button → dismiss (onDismiss)
 * Both buttons disable while a respond is in flight (`isResponding`) so the
 * backend's concurrent-double-tap edge is never hit.
 */
import React from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { MButton } from '../design-system/lib';
import type { TrendingDrop } from '../../services/trendingDropService';

// MAJOR-1 (designer 260729): the Home content branch is a fixed flex column —
// NOT a ScrollView (a ScrollView would fight OutfitSwipeDeck's swipe gestures)
// — so a tall card starves the primary outfit deck below it. Below this
// viewport height the card goes compact: catches ≤4.7"/5.5" iPhones
// (SE/8 = 667pt, 8 Plus = 736pt); 5.4"+ devices (≥812pt) render the full card.
const COMPACT_VIEWPORT_HEIGHT = 760;
const IMAGE_HEIGHT = 160;
const IMAGE_HEIGHT_COMPACT = 96;
const DESCRIPTION_LINES = 3;
const DESCRIPTION_LINES_COMPACT = 1;

interface TrendingDropCardProps {
  drop: TrendingDrop;
  onAdd: () => void;
  onDismiss: () => void;
  isResponding: boolean;
}

export const TrendingDropCard: React.FC<TrendingDropCardProps> = ({
  drop,
  onAdd,
  onDismiss,
  isResponding,
}) => {
  const { t } = useTranslation();
  // Shrink the banner + collapse the description on short viewports so the
  // outfit deck keeps a usable minimum height (MAJOR-1).
  const { height } = useWindowDimensions();
  const isCompact = height < COMPACT_VIEWPORT_HEIGHT;

  // Card image fallback: promo hero → item cutout → item raw image. The item
  // always carries `image_url`, so `imageUri` is never empty.
  const imageUri =
    drop.promo_image_url ?? drop.item.image_png ?? drop.item.image_url;

  const addLabel = t('trendingDrop.add_cta');
  const dismissLabel = t('trendingDrop.dismiss_cta');

  return (
    <View style={styles.card} testID="trending-drop-card">
      <Image
        source={{ uri: imageUri }}
        style={[
          styles.image,
          { height: isCompact ? IMAGE_HEIGHT_COMPACT : IMAGE_HEIGHT },
        ]}
        resizeMode="cover"
        testID="trending-drop-image"
      />
      <Text style={styles.title} numberOfLines={2}>
        {drop.title}
      </Text>
      <Text
        style={styles.description}
        numberOfLines={isCompact ? DESCRIPTION_LINES_COMPACT : DESCRIPTION_LINES}
      >
        {drop.description}
      </Text>
      <View style={styles.actions}>
        <MButton
          variant="primary"
          size="md"
          onPress={onAdd}
          disabled={isResponding}
          testID="trending-drop-add"
          accessibilityLabel={addLabel}
        >
          {addLabel}
        </MButton>
        <MButton
          variant="text"
          size="md"
          onPress={onDismiss}
          disabled={isResponding}
          testID="trending-drop-dismiss"
          accessibilityLabel={dismissLabel}
        >
          {dismissLabel}
        </MButton>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Inline promo panel: a warm subtle surface that reads as a distinct block
  // over the white Home surface, rounded to the DS panel radius. Canonical
  // `theme.ds.*` tokens (MINOR-1 token-tier fix) — warm100 replaces the cool
  // off-family figmaSurfaceSoft. Image height is applied per-render (compact).
  card: {
    backgroundColor: theme.ds.color.warm100,
    borderRadius: theme.ds.radius.md,
    marginHorizontal: theme.spacing.m,
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.s,
    padding: theme.spacing.m,
  },
  image: {
    width: '100%',
    borderRadius: theme.ds.radius.sm,
    backgroundColor: theme.ds.color.white,
  },
  title: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.ds.color.ink,
    marginTop: theme.spacing.m,
  },
  description: {
    ...theme.typography.aliases.interBodySm,
    color: theme.ds.color.onVariant,
    marginTop: theme.spacing.xs,
  },
  // Actions stacked full-width (column default stretch): primary CTA on top,
  // text dismiss below — same pattern as WardrobeWelcomeDialog.
  actions: {
    marginTop: theme.spacing.m,
    gap: theme.spacing.s,
  },
});
