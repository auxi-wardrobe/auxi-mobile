/**
 * TrendingDropCard — AU-438 inline, non-blocking promo card at the top of Home.
 *
 * On-system by construction (no Figma frame): mirrors WardrobeWelcomeDialog's
 * style language — `theme.*` tokens only (colors / spacing / typography /
 * borderRadius) + the `MButton` DS primitive. No raw hex, no font literals, no
 * `ds.*`. Shows the featured item image (fallback chain), the admin-authored
 * title + description, and two actions:
 *   • "Add to my wardrobe" — primary CTA → clones the item (onAdd)
 *   • "Not interested"     — text button → dismiss (onDismiss)
 * Both buttons disable while a respond is in flight (`isResponding`) so the
 * backend's concurrent-double-tap edge is never hit.
 */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { MButton } from '../design-system/lib';
import type { TrendingDrop } from '../../services/trendingDropService';

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
        style={styles.image}
        resizeMode="cover"
        testID="trending-drop-image"
      />
      <Text style={styles.title} numberOfLines={2}>
        {drop.title}
      </Text>
      <Text style={styles.description} numberOfLines={3}>
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
  // Inline promo panel: a soft surface that reads as a distinct block over the
  // white Home surface, rounded to the DS panel radius.
  card: {
    backgroundColor: theme.colors.figmaSurfaceSoft,
    borderRadius: theme.borderRadius.uacPanel,
    marginHorizontal: theme.spacing.m,
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.s,
    padding: theme.spacing.m,
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.white,
  },
  title: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
    marginTop: theme.spacing.m,
  },
  description: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.uacTextSubtle100,
    marginTop: theme.spacing.xs,
  },
  // Actions stacked full-width (column default stretch): primary CTA on top,
  // text dismiss below — same pattern as WardrobeWelcomeDialog.
  actions: {
    marginTop: theme.spacing.m,
    gap: theme.spacing.s,
  },
});
