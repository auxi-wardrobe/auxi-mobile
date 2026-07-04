import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MFloatingPill } from '../design-system/lib';
import { track } from '../../services/analytics';
import { theme } from '../../theme/theme';
import { AppStackParamList } from '../../types/navigation';
import { HOME_VIEW_TOGGLE_FOOTER_HEIGHT } from './HomeViewToggleFooter';
import IconGrid from '../../assets/images/icon_grid.svg';
import IconWardrobe from '../../assets/images/icon_wardrobe.svg';

// Home | Wardrobe bottom nav toggle, shared by the Home and Wardrobe screens so
// users can hop between them. The tab matching the current screen (`active`)
// reads as selected; tapping the other tab navigates to it. Built on the same
// springy DS pill (`MFloatingPill`, icon mode) as the Home header view toggle
// so the two controls read as one system.
//
// The Home↔Wardrobe transition is Facebook-tabs style: the Wardrobe route uses
// `animation: 'none'` (AppNavigator), and both hosts render this bar at the
// same bottom anchor (last in-flow child of an edges={['top']} SafeAreaView,
// fixed 84px height), so on navigation the footer appears to stay put while
// only the thumb switches and the page content swaps in place. Keep the
// placement identical on both screens or the illusion breaks.

export type HomeWardrobeNavTab = 'home' | 'wardrobe';

const TABS: HomeWardrobeNavTab[] = ['home', 'wardrobe'];

type Props = {
  /** Which screen this footer is mounted on — that tab renders as selected. */
  active: HomeWardrobeNavTab;
  testID?: string;
};

export const HomeWardrobeNavFooter: React.FC<Props> = ({ active, testID }) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  // Remount the pill each time the host screen regains focus so the springy
  // thumb always snaps back to the `active` tab after a round-trip (a tap
  // navigates away rather than latching a selection).
  const isFocused = useIsFocused();

  // Active icon = ink (#070707); inactive dims to the muted tan token, matching
  // the header view toggle's treatment.
  const renderIcon = (tab: string, on: boolean) => {
    const iconColor = on
      ? theme.colors.figmaTextDark
      : theme.ds.color.tanStroke;
    const Icon = tab === 'home' ? IconGrid : IconWardrobe;
    return <Icon width={24} height={24} color={iconColor} />;
  };

  // Keep testIDs always-defined and flip the suffix per CLAUDE.md so Maestro can
  // identify each tab in either state: home-footer-nav-home[-active] /
  // home-footer-nav-wardrobe[-active].
  const itemTestID = (tab: string, on: boolean) =>
    `home-footer-nav-${tab}${on ? '-active' : ''}`;

  const a11yLabel = (tab: string) =>
    tab === 'home' ? t('home.a11y_nav_home') : t('home.a11y_nav_wardrobe');

  const handleChange = (next: string) => {
    // The active tab is the current screen — tapping it is a no-op. The other
    // tab is a navigation shortcut, not a latched view state.
    if (next === active) {
      return;
    }
    track('home_footer_nav_tapped', { destination: next });
    navigation.navigate(next === 'home' ? 'Home' : 'Wardrobe');
  };

  return (
    <View testID={testID} style={styles.bar}>
      <MFloatingPill
        key={isFocused ? 'focused' : 'blurred'}
        tabs={TABS}
        value={active}
        onChange={handleChange}
        renderIcon={renderIcon}
        testID="home-footer-nav-pill"
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
