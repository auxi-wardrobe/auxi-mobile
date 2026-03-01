import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
// import { theme } from '../../theme/theme';
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
    const { logout } = useAuth(); // Using logout here
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

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

    // if (!isOpen && slideAnim._value === -SIDEBAR_WIDTH) {
    //    // Optimization removed to fix TS error and complexity
    // }

    return (
        <View style={[styles.container, !isOpen && styles.pointerEventsNone]} pointerEvents={isOpen ? 'auto' : 'none'}>
            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
            </TouchableWithoutFeedback>

            {/* Sidebar Content */}
            <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
                {/* Get Dressed Button */}
                <View style={styles.topSection}>
                    <TouchableOpacity
                        style={styles.getDressedButton}
                        onPress={() => {
                            navigation.navigate('Home');
                            onClose();
                        }}
                    >
                        <Text style={styles.getDressedText}>Get dressed</Text>
                        <Icons.Water width={16} height={16} />
                    </TouchableOpacity>
                </View>

                {/* Menu Items */}
                <View style={styles.menuSection}>
                    <MenuItem
                        label="Wardrobe"
                        Icon={Icons.Wardrobe}
                        onPress={() => {
                            navigation.navigate('Wardrobe');
                            onClose();
                        }}
                    />
                    <MenuItem
                        label="My body"
                        Icon={Icons.User}
                        onPress={() => {
                            navigation.navigate('Body');
                            onClose();
                        }}
                    />
                    <MenuItem label="My favourite" Icon={Icons.Heart} />
                    <MenuItem
                        label="My account"
                        Icon={Icons.User}
                        onPress={() => {
                            navigation.navigate('Settings');
                            onClose();
                        }}
                    />
                    <MenuItem label="Archive" Icon={Icons.Trash} />
                    <MenuItem label="Log out" Icon={Icons.Logout} onPress={logout} />
                </View>
            </Animated.View>
        </View>
    );
};

const MenuItem = ({ label, Icon, onPress }: { label: string, Icon: React.FC<any>, onPress?: () => void }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
        <Icon width={24} height={24} />
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
    pointerEventsNone: {
        // No style needed, handled by pointerEvents prop, but simpler to use null
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: width,
        height: height,
        backgroundColor: '#000',
    },
    sidebar: {
        width: SIDEBAR_WIDTH,
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRightWidth: 1,
        borderRightColor: 'rgba(0, 0, 0, 0.1)',
        paddingVertical: 58, // Top padding from Figma
        // paddingHorizontal: 20
    },
    topSection: {
        paddingHorizontal: 20,
        marginBottom: 40, // Spacer
    },
    getDressedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#141718',
        borderRadius: 42,
        height: 48,
        paddingHorizontal: 24, // approx
    },
    getDressedText: {
        color: '#FFFFFF',
        fontFamily: 'Manrope-SemiBold',
        fontSize: 16,
        fontWeight: '600',
    },
    iconSmall: {
        width: 16,
        height: 16,
        resizeMode: 'contain',
    },
    menuSection: {
        marginTop: 'auto', // Push to bottom? Figma shows specific top 576. 
        // Actually Figma shows: Frame (320 height) at top 576. 
        // So it is at the bottom.
        position: 'absolute',
        bottom: 50, // Approx padding bottom
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        gap: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 8,
        borderRadius: 12,
        height: 48,
    },
    menuIcon: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
    },
    menuText: {
        fontSize: 16,
        fontFamily: 'Manrope-Medium',
        color: '#000000',
        fontWeight: '500',
    },
});
