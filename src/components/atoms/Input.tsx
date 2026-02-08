import React, { useState } from 'react';
import {
    TextInput,
    View,
    Text,
    StyleSheet,
    TextInputProps,
    TouchableOpacity,
} from 'react-native';
import { theme } from '../../theme/theme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    onRightIconPress?: () => void;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    leftIcon,
    rightIcon,
    onRightIconPress,
    style,
    onFocus,
    onBlur,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = (e: any) => {
        setIsFocused(true);
        onFocus?.(e);
    };

    const handleBlur = (e: any) => {
        setIsFocused(false);
        onBlur?.(e);
    };

    return (
        <View style={[styles.container, style]}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View
                style={[
                    styles.inputContainer,
                    isFocused && styles.focusedInput,
                    !!error && styles.errorInput,
                ]}
            >
                {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
                <TextInput
                    style={styles.input}
                    placeholderTextColor={theme.colors.textSecondary}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    {...props}
                />
                {rightIcon && (
                    <TouchableOpacity
                        onPress={onRightIconPress}
                        style={styles.rightIcon}
                        disabled={!onRightIconPress}
                    >
                        {rightIcon}
                    </TouchableOpacity>
                )}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.m,
    },
    label: {
        fontSize: theme.typography.sizes.caption,
        fontWeight: theme.typography.weights.medium as any,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.m,
        backgroundColor: theme.colors.surface,
        height: 48,
        paddingHorizontal: theme.spacing.m,
    },
    focusedInput: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.white,
    },
    errorInput: {
        borderColor: theme.colors.error,
    },
    input: {
        flex: 1,
        fontSize: theme.typography.sizes.body,
        color: theme.colors.text,
        height: '100%',
    },
    leftIcon: {
        marginRight: theme.spacing.s,
    },
    rightIcon: {
        marginLeft: theme.spacing.s,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: theme.typography.sizes.caption,
        marginTop: theme.spacing.xs,
    },
});
