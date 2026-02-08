import React from 'react';
import { View, Text, StyleSheet, Image, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/atoms/Button';
import { theme } from '../theme/theme';

export const WelcomeScreen = () => {
    const navigation = useNavigation<any>(); // TODO: Type navigation
    const { isLoading } = useAuth();

    const handleGetStarted = () => {
        navigation.navigate('StylePreference');
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../assets/images/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>
                        Welcome to{'\n'}auxi
                    </Text>
                    <Text style={styles.subtitle}>
                        Get outfit suggestions{'\n'}that work for your day.
                    </Text>
                </View>

                <View style={styles.buttonContainer}>
                    <Button
                        title="Get started"
                        onPress={handleGetStarted}
                        loading={isLoading}
                        style={styles.button}
                        variant="primary"
                    />
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
        alignItems: 'center',
        paddingVertical: 82, // Matches padding-bottom from Figma
        paddingHorizontal: 16,
    },
    logoContainer: {
        marginTop: 131, // Adjusted top padding 213px - 82px statusbar approx? Using Figma padding directly might be too much if SafeArea handles status bar. 
        // Figma padding: 213px top.
        // Let's rely on flex space-between first, but maybe add some top spacer.
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 119,
        height: 119,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontFamily: 'PlayfairDisplay-Bold', // Assuming font is linked, otherwise fallback
        fontSize: 40,
        fontWeight: '700',
        color: theme.colors.figmaTextPrimary,
        textAlign: 'center',
        lineHeight: 52,
        marginBottom: 16,
    },
    subtitle: {
        fontFamily: 'Manrope-Medium', // Assuming font is linked
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.figmaTextSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    buttonContainer: {
        width: '100%',
        paddingHorizontal: 16,
    },
    button: {
        backgroundColor: theme.colors.figmaButton,
        height: 56,
        borderRadius: 100,
    },
});
