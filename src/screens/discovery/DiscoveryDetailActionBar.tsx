import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../assets/icons';
import IconHeartFilled from '../../assets/images/icon_heart_filled.svg';
import { theme } from '../../theme/theme';
import type { DiscoveryFavouriteState } from './useDiscoveryFavourite';

type Props = {
  onRemix: () => void;
  onToggleFavourite: () => void;
  favouriteState: DiscoveryFavouriteState;
  onSeeOnMe: () => void;
  /** False when the outfit's item count is outside the try-on 1..4 cap. */
  canSeeOnMe: boolean;
};

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

/**
 * Sticky action bar for the Discovery outfit detail:
 *   [Remix ✂]      ♡      [See on me]
 * Remix drops the outfit's pieces onto the canvas, the heart saves the outfit
 * to Favourites, "See on me" runs the try-on flow.
 *
 * House sticky-footer treatment (header-footer-rules §3b): blur + white tint,
 * sticky z-tier, bottom safe-area. Raw TouchableOpacity (not MButton /
 * MIconButton) for the same reason as Home's `OutfitActionRow` and
 * `FavouriteActionBar`: these are borderless text/glyph actions, which the DS
 * buttons (fixed fill/outline + 20px icon) can't express.
 */
export const DiscoveryDetailActionBar: React.FC<Props> = ({
  onRemix,
  onToggleFavourite,
  favouriteState,
  onSeeOnMe,
  canSeeOnMe,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // Filled while saved, and optimistically while a save is in flight; hollow
  // while a remove is in flight so the tap reads as instant either way.
  const heartFilled = favouriteState === 'saved' || favouriteState === 'saving';
  const heartBusy = favouriteState === 'saving' || favouriteState === 'removing';

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + theme.spacing.s }]}>
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType="light"
        blurAmount={4}
        reducedTransparencyFallbackColor={theme.colors.figmaItemDetailHeaderBg}
        pointerEvents="none"
      />
      <View style={styles.tint} pointerEvents="none" />

      <View style={styles.row}>
        <TouchableOpacity
          testID="discovery-detail-remix"
          accessibilityRole="button"
          accessibilityLabel={t('discovery.a11y_remix')}
          activeOpacity={0.7}
          hitSlop={HIT_SLOP}
          style={[styles.slot, styles.slotStart]}
          onPress={onRemix}
        >
          <Text style={styles.label} numberOfLines={1}>
            {t('discovery.remix_cta')}
          </Text>
          <Icons.Remix width={20} height={20} color={theme.colors.uacTextBase} />
        </TouchableOpacity>

        <TouchableOpacity
          testID={
            heartFilled ? 'discovery-detail-favourite-saved' : 'discovery-detail-favourite'
          }
          accessibilityRole="button"
          accessibilityLabel={t(
            heartFilled ? 'discovery.a11y_remove_favourite' : 'discovery.a11y_save_favourite',
          )}
          accessibilityState={{ selected: heartFilled, busy: heartBusy }}
          activeOpacity={0.7}
          hitSlop={HIT_SLOP}
          style={styles.heart}
          onPress={onToggleFavourite}
          disabled={heartBusy}
        >
          {heartFilled ? (
            <IconHeartFilled width={32} height={32} color={theme.colors.uacTextBase} />
          ) : (
            <Icons.Heart width={24} height={24} color={theme.colors.uacTextBase} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          testID="discovery-detail-see-on-me-cta"
          accessibilityRole="button"
          accessibilityLabel={t('discovery.see_on_me_cta')}
          accessibilityState={{ disabled: !canSeeOnMe }}
          activeOpacity={0.7}
          hitSlop={HIT_SLOP}
          style={[styles.slot, styles.slotEnd]}
          onPress={onSeeOnMe}
          disabled={!canSeeOnMe}
        >
          <Text
            style={[styles.label, !canSeeOnMe && styles.labelDisabled]}
            numberOfLines={1}
          >
            {t('discovery.see_on_me_cta')}
          </Text>
        </TouchableOpacity>
      </View>

      {!canSeeOnMe ? (
        <Text style={styles.hint} testID="discovery-detail-see-on-me-unavailable">
          {t('discovery.see_on_me_unavailable')}
        </Text>
      ) : null}
    </View>
  );
};

/** Row height (48) + top padding — the screen pads its scroll content by this. */
export const DISCOVERY_ACTION_BAR_HEIGHT = 48 + theme.spacing.s;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: theme.zIndex.sticky,
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.s,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.figmaBlurTintWhite80,
  },
  // Three equal columns so the heart sits dead-centre no matter how long the
  // side labels translate (fr/vi run longer than en).
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  slot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    height: 48,
  },
  slotStart: {
    justifyContent: 'flex-start',
  },
  slotEnd: {
    justifyContent: 'flex-end',
  },
  heart: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...theme.typography.aliases.uacBodyMdMedium,
    color: theme.colors.uacTextBase,
    flexShrink: 1,
  },
  labelDisabled: {
    color: theme.colors.figmaTextSecondary,
  },
  hint: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
});
