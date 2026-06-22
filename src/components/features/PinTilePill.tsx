/**
 * `PinTilePill` — the on-tile pin affordance (AU-307 Figma redesign).
 *
 * Figma uses TWO different affordances for the two states (adjudicated
 * 2026-06-21, qa-ui `docs/qa-findings/260621-ui-pin-button-figma-adjudication.md`,
 * CEO-confirmed). One component, two distinct renders:
 *
 *   - idle (not pinned)  → faint, icon-only pin BADGE, top-RIGHT corner.
 *     Figma node 3399:18455 ("Default" variant): 34×34 square,
 *     border-radius/md (8), bg background/overlay/light/30
 *     (rgba(255,255,255,0.3)), 17×17 pin glyph, NO text label.
 *   - pinned             → WHITE "Tap to unpin" pill, on-tile near top.
 *     Figma node 3399:18412: white bg, ink text/icon, Inter body/xxs 10px,
 *     pin-slash glyph. Unchanged — this state matches Figma exactly.
 *
 * `testID` stays always-defined and flips its suffix per state so Maestro can
 * address the element either way (auxi/CLAUDE.md testID rule).
 * `accessibilityLabel` is the human-readable "Pin item" / "Unpin item" — a
 * different value from the testID, per the same rule.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import IconHomePin from '../../assets/images/icon_home_pin.svg';
import { theme } from '../../theme/theme';

// Pinned pill glyph (white pill); idle badge uses the larger Figma 17px glyph.
const PIN_GLYPH_SIZE = 14;
// Figma node 3399:18455 — idle badge icon "icons" is size-[17px].
const IDLE_GLYPH_SIZE = 17;

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

  // ── IDLE: faint icon-only badge, top-right (Figma 3399:18455) ────────────
  if (!isPinned) {
    return (
      <TouchableOpacity
        // testID is the idle (un-suffixed) form; flips to `-set` when pinned.
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={t('home.a11y_pin_item')}
        accessibilityState={{ selected: false }}
        activeOpacity={0.7}
        hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
        onPress={onPress}
        style={styles.idleBadge}
      >
        <IconHomePin
          width={IDLE_GLYPH_SIZE}
          height={IDLE_GLYPH_SIZE}
          color={theme.ds.color.ink}
        />
      </TouchableOpacity>
    );
  }

  // ── PINNED: white "Tap to unpin" pill (Figma 3399:18412) — unchanged ─────
  return (
    <TouchableOpacity
      testID={`${testID}-set`}
      accessibilityRole="button"
      accessibilityLabel={t('home.a11y_unpin_item')}
      accessibilityState={{ selected: true }}
      activeOpacity={0.85}
      hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
      onPress={onPress}
      style={[styles.pill, styles.pillPinned]}
    >
      <Text
        style={[styles.label, styles.labelPinned]}
        numberOfLines={1}
      >
        {t('pin.tooltip_unpin')}
      </Text>
      <IconHomePin
        width={PIN_GLYPH_SIZE}
        height={PIN_GLYPH_SIZE}
        color={theme.ds.color.ink}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Idle: faint translucent square, top-right. Figma node 3399:18455 —
  // size 34, border-radius/md (8), right 9 / top 8, bg overlay/light/30,
  // drop-shadow 4/4 blur 5.3 @ 5% (shadowColor via ds.color.shadow token).
  idleBadge: {
    position: 'absolute',
    top: theme.spacing.s, // 8
    right: 9, // Figma right-[9px]
    width: 34,
    height: 34,
    borderRadius: 16, // 8 — border-radius/md
    backgroundColor: 'rgba(255, 255, 255, 0.3)', // background/overlay/light/30
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.ds.color.shadow,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 5.3,
    elevation: 3,
  },
  // Pinned pill — on-tile top, horizontally centered (Figma 3399:18412).
  pill: {
    position: 'absolute',
    top: theme.spacing.s,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.m - 4, // 12 — Figma pill horizontal pad
    paddingVertical: 7,
    borderRadius: 16,
    // Soft floating shadow so the pill lifts off the garment.
    ...theme.ds.shadow.floatingButton,
  },
  pillPinned: {
    backgroundColor: theme.ds.color.white,
  },
  label: {
    ...theme.typography.aliases.interCaptionXxs,
  },
  labelPinned: {
    color: theme.ds.color.ink,
  },
});

export default PinTilePill;
