/**
 * `PinTilePill` — the on-tile pin affordance (AU-307 Figma redesign).
 *
 * Replaces the old icon-only badge + 2px ring + off-tile band tooltip with the
 * single, high-contrast, labeled pill from Figma node 3399:18412
 * ("Tap to unpin" pill on the pinned tile). One affordance, two states:
 *
 *   - idle (not pinned)  → DARK pill, "Pin" + pin glyph. Dark surface keeps the
 *     entry point legible on light garments (white tee / grey shorts), which the
 *     designer flagged as near-invisible on the old translucent badge (M2).
 *   - pinned             → WHITE pill, "Tap to unpin" + pin glyph, exactly per
 *     Figma (white bg, ink text/icon).
 *
 * Top-center ON the tile (Figma places the pill at tile-top, horizontally
 * centered). `testID` stays always-defined and flips its suffix per state so
 * Maestro can address the element either way (auxi/CLAUDE.md testID rule).
 * `accessibilityLabel` is the human-readable "Pin item" / "Unpin item" — a
 * different value from the testID, per the same rule.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import IconHomePin from '../../assets/images/icon_home_pin.svg';
import { theme } from '../../theme/theme';

const PIN_GLYPH_SIZE = 14;

export interface PinTilePillProps {
  isPinned: boolean;
  onPress: () => void;
  /** Stable, state-independent testID prefix, e.g. `home-tile-pin-<key>-<i>`. */
  testID: string;
}

export const PinTilePill: React.FC<PinTilePillProps> = ({
  isPinned,
  onPress,
  testID,
}) => {
  const { t } = useTranslation();

  // Ink glyph on the white pinned pill; cream glyph on the dark idle pill so it
  // reads against the surface in both states.
  const glyphColor = isPinned
    ? theme.ds.color.ink
    : theme.colors.uacTextPrimaryBase;

  return (
    <TouchableOpacity
      // testID flips suffix (never undefined) so Maestro can find it in either
      // state; a11yLabel is the distinct human string.
      testID={isPinned ? `${testID}-set` : testID}
      accessibilityRole="button"
      accessibilityLabel={
        isPinned ? t('home.a11y_unpin_item') : t('home.a11y_pin_item')
      }
      accessibilityState={{ selected: isPinned }}
      activeOpacity={0.85}
      hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
      onPress={onPress}
      style={[styles.pill, isPinned ? styles.pillPinned : styles.pillIdle]}
    >
      <Text
        style={[styles.label, isPinned ? styles.labelPinned : styles.labelIdle]}
        numberOfLines={1}
      >
        {isPinned ? t('pin.tooltip_unpin') : t('pin.pin_cta')}
      </Text>
      <IconHomePin
        width={PIN_GLYPH_SIZE}
        height={PIN_GLYPH_SIZE}
        color={glyphColor}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    top: theme.spacing.s,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.m - 4, // 12 — Figma pill horizontal pad
    paddingVertical: 7,
    borderRadius: theme.ds.radius.full,
    // Soft floating shadow so the pill lifts off the garment in both states.
    ...theme.ds.shadow.floatingButton,
  },
  pillIdle: {
    backgroundColor: theme.ds.color.ink,
  },
  pillPinned: {
    backgroundColor: theme.ds.color.white,
  },
  label: {
    ...theme.typography.aliases.interCaptionXxs,
  },
  labelIdle: {
    color: theme.colors.uacTextPrimaryBase,
  },
  labelPinned: {
    color: theme.ds.color.ink,
  },
});

export default PinTilePill;
