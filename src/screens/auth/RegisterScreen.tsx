import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Input } from '../../components/atoms/Input';
import { Button } from '../../components/atoms/Button';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../theme/theme';

export const RegisterScreen = () => {
    const navigation = useNavigation<any>();
    const { register } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});

    const validate = () => {
        const newErrors: { email?: string; password?: string; confirmPassword?: string } = {};
        if (!email) newErrors.email = 'Email is required';
        if (!password) newErrors.password = 'Password is required';
        if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            await register({ email, password });
            // Navigation is handled by AppNavigator listening to auth state
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Registration Failed',
                text2: error.response?.data?.message || 'Something went wrong',
                position: 'bottom',
                visibilityTime: 4000,
            });
        } finally {
            setLoading(false);
        }
    };

    const navigateToLogin = () => {
        navigation.navigate('Login');
    };

    return (
        <AuthLayout
            title="Create Account"
            subtitle="Join us and start organizing your wardrobe"
        >
            <View style={styles.form}>
                <Input
                    label="Email"
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={(text) => {
                        setEmail(text);
                        if (errors.email) setErrors({ ...errors, email: undefined });
                    }}
                    error={errors.email}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.inputContainer}
                />

                <Input
                    label="Password"
                    placeholder="Create a password"
                    value={password}
                    onChangeText={(text) => {
                        setPassword(text);
                        if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    error={errors.password}
                    secureTextEntry
                    style={styles.inputContainer}
                />

                <Input
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={(text) => {
                        setConfirmPassword(text);
                        if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                    }}
                    error={errors.confirmPassword}
                    secureTextEntry
                    style={styles.inputContainer}
                />

                <Button
                    title="Sign Up"
                    onPress={handleRegister}
                    loading={loading}
                    style={styles.registerButton}
                    textStyle={styles.registerButtonText}
                />

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <TouchableOpacity onPress={navigateToLogin}>
                        <Text style={styles.linkText}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </AuthLayout>
    );
};

const styles = StyleSheet.create({
    form: {
        marginTop: theme.spacing.m,
    },
    inputContainer: {
        marginBottom: theme.spacing.m,
    },
    registerButton: {
        marginTop: theme.spacing.s,
        marginBottom: theme.spacing.l,
        borderRadius: theme.borderRadius.l,
        paddingVertical: 12,
        shadowColor: theme.colors.primary,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    registerButtonText: {
        fontSize: theme.typography.sizes.button,
        fontWeight: theme.typography.weights.bold as any,
        letterSpacing: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: theme.spacing.s,
    },
    footerText: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.sizes.body,
    },
    linkText: {
        color: theme.colors.primary,
        fontSize: theme.typography.sizes.body,
        fontWeight: theme.typography.weights.bold as any,
    },
});
