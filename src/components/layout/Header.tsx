import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme/theme';
import { Icons } from '../../assets/icons';
import { TopIconButton } from '../primitives/FigmaPrimitives';

interface HeaderProps {
    title?: string;
    showBack?: boolean;
    leftIcon?: React.ReactNode;
    onBack?: () => void;
    onFeedback?: () => void;
    rightComponent?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
    title = 'Auxi',
    showBack = true,
    leftIcon,
    onBack,
    onFeedback,
    rightComponent
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.leftContainer}>
                {showBack && (
                    <TopIconButton
                        onPress={onBack}
                        icon={
                            leftIcon || (
                                <View style={styles.menuIconPlaceholder}>
                                    <View style={styles.hamburgerLine} />
                                    <View style={styles.hamburgerLine} />
                                    <View style={styles.hamburgerLine} />
                                </View>
                            )
                        }
                    />
                )}
            </View>

            <View style={styles.centerContainer}>
                <Text style={styles.title}>{title}</Text>
            </View>

            <View style={styles.rightContainer}>
                {rightComponent ? (
                    rightComponent
                ) : (
                    <TouchableOpacity onPress={onFeedback} style={styles.rightButton}>
                        <Icons.User width={24} height={24} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 76,
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
        width: 45,
        alignItems: 'flex-end',
    },
    title: {
        ...theme.typography.aliases.playfairDisplaySection,
        fontWeight: '500',
        color: theme.colors.figmaAction, // Dark color
    },
    rightButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
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
