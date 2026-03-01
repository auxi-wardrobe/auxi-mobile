import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { theme } from '../../theme/theme';

interface CategoryTabsProps {
    categories: string[];
    selectedCategory: string;
    onSelectCategory: (category: string) => void;
}

export const CategoryTabs = ({ categories, selectedCategory, onSelectCategory }: CategoryTabsProps) => {
    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {categories.map((category) => (
                    <TouchableOpacity
                        key={category}
                        style={[
                            styles.tab,
                            selectedCategory === category && styles.selectedTab
                        ]}
                        onPress={() => onSelectCategory(category)}
                    >
                        <Text style={[
                            styles.tabText,
                            selectedCategory === category && styles.selectedTabText
                        ]}>
                            {category}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingRight: 32,
        gap: 8,
    },
    tab: {
        height: 48,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: theme.colors.figmaIconSurface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedTab: {
        backgroundColor: '#191B22',
    },
    tabText: {
        ...theme.typography.aliases.archivoBody,
        color: theme.colors.figmaAction,
    },
    selectedTabText: {
        color: theme.colors.white,
    },
});
