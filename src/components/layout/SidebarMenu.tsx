import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { track } from '../../services/analytics';
import { navigationRef } from '../../navigation/navigationRef';
import { AppStackParamList } from '../../types/navigation';
import { Icons } from '../../assets/icons';

// SidebarMenu — the dark menu CONTENT for the app-level push-drawer
// (RootDrawer). It is the revealed back layer (Z-Index tier `base`): the app
// content is pushed aside to expose it, so there is NO overlay / backdrop /
// slide animation here (that lived in the old per-screen Sidebar.tsx).
// Navigation goes through `navigationRef` because this renders OUTSIDE the
// NavigationContainer.
const SIDEBAR_WIDTH = 317;

// Internal-only gate: the in-app Design System reference page is shown in the
// sidebar ONLY for these accounts (CEO + designer). Compared case-insensitively
// against the logged-in user's email. Not a security boundary — the route is
// also reachable in __DEV__ via Settings → Version.
const DS_EMAILS = ['duc2820@gmail.com', 'vietdesign81@gmail.com'];

// Navigate via the shared ref + close the drawer. Guards on isReady so an early
// tap (before the container mounts) is a no-op rather than a crash.
const go = (name: keyof AppStackParamList, close: () => void) => {
  if (navigationRef.isReady()) {
    // `as never` sidesteps navigate's per-route params overload — these are all
    // no-param routes, navigated by name only.
    navigationRef.navigate(name as never);
  }
  close();
};

export const SidebarMenu: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { close } = useSidebar();

  // Email-gated internal entry to the Design System reference page.
  const showDesignSystem =
    !!user?.email && DS_EMAILS.includes(user.email.toLowerCase());

  // Track the focused route so the active row reads as selected. navigationRef
  // lives outside the container, so subscribe to its state events.
  const [routeName, setRouteName] = useState<string | undefined>(undefined);
  useEffect(() => {
    const sync = () => {
      if (navigationRef.isReady()) {
        setRouteName(navigationRef.getCurrentRoute()?.name);
      }
    };
    sync();
    const unsub = navigationRef.addListener('state', sync);
    return unsub;
  }, []);

  const isHomeActive = routeName === 'Home';

  return (
    <View style={[styles.menu, { paddingTop: insets.top + 16 }]}>
      {/* Top group — "See my outfits" → Home */}
      <View style={styles.topGroup}>
        <TouchableOpacity
          style={[styles.pill, !isHomeActive && styles.pillInactive]}
          testID={
            isHomeActive
              ? 'sidebar-pill-see-outfits-active'
              : 'sidebar-pill-see-outfits'
          }
          accessibilityLabel={t('sidebar.a11y_see_outfits')}
          onPress={() => go('Home', close)}
        >
          <Icons.Grid
            width={24}
            height={24}
            color={
              isHomeActive
                ? theme.colors.figmaTextDark
                : theme.colors.uacTextPrimaryBase
            }
          />
          <Text
            style={[styles.pillText, !isHomeActive && styles.pillTextInactive]}
          >
            {t('sidebar.see_outfits')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom group — anchored to the bottom via space-between */}
      <View style={[styles.bottomGroup, { paddingBottom: insets.bottom + 24 }]}>
        <MenuItem
          label={t('sidebar.wardrobe')}
          Icon={Icons.Wardrobe}
          testID="sidebar-menu-wardrobe"
          isActive={routeName === 'Wardrobe'}
          onPress={() => go('Wardrobe', close)}
        />
        <MenuItem
          label={t('sidebar.favourite')}
          Icon={Icons.Heart}
          testID="sidebar-menu-favourite"
          isActive={routeName === 'Favourite'}
          onPress={() => go('Favourite', close)}
        />
        <MenuItem
          label={t('sidebar.feedback')}
          Icon={Icons.Feedback}
          testID="sidebar-menu-feedback"
          isActive={routeName === 'Feedback'}
          onPress={() => {
            track('feedback_opened', { source: 'sidebar' });
            go('Feedback', close);
          }}
        />
        <MenuItem
          label={t('sidebar.setting')}
          Icon={Icons.Setting}
          testID="sidebar-menu-setting"
          isActive={routeName === 'Settings'}
          onPress={() => go('Settings', close)}
        />
        {/* "My account" row removed (App Store B3 / Guideline 2.1): no
            account screen exists, so the row only closed the drawer — a dead
            button. Account actions live under Settings (the row above). */}
        <MenuItem
          label={t('sidebar.outfit_canvas')}
          Icon={Icons.OutfitCanvas}
          testID="sidebar-menu-outfit-canvas"
          isActive={routeName === 'OutfitCanvas'}
          onPress={() => go('OutfitCanvas', close)}
        />
        {showDesignSystem && (
          <MenuItem
            label="Design System"
            Icon={Icons.Grid}
            testID="sidebar-menu-design-system"
            isActive={routeName === 'DesignSystem'}
            onPress={() => {
              track('design_system_opened', { source: 'sidebar' });
              go('DesignSystem', close);
            }}
          />
        )}
        <MenuItem
          label={t('sidebar.logout')}
          Icon={Icons.Logout}
          testID="sidebar-menu-logout"
          onPress={() => {
            close();
            logout();
          }}
        />
      </View>
    </View>
  );
};

const MenuItem = ({
  label,
  Icon,
  onPress,
  testID,
  isActive = false,
}: {
  label: string;
  Icon: React.FC<any>;
  onPress?: () => void;
  testID: string;
  isActive?: boolean;
}) => (
  <TouchableOpacity
    style={[styles.menuItem, isActive && styles.menuItemActive]}
    onPress={onPress}
    testID={isActive ? `${testID}-active` : testID}
    accessibilityLabel={label}
  >
    <Icon
      width={24}
      height={24}
      color={
        isActive ? theme.colors.figmaTextDark : theme.colors.uacTextPrimaryBase
      }
    />
    <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  menu: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: theme.colors.uacBackgroundBase,
    justifyContent: 'space-between',
  },
  topGroup: {
    paddingHorizontal: theme.spacing.uacButtonPaddingX,
    gap: theme.spacing.uacDimension4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.uacDimension12,
    gap: theme.spacing.uacDimension8,
    borderRadius: theme.borderRadius.figmaTile,
    backgroundColor: theme.colors.figmaBackground,
  },
  pillInactive: {
    backgroundColor: 'transparent',
  },
  pillText: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.figmaTextDark,
  },
  pillTextInactive: {
    color: theme.colors.uacTextPrimaryBase,
  },
  bottomGroup: {
    paddingHorizontal: theme.spacing.uacButtonPaddingX,
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.uacDimension4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.figmaDividerOnDark,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.uacDimension12,
    gap: theme.spacing.uacDimension8,
    borderRadius: theme.borderRadius.figmaTile,
    height: 48,
  },
  menuItemActive: {
    backgroundColor: theme.colors.white,
  },
  menuText: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextPrimaryBase,
  },
  menuTextActive: {
    color: theme.colors.figmaTextDark,
  },
});
