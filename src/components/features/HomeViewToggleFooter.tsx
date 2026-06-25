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

type Props = {
  activeView?: HomeView;
  onSelectView?: (view: HomeView) => void;
  testID?: string;
};

const VIEWS: HomeView[] = ['grid', 'collage'];

export const HomeViewToggleFooter: React.FC<Props> = ({
  activeView = 'grid',
  onSelectView,
  testID,
}) => {
  const { t } = useTranslation();

  // Per-item testIDs MUST match maestro/flows/home/collage-toggle.yaml exactly:
  //   home-footer-tab-grid / -grid-active / -collage / -collage-active.
  const itemTestID = (tab: string, active: boolean) =>
    `home-footer-tab-${tab}${active ? '-active' : ''}`;

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
    <View testID={testID} style={styles.bar}>
      <MFloatingPill
        tabs={VIEWS}
        value={activeView}
        onChange={handleChange}
        renderIcon={renderIcon}
        itemTestID={itemTestID}
        itemAccessibilityLabel={a11yLabel}
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
