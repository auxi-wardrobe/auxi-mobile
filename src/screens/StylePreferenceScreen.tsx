import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/atoms/Button';
import { theme } from '../theme/theme';

type Preference = 'womenswear' | 'menswear' | 'mixed';

export const StylePreferenceScreen = () => {
    const navigation = useNavigation();
    const { completeOnboarding, isLoading } = useAuth();
    const [selectedPreference, setSelectedPreference] = useState<Preference | null>(null);

    const handleNext = async () => {
        if (selectedPreference) {
            try {
                await completeOnboarding({
                    user_metadata: {
                        preferences: {
                            style: [selectedPreference]
                        }
                    }
                });
            } catch (error) {
                console.error('Failed to save preference', error);
            }
        }
    };

    const handleBack = () => {
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Image source={require('../assets/images/top_bar.png')} style={styles.backIcon} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>Start with what you usually wear</Text>
                    <Text style={styles.subtitle}>You can change this later.</Text>
                </View>

                <View style={styles.optionsGrid}>
                    <View style={styles.topRow}>
                        <PreferenceOption
                            id="womenswear"
                            label="Womenswear"
                            imageSource={require('../assets/images/womenswear.png')}
                            selected={selectedPreference === 'womenswear'}
                            onSelect={setSelectedPreference}
                        />
                        <PreferenceOption
                            id="menswear"
                            label="Menswear"
                            imageSource={require('../assets/images/menswear.png')}
                            selected={selectedPreference === 'menswear'}
                            onSelect={setSelectedPreference}
                        />
                    </View>
                    <View style={styles.bottomRow}>
                        <PreferenceOption
                            id="mixed"
                            label="Mixed"
                            imageSource={require('../assets/images/mixed.png')}
                            selected={selectedPreference === 'mixed'}
                            onSelect={setSelectedPreference}
                        />
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title="Next"
                    onPress={handleNext}
                    loading={isLoading}
                    disabled={!selectedPreference}
                />
            </View>
        </SafeAreaView>
    );
};

const PreferenceOption = ({
    id,
    label,
    imageSource,
    selected,
    onSelect
}: {
    id: Preference;
    label: string;
    imageSource: any;
    selected: boolean;
    onSelect: (id: Preference) => void;
}) => (
    <TouchableOpacity
        style={[
            styles.optionContainer,
            selected && styles.optionSelected
        ]}
        onPress={() => onSelect(id)}
        activeOpacity={0.8}
    >
        <View style={styles.imageContainer}>
            <Image source={imageSource} style={styles.optionImage} resizeMode="cover" />
            <View style={styles.labelBadge}>
                <Text style={styles.labelText}>{label}</Text>
            </View>
        </View>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.figmaBackground,
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    backButton: {
        width: 45,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backIcon: {
        width: 45,
        height: 45, // approximate based on Figma export
        resizeMode: 'contain',
    },
    content: {
        paddingHorizontal: 22, // 22px left padding in Figma frame
        paddingTop: 40,
        paddingBottom: 100,
    },
    textContainer: {
        marginBottom: 32,
    },
    title: {
        fontFamily: 'PlayfairDisplay-SemiBold',
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.figmaButton, // #272A32
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'OpenSans-Regular',
        fontSize: 10,
        color: theme.colors.figmaButton, // #272A32
        textAlign: 'center',
    },
    optionsGrid: {
        gap: 4,
    },
    topRow: {
        flexDirection: 'row',
        gap: 4,
        justifyContent: 'space-between',
    },
    bottomRow: {
        marginTop: 4,
    },
    optionContainer: {
        width: 183, // Figma width
        height: 244, // Figma height
        backgroundColor: '#DEDEDE',
        overflow: 'hidden',
        // borderRadius? Figma shows 0 or implicit? Frame has radius but children?
        // Let's assume standard sharp edges closely packed unless specified.
    },
    optionSelected: {
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    imageContainer: {
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    optionImage: {
        width: '100%',
        height: '100%',
    },
    labelBadge: {
        position: 'absolute',
        bottom: 12, // approx
        alignSelf: 'center',
        backgroundColor: 'rgba(39, 42, 50, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 3,
        width: 81,
        height: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    labelText: {
        color: '#FFFFFF',
        fontFamily: 'Manrope-Medium',
        fontSize: 8,
        fontWeight: '500',
    },
    footer: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        paddingHorizontal: 45, // Button is centered width 327px on 414 screen. 43.5 margins.
    },
});
