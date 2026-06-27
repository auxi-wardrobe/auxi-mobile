import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MFloatingPill } from '../design-system/lib';
import { track } from '../../services/analytics';
import { theme } from '../../theme/theme';
import IconGrid from '../../assets/images/icon_grid.svg';
import IconGridAlt from '../../assets/images/icon_grid_alt.svg';

// Home | Grid View — bottom view-toggle (Figma footer 2464:17348).
//
// Option B (CEO-approved 2026-06-25): the grid/collage ICONS now live inside
// the design-system springy floating pill (`MFloatingPill`, icon mode). The old
// translucent BlurView bar + static cream capsule + non-sliding white cell were
// DROPPED — the DS pill's overshoot-spring thumb is the single active affordance
// and slides between tabs (motion the hand-rolled bar never had).
//
// TODO(AU-253 / Q3): the second (collage) view's seed layout is parked, but the
// toggle itself is live in HomeScreen — tapping it swaps the sheet's middle
// region (see maestro/flows/home/collage-toggle.yaml). The tap is a real
// interaction (tracked below) even while the collage surface is minimal.

// Fixed bar height — kept at the original 84 so the HomeScreen snap-paging math
// (constants.ts `AVAILABLE_VIEWPORT`) and the AI-feedback FAB / pin-banner /
// mood-banner offsets in styles.ts continue to reserve the same vertical space.
// The DS pill is compact and centred inside this bar, so the reserved height is
// unchanged — no constants.ts / styles.ts edits needed.
export const HOME_VIEW_TOGGLE_FOOTER_HEIGHT = 84;

export type HomeView = 'grid' | 'collage';

type PillProps = {
  activeView?: HomeView;
  onSelectView?: (view: HomeView) => void;
  testID?: string;
  /**
   * Per-item testID stem (default `home-footer-tab`). The Favourite header
   * mounts a second instance, so it passes its own stem to avoid colliding
   * with the Home footer's maestro selectors.
   */
  itemTestIDStem?: string;
  /** Forwarded to MFloatingPill — `'sm'` for the compact header chip. */
  size?: 'md' | 'sm';
};

type Props = Omit<PillProps, 'itemTestIDStem'>;

const VIEWS: HomeView[] = ['grid', 'collage'];

// The bare springy grid/collage pill, decoupled from the footer bar so it can
// also be dropped into a header (Favourite screen, compact `size="sm"`). The
// footer wrapper below positions it; everything else (icons, tracking, a11y) is
// shared so both mounts stay in lock-step.
export const HomeViewTogglePill: React.FC<PillProps> = ({
  activeView = 'grid',
  onSelectView,
  testID,
  itemTestIDStem = 'home-footer-tab',
  size = 'md',
}) => {
  const { t } = useTranslation();

  // Per-item testIDs MUST match maestro/flows/home/collage-toggle.yaml exactly
  // for the default stem: home-footer-tab-grid / -grid-active / -collage /
  // -collage-active.
  const itemTestID = (tab: string, active: boolean) =>
    `${itemTestIDStem}-${tab}${active ? '-active' : ''}`;

  const a11yLabel = (tab: string) =>
    tab === 'grid'
      ? t('outfitActions.a11y_grid_view')
      : t('outfitActions.a11y_collage_view');

  // Active icon = ink (#070707); inactive dims to the muted tan token
  // (icon/primary/subtle_300, #c6bcb1) per Figma 3914:24540.
  const renderIcon = (tab: string, active: boolean) => {
    const iconColor = active
      ? theme.colors.figmaTextDark
      : theme.ds.color.tanStroke;
    const Icon = tab === 'grid' ? IconGrid : IconGridAlt;
    return <Icon width={24} height={24} color={iconColor} />;
  };

  const handleChange = (next: string) => {
    const view = next as HomeView;
    // Tap is a real interaction even before the collage seed layout ships
    // (AU-253) — the toggle swaps the sheet's middle region today.
    track('home_view_toggled', { view });
    onSelectView?.(view);
  };

  return (
    <MFloatingPill
      tabs={VIEWS}
      value={activeView}
      onChange={handleChange}
      renderIcon={renderIcon}
      testID={testID}
      itemTestID={itemTestID}
      itemAccessibilityLabel={a11yLabel}
      size={size}
    />
  );
};

export const HomeViewToggleFooter: React.FC<Props> = ({
  activeView = 'grid',
  onSelectView,
  testID,
  size,
}) => {
  return (
    <View testID={testID} style={styles.bar}>
      <HomeViewTogglePill
        activeView={activeView}
        onSelectView={onSelectView}
        size={size}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    height: HOME_VIEW_TOGGLE_FOOTER_HEIGHT,
    width: '100%',
    // Centre the compact pill horizontally; sit it toward the bottom of the
    // reserved bar (closer to the screen edge), matching the prior layout.
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: theme.spacing.l,
  },
});
