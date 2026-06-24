import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme/theme';
import { Icons } from '../../assets/icons';
import { TopIconButton } from '../primitives/FigmaPrimitives';

interface HeaderProps {
    title?: string;
    showBack?: boolean;
    leftIcon?: React.ReactNode;
    titleTextStyle?: TextStyle;
    leftIconStyle?: ViewStyle;
    onBack?: () => void;
    onFeedback?: () => void;
    rightComponent?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
    title = 'Auxi',
    showBack = true,
    leftIcon,
    titleTextStyle,
    leftIconStyle,
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
                        style={leftIconStyle}
                        icon={
                            leftIcon || <Icons.Menu width={24} height={24} />
                        }
                    />
                )}
            </View>

            <View style={styles.centerContainer}>
                <Text style={[styles.title, titleTextStyle]}>{title}</Text>
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
});
