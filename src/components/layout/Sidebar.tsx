import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { motion } from '../../theme/motion';
import { useAuth } from '../../context/AuthContext';
import { track } from '../../services/analytics';
import { Icons } from '../../assets/icons';
import { AppStackParamList } from '../../types/navigation';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = 317;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { logout } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  // Read the focused route from navigation state so the active highlight
  // always matches the actually-focused screen, regardless of where the
  // Sidebar overlay is mounted (it lives inside several screens). Avoids
  // local useState that could desync from real navigation.
  const currentRouteName = useNavigationState(
    state => state.routes[state.index]?.name,
  );
  // The top "See my outfits" pill navigates to Home, so it should only read as
  // the active page when Home is actually focused (AU-304 follow-up).
  const isHomeActive = currentRouteName === 'Home';

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: motion.duration.medium,
          easing: motion.easing.enter,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: motion.duration.medium,
          easing: motion.easing.enter,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: motion.duration.normal,
          easing: motion.easing.exit,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: motion.duration.normal,
          easing: motion.easing.exit,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen, slideAnim, fadeAnim]);

  return (
    <View style={styles.container} pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[styles.backdrop, { opacity: fadeAnim }]}
          testID="sidebar-backdrop"
          accessibilityLabel={t('sidebar.a11y_close_menu')}
        />
      </TouchableWithoutFeedback>

      {/* Sidebar Content */}
      <Animated.View
        style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}
      >
        {/* Top group — "See my outfits" pill */}
        <View style={[styles.topGroup, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            style={[styles.pill, !isHomeActive && styles.pillInactive]}
            // Flip the testID suffix when active so Maestro can assert the
            // selected-page state; testID stays defined in both states.
            testID={
              isHomeActive
                ? 'sidebar-pill-see-outfits-active'
                : 'sidebar-pill-see-outfits'
            }
            accessibilityLabel={t('sidebar.a11y_see_outfits')}
            onPress={() => {
              // popTo (not navigate): reuse the existing Home instance so the
              // current outfit suggestions + swipe position survive the
              // round-trip. navigate() can push a duplicate Home under RN7 (see
              // HomeWardrobeNavFooter), remounting it and resetting the deck.
              // popTo falls back to pushing a fresh Home if none is in the stack.
              navigation.popTo('Home');
              onClose();
            }}
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
              style={[
                styles.pillText,
                !isHomeActive && styles.pillTextInactive,
              ]}
            >
              {t('sidebar.see_outfits')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom group — menu rows (anchored to bottom via space-between) */}
        <View style={styles.bottomGroup}>
          <MenuItem
            label={t('sidebar.wardrobe')}
            Icon={Icons.Wardrobe}
            testID="sidebar-menu-wardrobe"
            isActive={currentRouteName === 'Wardrobe'}
            onPress={() => {
              navigation.navigate('Wardrobe');
              onClose();
            }}
          />
          <MenuItem
            label={t('sidebar.favourite')}
            Icon={Icons.Heart}
            testID="sidebar-menu-favourite"
            isActive={currentRouteName === 'Favourite'}
            onPress={() => {
              navigation.navigate('Favourite');
              onClose();
            }}
          />
          <MenuItem
            label={t('sidebar.feedback')}
            Icon={Icons.Feedback}
            testID="sidebar-menu-feedback"
            isActive={currentRouteName === 'Feedback'}
            onPress={() => {
              track('feedback_opened', { source: 'sidebar' });
              navigation.navigate('Feedback');
              onClose();
            }}
          />
          <MenuItem
            label={t('sidebar.setting')}
            Icon={Icons.Setting}
            testID="sidebar-menu-setting"
            isActive={currentRouteName === 'Settings'}
            onPress={() => {
              navigation.navigate('Settings');
              onClose();
            }}
          />
          {/* "My account" row removed (App Store B3 / Guideline 2.1): no
              account screen exists, so the row was a dead button. Account
              actions live under Settings (the row above). */}
          <MenuItem
            label={t('sidebar.outfit_canvas')}
            Icon={Icons.OutfitCanvas}
            testID="sidebar-menu-outfit-canvas"
            onPress={() => {
              navigation.navigate('OutfitCanvas');
              onClose();
            }}
          />
          <MenuItem
            label={t('sidebar.logout')}
            Icon={Icons.Logout}
            testID="sidebar-menu-logout"
            onPress={() => {
              logout();
              onClose();
            }}
          />
        </View>
      </Animated.View>
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
    // Flip the testID suffix when active so Maestro can assert the
    // selected-page state; testID stays defined in both states.
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
  // In-tree drawer overlay host (not an RN <Modal>). Modal tier lifts the whole
  // drawer above screen content + sticky UI (see docs/Z_INDEX_LAYERING.md §1, §4).
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    zIndex: theme.zIndex.modal,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    zIndex: theme.zIndex.dim, // Dim tier — scrim behind the drawer panel
    backgroundColor: theme.colors.primary,
  },
  sidebar: {
    zIndex: theme.zIndex.modal, // Modal tier — drawer panel above the dim scrim
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
    borderRadius: 16,
    backgroundColor: theme.colors.figmaBackground,
  },
  pillText: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.figmaTextDark,
  },
  // Inactive (not on Home): drop the light pill + use the cream-on-dark
  // text/icon so it matches the other unselected menu rows.
  pillInactive: {
    backgroundColor: 'transparent',
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
    borderRadius: 16,
    height: 48,
  },
  // Active page: white pill on the dark sidebar (Figma active state).
  menuItemActive: {
    backgroundColor: theme.colors.white,
  },
  menuText: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextPrimaryBase,
  },
  // Dark text on the white active pill for contrast (light cream base
  // would be invisible on white).
  menuTextActive: {
    color: theme.colors.figmaTextDark,
  },
});
