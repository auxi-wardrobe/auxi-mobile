import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image, ActivityIndicator, Alert, Modal, TouchableWithoutFeedback, Dimensions } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { theme } from '../theme/theme';
import { wardrobeService, WardrobeItem } from '../services/wardrobeService';
// import IconPlus from '../assets/images/icon_plus.svg'; // Assuming we have an icon or will use text for now

const FILTERS = ['All', 'Top', 'Bottom', 'AC']; // AC = Accessories?
const { height } = Dimensions.get('window');

export const WardrobeScreen = () => {
    // const navigation = useNavigation<any>();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState('All');
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const data = await wardrobeService.getWardrobeItems();
            setItems(data);
        } catch (error) {
            console.error('Error fetching wardrobe items', error);
            // Alert.alert('Error', 'Failed to fetch wardrobe items');
        } finally {
            setLoading(false);
        }
    };

    const handleImageSelection = async (type: 'camera' | 'gallery') => {
        setModalVisible(false);

        const options = {
            mediaType: 'photo' as const,
            selectionLimit: 1,
        };

        const result = type === 'camera'
            ? await launchCamera(options)
            : await launchImageLibrary(options);

        if (result.didCancel) return;

        if (result.errorCode) {
            Alert.alert('Error', result.errorMessage || 'Failed to pick image');
            return;
        }

        if (result.assets && result.assets.length > 0) {
            const asset = result.assets[0];
            try {
                setUploading(true);
                // Optional: Ask for type hint here or infer. For now, sending without hint or default.
                await wardrobeService.uploadWardrobeItem(asset);
                Alert.alert('Success', 'Item uploaded successfully');
                fetchItems(); // Refresh list
            } catch (error) {
                console.error('Upload error', error);
                Alert.alert('Error', 'Failed to upload item');
            } finally {
                setUploading(false);
            }
        }
    };

    const handleMenu = () => {
        setIsSidebarOpen(true);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    const filteredItems = items.filter(item => {
        if (selectedFilter === 'All') return true;
        // Simple case-insensitive match for MVP. API might return 'top', 'bottom' etc.
        return item.category?.toLowerCase() === selectedFilter.toLowerCase() ||
            (selectedFilter === 'AC' && (item.category?.toLowerCase() === 'accessory' || item.category?.toLowerCase() === 'ac'));
    });

    return (
        <SafeAreaView style={styles.container}>
            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
            <Header
                onBack={handleMenu} // Reusing onBack as Menu trigger for consistency with HomeScreen properties
                rightComponent={
                    <TouchableOpacity onPress={() => setModalVisible(true)} disabled={uploading}>
                        {uploading ? (
                            <ActivityIndicator size="small" color={theme.colors.figmaButton} />
                        ) : (
                            <Text style={styles.headerButtonText}>Add</Text>
                        )}
                    </TouchableOpacity>
                }
            />

            <View style={styles.content}>
                <View style={styles.filterContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
                        {FILTERS.map((filter) => (
                            <TouchableOpacity
                                key={filter}
                                style={[
                                    styles.filterChip,
                                    selectedFilter === filter && styles.filterChipActive
                                ]}
                                onPress={() => setSelectedFilter(filter)}
                            >
                                <Text style={[
                                    styles.filterText,
                                    selectedFilter === filter && styles.filterTextActive
                                ]}>
                                    {filter}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.gridContent}>
                        <View style={styles.grid}>

                            {filteredItems.map((item) => (
                                <View key={item.id} style={styles.gridItem}>
                                    <View style={styles.imageContainer}>
                                        <Image
                                            source={{ uri: item.image_url }}
                                            style={styles.image}
                                            resizeMode="cover" // Cover usually looks better for grid
                                        />
                                        <View style={styles.labelContainer}>
                                            <Text style={styles.labelText}>{item.name || item.category || 'Item'}</Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                            {filteredItems.length === 0 && !uploading && (
                                <Text style={styles.emptyText}>No items found in this category.</Text>
                            )}
                        </View>
                    </ScrollView>
                )}
            </View>

            {/* Add Item Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Add New Item</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.modalOption}
                                    onPress={() => handleImageSelection('camera')}
                                >
                                    <Text style={styles.modalOptionText}>Take a Photo</Text>
                                </TouchableOpacity>
                                <View style={styles.modalDivider} />
                                <TouchableOpacity
                                    style={styles.modalOption}
                                    onPress={() => handleImageSelection('gallery')}
                                >
                                    <Text style={styles.modalOptionText}>Upload from Gallery</Text>
                                </TouchableOpacity>
                                <View style={styles.modalDivider} />
                                <TouchableOpacity
                                    style={styles.modalCancel}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF', // Design shows white bg for Wardrobe frame
    },
    content: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterContainer: {
        height: 60, // approx
        paddingVertical: 12,
    },
    filterContent: {
        paddingHorizontal: 20,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: '#E3E3EC',
        height: 36, // Fixed height from Figma look
        justifyContent: 'center',
    },
    filterChipActive: {
        backgroundColor: '#191B22',
    },
    filterText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 14,
        color: '#272A32',
    },
    filterTextActive: {
        color: '#FFFFFF',
    },
    gridContent: {
        paddingBottom: 100,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        gap: 12,
        justifyContent: 'space-between', // Or flex-start with gap
    },
    emptyText: {
        width: '100%',
        textAlign: 'center',
        color: '#999',
        marginTop: 40,
    },
    headerButtonText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 16,
        color: theme.colors.figmaButton,
    },
    gridItem: {
        width: '48%', // approx
        aspectRatio: 3 / 4,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#F3F5F9',
        marginBottom: 12,
    },
    imageContainer: {
        flex: 1,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    labelContainer: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        backgroundColor: 'rgba(39, 42, 50, 0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    labelText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontFamily: 'Manrope-Medium',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end', // Bottom sheet style
        // alignItems: 'center', // Center if not bottom sheet
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        width: '100%', // Full width for bottom sheet
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
        // maxHeight: height * 0.4,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontFamily: 'Manrope-Bold',
        fontSize: 18,
        color: theme.colors.figmaButton,
    },
    modalOption: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    modalOptionText: {
        fontFamily: 'Manrope-Medium',
        fontSize: 16,
        color: theme.colors.figmaButton,
    },
    modalDivider: {
        height: 1,
        backgroundColor: '#E3E3EC',
        width: '100%',
    },
    modalCancel: {
        marginTop: 10,
        paddingVertical: 16,
        alignItems: 'center',
    },
    modalCancelText: {
        fontFamily: 'Manrope-SemiBold',
        fontSize: 16,
        color: '#FF3B30', // Red for cancel
    }
});
