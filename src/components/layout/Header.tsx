import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme/theme';
import IconFeedback from '../../assets/images/feedback.svg';

interface HeaderProps {
    title?: string;
    showBack?: boolean;
    onBack?: () => void;
    onFeedback?: () => void;
    rightComponent?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
    title = 'Auxi',
    showBack = true,
    onBack,
    onFeedback,
    rightComponent
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.leftContainer}>
                {showBack && (
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        {/* 
                            Figma shows a rectangle background and a menu icon on top.
                            Simplified: Just the menu icon/back icon.
                            I'll use a placeholder view or icon for now if asset failed.
                            Actually, I'll allow passing custom icon or default to menu-like.
                         */}
                        <View style={styles.menuIconPlaceholder}>
                            <View style={styles.hamburgerLine} />
                            <View style={styles.hamburgerLine} />
                            <View style={styles.hamburgerLine} />
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.centerContainer}>
                <Text style={styles.title}>{title}</Text>
            </View>

            <View style={styles.rightContainer}>
                {rightComponent ? (
                    rightComponent
                ) : (
                    <TouchableOpacity onPress={onFeedback}>
                        <IconFeedback width={24} height={24} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 60, // approximate 47px content + padding
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 22,
        backgroundColor: theme.colors.figmaBackground, // Match screen bg
    },
    leftContainer: {
        width: 45,
        alignItems: 'flex-start',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
    },
    rightContainer: {
        width: 47,
        alignItems: 'flex-end',
    },
    title: {
        fontFamily: 'PlayfairDisplay-Medium',
        fontSize: 24,
        fontWeight: '500',
        color: theme.colors.figmaButton, // Dark color
    },
    backButton: {
        width: 45,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        // backgroundColor: '#E3E3EC', // Optional if rect 105 was bg
        // borderRadius: 8,
    },
    icon: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
    },
    menuIconPlaceholder: {
        width: 24,
        height: 18,
        justifyContent: 'space-between',
    },
    hamburgerLine: {
        width: '100%',
        height: 2,
        backgroundColor: theme.colors.figmaButton,
    }
});
