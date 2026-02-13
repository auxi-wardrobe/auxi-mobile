import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image, ActivityIndicator } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
// import { useAuth } from '../context/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { Header } from '../components/layout/Header'; // Adjusted path if needed, check where I put it. It was src/components/layout/Header.tsx
import { Sidebar } from '../components/layout/Sidebar';
import { ItemDetailBottomSheet } from '../components/features/ItemDetailBottomSheet';
import { theme } from '../theme/theme';
import { Item } from '../types/item';
import { recommendationService } from '../services/recommendationService';
import { getImageUrl } from '../utils/url';

// const { width } = Dimensions.get('window');

// Figma: Width 414.
// Images are 205x273.
// Gap 4px.

// const ALL_CATEGORY = 'All'; // Removed as per new design
// const FILTER_CATEGORIES = [ALL_CATEGORY, ...CATEGORIES]; // Removed as per new design

export const HomeScreen = () => {
    // const { user } = useAuth(); // Unused in new design
    // const navigation = useNavigation<any>();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Data State
    const [items, setItems] = useState<Item[]>([]);
    const [recommendationSessionId, setRecommendationSessionId] = useState<string | null>(null);
    const [currentOutfitHash, setCurrentOutfitHash] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);

    // Initial Recommendation Mutation
    const { mutate: startRecommendation, isPending: isStartPending } = useMutation({
        mutationFn: recommendationService.startRecommendation,
        onSuccess: (data) => {
            if (data && data.outfit) {
                setItems(data.outfit.items);
                setRecommendationSessionId(data.session_id);
                setCurrentOutfitHash(data.outfit.outfit_hash);
            }
        },
        onError: (error) => {
            console.error('Failed to load recommendation', error);
        }
    });

    // Next Recommendation Mutation
    const { mutate: nextRecommendation, isPending: isNextPending } = useMutation({
        mutationFn: recommendationService.nextRecommendation,
        onSuccess: (data) => {
            if (data && data.outfit) {
                setItems(data.outfit.items);
                if (data.session_id) setRecommendationSessionId(data.session_id);
                setCurrentOutfitHash(data.outfit.outfit_hash);
            }
        },
        onError: (error) => {
            console.error('Failed to fetch next recommendation', error);
        }
    });

    const loading = isStartPending || isNextPending;

    useEffect(() => {
        // hardcode params for now or use defaults in service
        startRecommendation({});
    }, [startRecommendation]);

    const handleTryAnother = () => {
        if (!recommendationSessionId || !currentOutfitHash) return;

        nextRecommendation({
            session_id: recommendationSessionId,
            current_outfit_hash: currentOutfitHash
        });
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

    const openItemDetail = (item: Item) => {
        setSelectedItem(item);
    };

    const closeItemDetail = () => {
        setSelectedItem(null);
    };

    return (
        <SafeAreaView style={styles.container}>
            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
            <Header
                onFeedback={handleFeedback}
                onBack={handleMenu}
            />

            <View style={styles.mainContent}>
                <Text style={styles.sectionTitle}>An option that works</Text>

                {/* Categories removed */}
                {/* <CategoryTabs
                    categories={FILTER_CATEGORIES}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                /> */}

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.grid}>
                            {items.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.gridItem}
                                    onPress={() => openItemDetail(item)}
                                >
                                    <View style={styles.imageContainer}>
                                        {/* Use actual image if available, else placeholder color */}
                                        {getImageUrl(item.image_url) ? (
                                            <Image
                                                source={{ uri: getImageUrl(item.image_url)! }}
                                                style={styles.image}
                                                resizeMode="contain"
                                                onError={(e) => console.log('Image Load Error:', e.nativeEvent.error)}
                                                onLoad={() => console.log('Image Loaded Successfully')}
                                            />
                                        ) : (
                                            <View style={[styles.imagePlaceholder, { backgroundColor: '#E0E0E0' }]} />
                                        )}

                                        <View style={styles.overlayLabelContainer}>
                                            <Text style={styles.overlayLabelText}>common items</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}

                            {items.length === 0 && (
                                <Text style={styles.emptyText}>No items found.</Text>
                            )}
                        </View>
                    </ScrollView>
                )}
            </View>

            {/* Bottom Sheet / Floating Panel */}
            <View style={styles.bottomSheet}>
                <View style={styles.actionButtonsContainer}>
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.outlinedButton]}
                            onPress={handleTryAnother}
                        >
                            <Text style={styles.actionButtonText}>Try another</Text>
                            <View style={styles.iconPlaceholder} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.outlinedButton]}>
                            <Text style={styles.actionButtonText}>Yes</Text>
                            <View style={styles.iconPlaceholder} />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={[styles.actionButton, styles.fullWidthButton]}>
                        <Text style={styles.actionButtonText}>Edit context</Text>
                        <View style={styles.iconPlaceholder} />
                    </TouchableOpacity>
                </View>
            </View>

            <ItemDetailBottomSheet
                visible={!!selectedItem}
                item={selectedItem}
                onClose={closeItemDetail}
            />
        </SafeAreaView>
    );
};

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
    // itemLabelContainer: {
    //     position: 'absolute',
    //     bottom: 10,
    //     left: 10,
    //     backgroundColor: 'rgba(39, 42, 50, 0.8)',
    //     paddingHorizontal: 8,
    //     paddingVertical: 4,
    //     borderRadius: 4,
    // },
    // itemLabel: {
    //     color: '#FFFFFF',
    //     fontSize: 11,
    //     fontFamily: 'Manrope-Medium',
    // },
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
        height: 169, // Increased height for new buttons
        justifyContent: 'center',
    },
    // suggestionRow: {
    //     marginBottom: 0,
    // },
    // chipsContainer: {
    //     gap: 8,
    //     alignItems: 'center',
    // },
    // chip: {
    //     backgroundColor: '#E3E3EC',
    //     borderRadius: 16,
    //     paddingHorizontal: 12,
    //     height: 48,
    //     justifyContent: 'center',
    // },
    // chipWide: {
    //     // minWidth: 120,
    // },
    // chipText: {
    //     color: theme.colors.figmaButton,
    //     fontFamily: 'Manrope-Medium',
    //     fontSize: 14,
    // },
    actionButtonsContainer: {
        gap: 8,
        width: '100%',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 8,
        width: '100%',
    },
    actionButton: {
        height: 56,
        borderRadius: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        borderWidth: 1.5,
        borderColor: '#272A32',
    },
    outlinedButton: {
        flex: 1,
    },
    fullWidthButton: {
        width: '100%',
    },
    actionButtonText: {
        color: '#272A32',
        fontSize: 16,
        fontFamily: 'Manrope-SemiBold',
        fontWeight: '600',
    },
    iconPlaceholder: {
        width: 16,
        height: 16,
        // backgroundColor: '#ccc', // Placeholder for icon
    },
    overlayLabelContainer: {
        position: 'absolute',
        bottom: 19,
        left: 0,
        backgroundColor: 'rgba(39, 42, 50, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 3,
        // width: 81, // Fixed width from Figma? Or auto?
        // Figma says 81px width, 19px height.
    },
    overlayLabelText: {
        color: '#FFFFFF',
        fontSize: 8,
        fontFamily: 'Manrope-Medium',
        fontWeight: '500',
    },
    // sortButton: {
    //     width: 48,
    //     height: 48,
    //     backgroundColor: '#E3E3EC',
    //     borderRadius: 16,
    //     justifyContent: 'center',
    //     alignItems: 'center',
    // },
    // sortIcon: {
    //     width: 24,
    //     height: 24,
    //     resizeMode: 'contain',
    // },
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
