import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MFloatingPill } from '../design-system/lib';
import { track } from '../../services/analytics';
import { theme } from '../../theme/theme';
import { AppStackParamList } from '../../types/navigation';
import { popToOrNavigate } from '../../navigation/popToOrNavigate';
import { HOME_VIEW_TOGGLE_FOOTER_HEIGHT } from './HomeViewToggleFooter';
import { Icons } from '../../assets/icons';

// Four-destination bottom nav, shared by the app's top-level pages:
//
//   home      → HomeLanding   (the daily landing page — app default)
//   outfit    → Home          (the AI outfit recommender, "See my outfits")
//   discovery → Discovery     (curated outfit feed)
//   wardrobe  → Wardrobe      (the user's items)
//
// This replaces the 2-tab HomeWardrobeNavFooter. Same DS pill (`MFloatingPill`,
// icon mode) so it reads as one system with the Home header view toggle, and
// the same "one persistent bar" illusion: every host renders this at the same
// bottom anchor and all four routes carry `animation: 'none'` (AppNavigator),
// so switching tabs swaps the page content in place without a slide.
//
// Icon choices follow the sidebar so the same destination reads the same in
// both navigations: Grid = "See my outfits", Globe = Discovery, Wardrobe =
// Wardrobe. The house glyph is the landing page's own.

export type AppNavTab = 'home' | 'outfit' | 'discovery' | 'wardrobe';

const TABS: AppNavTab[] = ['home', 'outfit', 'discovery', 'wardrobe'];

const ROUTE_BY_TAB: Record<AppNavTab, keyof AppStackParamList> = {
  home: 'HomeLanding',
  outfit: 'Home',
  discovery: 'Discovery',
  wardrobe: 'Wardrobe',
};

const ICON_BY_TAB: Record<AppNavTab, React.FC<{ width?: number; height?: number; color?: string }>> = {
  home: Icons.Home,
  outfit: Icons.Grid,
  discovery: Icons.Globe,
  wardrobe: Icons.Wardrobe,
};

const A11Y_KEY_BY_TAB: Record<AppNavTab, string> = {
  home: 'home.a11y_nav_home_landing',
  outfit: 'home.a11y_nav_outfit',
  discovery: 'home.a11y_nav_discovery',
  wardrobe: 'home.a11y_nav_wardrobe',
};

type Props = {
  /** Which screen this footer is mounted on — that tab renders as selected. */
  active: AppNavTab;
  testID?: string;
};

export const AppNavFooter: React.FC<Props> = ({ active, testID }) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  // Remount the pill each time the host screen regains focus so the springy
  // thumb snaps back to `active` after a round-trip (a tap navigates away
  // rather than latching a selection).
  const isFocused = useIsFocused();

  const renderIcon = (tab: string, on: boolean) => {
    const iconColor = on
      ? theme.colors.figmaTextDark
      : theme.ds.color.tanStroke;
    const Icon = ICON_BY_TAB[tab as AppNavTab];
    return <Icon width={24} height={24} color={iconColor} />;
  };

  // testIDs stay always-defined and flip the suffix per CLAUDE.md so Maestro
  // can select each tab in either state: app-nav-<tab>[-active].
  const itemTestID = (tab: string, on: boolean) =>
    `app-nav-${tab}${on ? '-active' : ''}`;

  const a11yLabel = (tab: string) => t(A11Y_KEY_BY_TAB[tab as AppNavTab]);

  const handleChange = (next: string) => {
    // The active tab is the current screen — tapping it is a no-op.
    if (next === active) {
      return;
    }
    const target = ROUTE_BY_TAB[next as AppNavTab];
    track('app_nav_tapped', { destination: target, from: ROUTE_BY_TAB[active] });

    // Pops back to the tab when it is already in the stack, pushes it when it
    // isn't — see `popToOrNavigate` for why navigate() alone is not enough.
    popToOrNavigate(navigation, target);
  };

  return (
    <View testID={testID} style={styles.bar}>
      <MFloatingPill
        key={isFocused ? 'focused' : 'blurred'}
        tabs={TABS}
        value={active}
        onChange={handleChange}
        renderIcon={renderIcon}
        testID="app-nav-pill"
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
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: theme.spacing.l,
  },
});
