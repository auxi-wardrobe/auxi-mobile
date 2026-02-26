
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Image, ActivityIndicator, Alert, Modal, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { theme } from '../theme/theme';
import { bodyService, BodyItem } from '../services/bodyService';
import { getImageUrl } from '../utils/url';

export const BodyScreen = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [items, setItems] = useState<BodyItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const data = await bodyService.getBodies();
            setItems(data);
        } catch (error) {
            console.error('Error fetching body items', error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageSelection = async (type: 'camera' | 'gallery') => {
        setModalVisible(false);

        // Wait for modal to close animation to finish
        setTimeout(async () => {
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
                    await bodyService.uploadBody(asset);
                    Alert.alert('Success', 'Body uploaded successfully');
                    fetchItems(); // Refresh list
                } catch (error) {
                    console.error('Upload error', error);
                    Alert.alert('Error', 'Failed to upload body');
                } finally {
                    setUploading(false);
                }
            }
        }, 500);
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            'Delete Body',
            'Are you sure you want to delete this body image?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await bodyService.deleteBody(id);
                            fetchItems();
                        } catch (error) {
                            console.error('Error deleting body', error);
                            Alert.alert('Error', 'Failed to delete body');
                            setLoading(false);
                        }
                    },
                    style: 'destructive',
                },
            ],
            { cancelable: true }
        );
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
                title="Body Reference"
                onBack={handleMenu}
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
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.gridContent}>
                        <View style={styles.grid}>
                            {items.map((item) => (
                                <View key={item.id} style={styles.gridItem}>
                                    <TouchableOpacity
                                        style={styles.imageContainer}
                                        onLongPress={() => handleDelete(item.id)}
                                    >
                                        {getImageUrl(item.image_url) ? (
                                            <Image
                                                source={{ uri: getImageUrl(item.image_url)! }}
                                                style={styles.image}
                                                resizeMode="cover"
                                                onError={(e) => console.log('Image Load Error:', e.nativeEvent.error)}
                                                onLoad={() => console.log('Image Loaded Successfully')}
                                            />
                                        ) : (
                                            <View style={[styles.imageContainer, { backgroundColor: '#E0E0E0' }]} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {items.length === 0 && !uploading && (
                                <Text style={styles.emptyText}>No body items found. Add one to get started.</Text>
                            )}
                        </View>
                    </ScrollView>
                )}
            </View>

            {/* Add Body Modal */}
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
                                    <Text style={styles.modalTitle}>Add New Body</Text>
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
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridContent: {
        paddingBottom: 100,
        paddingTop: 20,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        gap: 12,
        justifyContent: 'flex-start',
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
        width: '48%',
        aspectRatio: 3 / 4,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#F3F5F9',
        marginBottom: 12,
    },
    imageContainer: {
        flex: 1,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
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
        color: '#FF3B30',
    }
});
