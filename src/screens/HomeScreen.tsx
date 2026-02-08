import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '../components/atoms/Button';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme/theme';

export const HomeScreen = () => {
    const { logout, user } = useAuth();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome back!</Text>
            <Text style={styles.email}>{user?.email}</Text>

            <View style={styles.content}>
                <Text style={styles.placeholder}>
                    Your wardrobe is waiting for you.
                </Text>
            </View>

            <Button
                title="Logout"
                onPress={logout}
                variant="outline"
                style={styles.button}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: theme.spacing.l,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    title: {
        fontSize: theme.typography.sizes.h1,
        fontWeight: theme.typography.weights.bold as any,
        color: theme.colors.text,
        marginBottom: theme.spacing.s,
    },
    email: {
        fontSize: theme.typography.sizes.body,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    placeholder: {
        fontSize: theme.typography.sizes.h3,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    button: {
        width: '100%',
    },
});
