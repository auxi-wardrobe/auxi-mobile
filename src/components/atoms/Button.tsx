import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
    TouchableOpacityProps,
} from 'react-native';
import { theme } from '../../theme/theme';

interface ButtonProps extends TouchableOpacityProps {
    title: string;
    variant?: 'primary' | 'secondary' | 'outline' | 'text';
    loading?: boolean;
    disabled?: boolean;
    textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    variant = 'primary',
    loading = false,
    disabled = false,
    style,
    textStyle,
    ...props
}) => {
    const getButtonStyle = (): ViewStyle => {
        switch (variant) {
            case 'secondary':
                return styles.secondaryButton;
            case 'outline':
                return styles.outlineButton;
            case 'text':
                return styles.textButton;
            default:
                return styles.primaryButton;
        }
    };

    const getTextStyle = (): TextStyle => {
        switch (variant) {
            case 'secondary':
                return styles.secondaryText;
            case 'outline':
                return styles.outlineText;
            case 'text':
                return styles.textButtonText;
            default:
                return styles.primaryText;
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                getButtonStyle(),
                disabled && styles.disabledButton,
                style,
            ]}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <ActivityIndicator
                    color={
                        variant === 'outline' || variant === 'text'
                            ? theme.colors.primary
                            : theme.colors.white
                    }
                />
            ) : (
                <Text
                    style={[
                        styles.text,
                        getTextStyle(),
                        disabled && styles.disabledText,
                        textStyle,
                    ]}
                >
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        height: 48,
        borderRadius: theme.borderRadius.round, // Pill shape
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.l,
        marginVertical: theme.spacing.xs,
    },
    primaryButton: {
        backgroundColor: theme.colors.primary,
    },
    secondaryButton: {
        backgroundColor: theme.colors.secondary,
    },
    outlineButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    textButton: {
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
        height: 'auto',
        marginVertical: theme.spacing.xs,
    },
    disabledButton: {
        opacity: 0.5,
    },
    text: {
        fontSize: theme.typography.sizes.button,
        fontWeight: theme.typography.weights.bold as any,
        letterSpacing: 0.5,
    },
    primaryText: {
        color: theme.colors.white,
    },
    secondaryText: {
        color: theme.colors.white,
    },
    outlineText: {
        color: theme.colors.primary,
    },
    textButtonText: {
        color: theme.colors.primary,
        fontSize: theme.typography.sizes.body,
        fontWeight: theme.typography.weights.medium as any,
    },
    disabledText: {
        color: theme.colors.textSecondary,
    },
});
