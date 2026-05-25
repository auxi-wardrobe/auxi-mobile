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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
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
  const { logout } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
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
          accessibilityLabel="Close menu"
        />
      </TouchableWithoutFeedback>

      {/* Sidebar Content */}
      <Animated.View
        style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}
      >
        {/* Top group — "See my outfits" pill */}
        <View style={[styles.topGroup, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            style={styles.pill}
            testID="sidebar-pill-see-outfits"
            accessibilityLabel="See my outfits"
            onPress={() => {
              navigation.navigate('Home');
              onClose();
            }}
          >
            <Icons.Grid
              width={24}
              height={24}
              color={theme.colors.figmaTextDark}
            />
            <Text style={styles.pillText}>See my outfits</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom group — menu rows (anchored to bottom via space-between) */}
        <View style={styles.bottomGroup}>
          <MenuItem
            label="Wardrobe"
            Icon={Icons.Wardrobe}
            testID="sidebar-menu-wardrobe"
            onPress={() => {
              navigation.navigate('Wardrobe');
              onClose();
            }}
          />
          <MenuItem
            label="My Favourite"
            Icon={Icons.Heart}
            testID="sidebar-menu-favourite"
            // TODO(sidebar): no Favourite route yet
            onPress={() => {}}
          />
          <MenuItem
            label="Feedback"
            Icon={Icons.Feedback}
            testID="sidebar-menu-feedback"
            // TODO(sidebar): no Feedback route yet
            onPress={() => {}}
          />
          <MenuItem
            label="Setting"
            Icon={Icons.Setting}
            testID="sidebar-menu-setting"
            onPress={() => {
              navigation.navigate('Settings');
              onClose();
            }}
          />
          <MenuItem
            label="My account"
            Icon={Icons.User}
            testID="sidebar-menu-account"
            // TODO(sidebar): no My account route yet
            onPress={() => {}}
          />
          <MenuItem
            label="Log out"
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
}: {
  label: string;
  Icon: React.FC<any>;
  onPress?: () => void;
  testID?: string;
}) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
    testID={testID}
    accessibilityLabel={label}
  >
    <Icon width={24} height={24} color={theme.colors.uacTextPrimaryBase} />
    <Text style={styles.menuText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    backgroundColor: theme.colors.primary,
  },
  sidebar: {
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
  pillText: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.figmaTextDark,
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
  menuText: {
    ...theme.typography.aliases.poppinsBody,
    color: theme.colors.uacTextPrimaryBase,
  },
});
