
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/atoms/Button';
import { theme } from '../theme/theme';
import { requestLocationPermission } from '../utils/location';

export const LocationPermissionScreen = () => {
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(false);

    const handleEnableLocation = async () => {
        setLoading(true);
        try {
            const hasPermission = await requestLocationPermission();

            if (hasPermission) {
                navigation.navigate('GenderPreference');
            } else {
                // Start manually manually
                Alert.alert(
                    'Permission Denied',
                    'We need location permission to suggest outfits based on local weather. Please enable it in settings.',
                    [
                        { text: 'Cancel', style: 'cancel', onPress: () => navigation.navigate('StylePreference') },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                );
            }
        } catch (error) {
            console.error(error);
            navigation.navigate('StylePreference');
        } finally {
            setLoading(false);
        }
    };

    const handleNotNow = () => {
        navigation.navigate('StylePreference');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.topBar}>
                    {/* Placeholder for top bar if needed, or back button */}
                </View>

                <View style={styles.mainContent}>
                    <View style={styles.textContainer}>
                        <Text style={styles.title}>
                            To suggest outfits that fit the weather and local style
                        </Text>
                    </View>

                    <View style={styles.buttonContainer}>
                        <Button
                            title="Enable location"
                            onPress={handleEnableLocation}
                            loading={loading}
                            style={styles.enableButton}
                            variant="outline"
                            textStyle={styles.enableButtonText}
                        />
                        <Button
                            title="Not now"
                            onPress={handleNotNow}
                            style={styles.notNowButton}
                            variant="text"
                            textStyle={styles.notNowButtonText}
                        />
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.figmaBackground,
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: 22,
        paddingBottom: 40,
    },
    topBar: {
        height: 45,
        // Add more styles from Figma if needed
    },
    mainContent: {
        flex: 1,
        justifyContent: 'flex-end', // Pushes content to the bottom as per design visual hierarchy often
        gap: 40,
    },
    textContainer: {
        marginBottom: 40,
    },
    title: {
        fontFamily: 'PlayfairDisplay-Medium', // Check font name
        fontSize: 24,
        fontWeight: '500',
        color: theme.colors.figmaTextPrimary,
        textAlign: 'center',
        lineHeight: 32,
    },
    buttonContainer: {
        gap: 16,
        width: '100%',
    },
    enableButton: {
        height: 56,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: theme.colors.figmaTextPrimary,
        backgroundColor: 'transparent',
    },
    enableButtonText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.figmaTextPrimary,
    },
    notNowButton: {
        height: 56,
        borderRadius: 32,
    },
    notNowButtonText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.figmaTextPrimary,
    },
});
