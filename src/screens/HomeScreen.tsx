import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
// import { useAuth } from '../context/AuthContext';
import { Header } from '../components/layout/Header'; // Adjusted path if needed, check where I put it. It was src/components/layout/Header.tsx
import { Sidebar } from '../components/layout/Sidebar';
import { theme } from '../theme/theme';
import IconSort from '../assets/images/sort_icon.svg';
import { CategoryTabs } from '../components/features/CategoryTabs';
import { itemService } from '../services/itemService';
import { Item, CATEGORIES } from '../types/item';

// const { width } = Dimensions.get('window');

// Figma: Width 414. Frame 2009 width 414.
// Images are 205x273.
// Gap 4px.
// 205*2 + 4 = 414. So it fits exactly full width?
// Wait, the main container Frame 2030 has gap 12.
// Let's approximate a 2-column masonry or grid.

const ALL_CATEGORY = 'All';
const FILTER_CATEGORIES = [ALL_CATEGORY, ...CATEGORIES];

export const HomeScreen = () => {
    // const { user } = useAuth(); // Unused in new design
    const navigation = useNavigation<any>();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Data State
    const [items, setItems] = useState<Item[]>([]);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);

    useEffect(() => {
        loadItems();
    }, []);

    useEffect(() => {
        filterItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory, items]);

    const loadItems = async () => {
        try {
            setLoading(true);
            const data = await itemService.getAllItems();
            setItems(data);
        } catch (error) {
            console.error('Failed to load items', error);
        } finally {
            setLoading(false);
        }
    };

    const filterItems = () => {
        if (selectedCategory === ALL_CATEGORY) {
            setFilteredItems(items);
        } else {
            setFilteredItems(items.filter(item => item.category === selectedCategory));
        }
    };

    const handleFeedback = () => {
        console.log('Feedback pressed');
    };

    const handleMenu = () => {
        setIsSidebarOpen(true);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
            <Header
                onFeedback={handleFeedback}
                onBack={handleMenu}
            />

            <View style={styles.mainContent}>
                <Text style={styles.sectionTitle}>My Wardrobe</Text>

                <CategoryTabs
                    categories={FILTER_CATEGORIES}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                />

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.grid}>
                            {filteredItems.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.gridItem}
                                    onPress={() => navigation.navigate('ItemDetail', { itemId: item.id })}
                                >
                                    <View style={styles.imageContainer}>
                                        {/* Use actual image if available, else placeholder color */}
                                        {item.imageUrl && !item.imageUrl.includes('placeholder') ? (
                                            <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
                                        ) : (
                                            <View style={[styles.imagePlaceholder, { backgroundColor: '#E0E0E0' }]} />
                                        )}
                                        {/* Overlay Image if needed (e.g. valid URL) */}
                                        <Image source={{ uri: item.imageUrl }} style={[StyleSheet.absoluteFill, styles.image]} resizeMode="cover" />
                                    </View>

                                    <View style={styles.itemLabelContainer}>
                                        <Text style={styles.itemLabel}>{item.category}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}

                            {filteredItems.length === 0 && (
                                <Text style={styles.emptyText}>No items found in this category.</Text>
                            )}
                        </View>
                    </ScrollView>
                )}
            </View>

            {/* Bottom Sheet / Floating Panel */}
            <View style={styles.bottomSheet}>
                <View style={styles.suggestionRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                        <Chip label="more neutral" />
                        <Chip label="more casual" />
                        <Chip label="colorful" />
                        <TouchableOpacity style={styles.sortButton}>
                            <IconSort width={24} height={24} />
                        </TouchableOpacity>
                        <Chip label="find more context" wide />
                    </ScrollView>
                </View>


            </View>
        </SafeAreaView>
    );
};

const Chip = ({ label, wide }: { label: string, wide?: boolean }) => (
    <TouchableOpacity style={[styles.chip, wide && styles.chipWide]}>
        <Text style={styles.chipText}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.figmaBackground,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    mainContent: {
        flex: 1,
        paddingHorizontal: 0, // Grid seems full width?
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Manrope-Medium',
        fontWeight: '500',
        color: theme.colors.figmaButton,
        marginBottom: 12,
        marginLeft: 22, // Align with header
        marginTop: 10,
    },
    scrollContent: {
        paddingBottom: 200,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start', // Changed to flex-start for even flow
        paddingHorizontal: 16,
        gap: 8, // Using gap instead of space-between calculation if possible, or manual margins
    },
    gridItem: {
        width: '48%', // Approx 2 col with gap
        aspectRatio: 3 / 4,
        marginBottom: 8,
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
    },
    imageContainer: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F0F0F0',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    itemLabelContainer: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        backgroundColor: 'rgba(39, 42, 50, 0.8)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    itemLabel: {
        color: '#FFFFFF',
        fontSize: 11,
        fontFamily: 'Manrope-Medium',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        width: '100%',
        color: '#999',
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
        padding: 20,
        height: 120, // Reduced height as per requirement? Or keep strictly design. Keeping minimal for now so list is visible
        justifyContent: 'flex-start',
    },
    suggestionRow: {
        marginBottom: 0,
    },
    chipsContainer: {
        gap: 8,
        alignItems: 'center',
    },
    chip: {
        backgroundColor: '#E3E3EC',
        borderRadius: 16,
        paddingHorizontal: 12,
        height: 48,
        justifyContent: 'center',
    },
    chipWide: {
        // minWidth: 120,
    },
    chipText: {
        color: theme.colors.figmaButton,
        fontFamily: 'Manrope-Medium',
        fontSize: 14,
    },
    sortButton: {
        width: 48,
        height: 48,
        backgroundColor: '#E3E3EC',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sortIcon: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
    },
    inputActionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 56,
    },
    cancelButton: {
        paddingHorizontal: 24,
        justifyContent: 'center',
        height: '100%',
    },
    cancelText: {
        color: '#CC4C3E',
        fontSize: 16,
        fontFamily: 'Manrope-Medium',
        fontWeight: '500',
    },
    sendButtonContainer: {
        // 
    },
    sendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D0D5DD',
        borderRadius: 100,
        height: 56,
        paddingHorizontal: 24,
        gap: 8,
    },
    sendText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Manrope-SemiBold',
        fontWeight: '600',
    },
    sendIcon: {
        width: 16,
        height: 18,
        resizeMode: 'contain',
    },
});
