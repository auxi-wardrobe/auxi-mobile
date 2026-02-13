import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Input } from '../../components/atoms/Input';
import { Button } from '../../components/atoms/Button';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../theme/theme';

export const LoginScreen = () => {
    const navigation = useNavigation<any>();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    const validate = () => {
        const newErrors: { email?: string; password?: string } = {};
        if (!email) newErrors.email = 'Email is required';
        if (!password) newErrors.password = 'Password is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            await login({ email, password });
            // Navigation is handled by AppNavigator listening to auth state
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Login Failed',
                text2: error.response?.data?.message || 'Something went wrong',
                position: 'bottom',
                visibilityTime: 4000,
            });
        } finally {
            setLoading(false);
        }
    };

    const navigateToRegister = () => {
        navigation.navigate('Register');
    };

    return (
        <AuthLayout
            title="Welcome Back"
            subtitle="Sign in to continue to your wardrobe"
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
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={(text) => {
                        setPassword(text);
                        if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    error={errors.password}
                    secureTextEntry
                    style={styles.inputContainer}
                />

                <TouchableOpacity style={styles.forgotPassword}>
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                <Button
                    title="Sign In"
                    onPress={handleLogin}
                    loading={loading}
                    style={styles.loginButton}
                    textStyle={styles.loginButtonText}
                />

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <TouchableOpacity onPress={navigateToRegister}>
                        <Text style={styles.linkText}>Sign Up</Text>
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
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: theme.spacing.xl,
    },
    forgotPasswordText: {
        color: theme.colors.primary,
        fontSize: theme.typography.sizes.caption,
        fontWeight: theme.typography.weights.medium as any,
    },
    loginButton: {
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
    loginButtonText: {
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
