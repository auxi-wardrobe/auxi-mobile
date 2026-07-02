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

// Home | Wardrobe bottom nav toggle. Replaces the old grid/collage view-toggle
// footer (that control moved into the Home header — see HomeHeader). The
// grid/home icon marks the current screen; the wardrobe icon is a shortcut that
// navigates to the Wardrobe screen. Built on the same springy DS pill
// (`MFloatingPill`, icon mode) as the view toggle so the two controls read as
// one system.

type HomeNavTab = 'home' | 'wardrobe';

const TABS: HomeNavTab[] = ['home', 'wardrobe'];

type Props = {
  testID?: string;
};

export const HomeNavToggleFooter: React.FC<Props> = ({ testID }) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  // Remount the pill each time Home regains focus so the springy thumb always
  // snaps back to the "home" tab after a wardrobe round-trip (the wardrobe tap
  // navigates away rather than latching a selection).
  const isFocused = useIsFocused();

  // Active icon = ink (#070707); inactive dims to the muted tan token, matching
  // the header view toggle's treatment.
  const renderIcon = (tab: string, active: boolean) => {
    const iconColor = active
      ? theme.colors.figmaTextDark
      : theme.ds.color.tanStroke;
    const Icon = tab === 'home' ? IconGrid : IconWardrobe;
    return <Icon width={24} height={24} color={iconColor} />;
  };

  // Keep testIDs always-defined and flip the suffix per CLAUDE.md so Maestro can
  // identify each tab in either state: home-footer-nav-home[-active] /
  // home-footer-nav-wardrobe[-active].
  const itemTestID = (tab: string, active: boolean) =>
    `home-footer-nav-${tab}${active ? '-active' : ''}`;

  const a11yLabel = (tab: string) =>
    tab === 'home' ? t('home.a11y_nav_home') : t('home.a11y_nav_wardrobe');

  const handleChange = (next: string) => {
    // "home" is the current screen — tapping it is a no-op. "wardrobe" is a
    // navigation shortcut, not a latched view state.
    if (next === 'wardrobe') {
      track('home_footer_nav_tapped', { destination: 'wardrobe' });
      navigation.navigate('Wardrobe');
    }
  };

  return (
    <View testID={testID} style={styles.bar}>
      <MFloatingPill
        key={isFocused ? 'focused' : 'blurred'}
        tabs={TABS}
        value="home"
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
