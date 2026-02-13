import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/atoms/Button';
import { theme } from '../theme/theme';

type StylePreference = 'slim' | 'classic' | 'relaxed';
type RootStackParamList = {
    StylePreference: { gender: 'womenswear' | 'menswear' | 'mixed' };
};
type StylePreferenceScreenRouteProp = RouteProp<RootStackParamList, 'StylePreference'>;

export const StylePreferenceScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<StylePreferenceScreenRouteProp>();
    const { completeOnboarding, isLoading } = useAuth();
    const [selectedStyles, setSelectedStyles] = useState<StylePreference[]>([]);
    const { gender } = route.params || {};

    const toggleStyle = (style: StylePreference) => {
        setSelectedStyles(prev => {
            if (prev.includes(style)) {
                return prev.filter(s => s !== style);
            } else {
                return [...prev, style];
            }
        });
    };

    const handleNext = async () => {
        if (selectedStyles.length > 0) {
            try {
                await completeOnboarding({
                    user_metadata: {
                        preferences: {
                            gender: gender,
                            style: selectedStyles
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

    const getContent = () => {
        if (gender === 'womenswear') {
            return {
                title: 'Which fit makes you feel most confident?',
                subtitle: 'This will be Auxi’s starting point. You can switch up your style anytime.',
                options: [
                    { id: 'slim', label: 'Slim Fit', image: require('../assets/images/women_slim_fit.png') },
                    { id: 'classic', label: 'Classic Fit', image: require('../assets/images/women_classic_fit.png') },
                    { id: 'relaxed', label: 'Relaxed Fit', image: require('../assets/images/women_relaxed_fit.png') },
                ]
            };
        }
        // Default to Men/Mixed logic (using Men's assets/text as fallback or primary for now)
        return {
            title: 'Which fit feels right?',
            subtitle: 'This sets a starting point.',
            options: [
                { id: 'slim', label: 'Slim Fit', image: require('../assets/images/men_slim_fit.png') },
                { id: 'classic', label: 'Classic Fit', image: require('../assets/images/men_classic_fit.png') },
                { id: 'relaxed', label: 'Relaxed Fit', image: require('../assets/images/men_relaxed_fit.png') },
            ]
        };
    };

    const content = getContent();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Image source={require('../assets/images/top_bar.png')} style={styles.backIcon} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{content.title}</Text>
                    <Text style={styles.subtitle}>{content.subtitle}</Text>
                </View>

                <View style={styles.optionsGrid}>
                    <View style={styles.topRow}>
                        <PreferenceOption
                            id={content.options[0].id as StylePreference}
                            label={content.options[0].label}
                            imageSource={content.options[0].image}
                            selected={selectedStyles.includes(content.options[0].id as StylePreference)}
                            onToggle={toggleStyle}
                        />
                        <PreferenceOption
                            id={content.options[1].id as StylePreference}
                            label={content.options[1].label}
                            imageSource={content.options[1].image}
                            selected={selectedStyles.includes(content.options[1].id as StylePreference)}
                            onToggle={toggleStyle}
                        />
                    </View>
                    <View style={styles.bottomRow}>
                        <PreferenceOption
                            id={content.options[2].id as StylePreference}
                            label={content.options[2].label}
                            imageSource={content.options[2].image}
                            selected={selectedStyles.includes(content.options[2].id as StylePreference)}
                            onToggle={toggleStyle}
                        />
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title="Next"
                    onPress={handleNext}
                    loading={isLoading}
                    disabled={selectedStyles.length === 0}
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
    onToggle
}: {
    id: StylePreference;
    label: string;
    imageSource: any;
    selected: boolean;
    onToggle: (id: StylePreference) => void;
}) => (
    <TouchableOpacity
        style={[
            styles.optionContainer,
            selected && styles.optionSelected
        ]}
        onPress={() => onToggle(id)}
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
        height: 45,
        resizeMode: 'contain',
    },
    content: {
        paddingHorizontal: 22,
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
        color: theme.colors.figmaButton,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'OpenSans-Regular',
        fontSize: 10,
        color: theme.colors.figmaButton,
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
        width: 183,
        height: 244,
        backgroundColor: '#DEDEDE',
        overflow: 'hidden',
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
        bottom: 12,
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
        paddingHorizontal: 45,
    },
});
