import React, { useEffect, useRef } from 'react';
import {
    NavigationContainer,
    type NavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthNavigator } from './AuthNavigator';
import { HomeScreen } from '../screens/HomeScreen';
import { AppWelcomeScreen } from '../screens/AppWelcomeScreen';
import { ItemDetailScreen } from '../screens/ItemDetailScreen';
import { GenderPreferenceScreen } from '../screens/GenderPreferenceScreen';
import { StylePreferenceScreen } from '../screens/StylePreferenceScreen';
import { StylePickerScreen } from '../screens/StylePickerScreen';
import { LocationPermissionScreen } from '../screens/LocationPermissionScreen';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native'; // Import View and StyleSheet
import { theme } from '../theme/theme';
import { WardrobeScreen } from '../screens/WardrobeScreen';
import { BodyScreen } from '../screens/BodyScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AppStackParamList } from '../types/navigation';
import { DatabaseScreen } from '../screens/DatabaseScreen';
import { OutfitCanvasScreen } from '../screens/OutfitCanvasScreen';
import { registerDeepLinkListeners } from '../services/deepLinkHandler';

const Stack = createNativeStackNavigator<AppStackParamList>();

export const AppNavigator = () => {
    // Ref to the NavigationContainer so deepLinkHandler can navigate
    // imperatively in response to Linking events.
    const navRef = useRef<NavigationContainerRef<AppStackParamList> | null>(null);

    useEffect(() => {
        // Register Linking listeners for the verify-email and
        // reset-password deep links. The handler uses the same
        // AppStackParamList shape exposed here.
        const unregister = registerDeepLinkListeners(() => navRef.current);
        return unregister;
    }, []);
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }


    return (

        <NavigationContainer ref={navRef}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {user ? (
                    user.is_first_login ? (
                        <>
                            <Stack.Screen name="Welcome" component={AppWelcomeScreen} />
                            <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} />
                            <Stack.Screen name="GenderPreference" component={GenderPreferenceScreen} />
                            <Stack.Screen name="StylePreference" component={StylePreferenceScreen} />
                            <Stack.Screen name="StylePicker" component={StylePickerScreen} />
                        </>
                    ) : (
                        <>
                            <Stack.Screen name="Home" component={HomeScreen} />
                            <Stack.Screen name="Settings" component={SettingsScreen} />
                            <Stack.Screen name="Wardrobe" component={WardrobeScreen} />
                            <Stack.Screen name="Body" component={BodyScreen} />
                            <Stack.Screen name="ItemDetail" component={ItemDetailScreen} />
                            <Stack.Screen name="Database" component={DatabaseScreen} />
                            <Stack.Screen name="OutfitCanvas" component={OutfitCanvasScreen} options={{ gestureEnabled: false }} />
                        </>
                    )
                ) : (
                    <Stack.Screen name="Auth" component={AuthNavigator} />
                )}
            </Stack.Navigator>
        </NavigationContainer >
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
});
