import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { theme } from '../theme/theme';
import { itemService } from '../services/itemService';
import { Item, CATEGORIES, COLORS, STYLES, SEASONS } from '../types/item';

// For now, I'll use a simple text or unicode arrow if SVG is missing, but best to stick to SVG if possible or just Text "<"

// Mock icons for now
const BackIcon = () => <Text style={{ fontSize: 24, color: theme.colors.text }}>←</Text>;

export const ItemDetailScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { itemId } = route.params as { itemId: string };

    const [item, setItem] = useState<Item | null>(null);
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [saving, setSaving] = useState(false);

    // Edit State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingField, setEditingField] = useState<keyof Item | null>(null);
    const [editOptions, setEditOptions] = useState<string[]>([]);

    useEffect(() => {
        loadItem();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemId]);

    const loadItem = async () => {
        try {
            setLoading(true);
            const data = await itemService.getItem(itemId);
            if (data) {
                setItem(data);
            } else {
                Alert.alert('Error', 'Item not found');
                navigation.goBack();
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load item');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigation.goBack();
    };

    const openEditModal = (field: keyof Item, options: string[]) => {
        if (item?.isSystem) return; // Prevent edit if system item
        setEditingField(field);
        setEditOptions(options);
        setEditModalVisible(true);
    };

    const handleSelectOption = async (option: string) => {
        if (!item || !editingField) return;

        try {
            setSaving(true);
            const updatedItem = await itemService.updateItem(item.id, { [editingField]: option });
            setItem(updatedItem);
            setEditModalVisible(false);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to update item');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            item?.isSystem ? "Remove from Wardrobe?" : "Delete Item?",
            item?.isSystem
                ? "This will remove the item from your wardrobe but it will remain in the system."
                : "This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: item?.isSystem ? "Remove" : "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await itemService.deleteItem(item!.id);
                            navigation.goBack();
                        } catch (error) {
                            console.error(error);
                            Alert.alert('Error', 'Failed to delete item');
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!item) return null;

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <BackIcon />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{item.category} Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Large Image */}
                <View style={styles.imageContainer}>
                    <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="contain" />
                </View>

                {/* Metadata Fields */}
                <View style={styles.detailsContainer}>
                    <Text style={styles.sectionTitle}>Properties</Text>

                    <DetailRow
                        label="Category"
                        value={item.category}
                        isEditable={!item.isSystem}
                        onPress={() => openEditModal('category', CATEGORIES)}
                    />
                    <DetailRow
                        label="Color"
                        value={item.color}
                        isEditable={!item.isSystem}
                        onPress={() => openEditModal('color', COLORS)}
                    />
                    <DetailRow
                        label="Style"
                        value={item.style || 'Not set'}
                        isEditable={!item.isSystem}
                        onPress={() => openEditModal('style', STYLES)}
                    />
                    <DetailRow
                        label="Season"
                        value={item.season || 'Not set'}
                        isEditable={!item.isSystem}
                        onPress={() => openEditModal('season', SEASONS)}
                    />

                    {item.isSystem && (
                        <Text style={styles.systemNote}>
                            * Common items cannot be edited.
                        </Text>
                    )}
                </View>

                {/* Actions */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity style={[styles.actionButton, styles.mixButton]}>
                        <Text style={styles.mixButtonText}>Mix with this</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
                        <Text style={styles.deleteButtonText}>
                            {item.isSystem ? 'Remove from Wardrobe' : 'Delete Item'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Edit Modal (Simple Bottom Sheet replacement) */}
            <Modal
                visible={editModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select {editingField}</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Text style={styles.modalClose}>Close</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {editOptions.map((option) => (
                                <TouchableOpacity
                                    key={option}
                                    style={styles.optionItem}
                                    onPress={() => handleSelectOption(option)}
                                >
                                    <Text style={styles.optionText}>{option}</Text>
                                    {item[editingField as keyof Item] === option && (
                                        <Text style={styles.checkedIcon}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

// Helper Component for Rows
const DetailRow = ({ label, value, isEditable, onPress }: { label: string, value: string, isEditable: boolean, onPress: () => void }) => (
    <TouchableOpacity
        style={[styles.row, !isEditable && styles.rowDisabled]}
        onPress={onPress}
        disabled={!isEditable}
    >
        <Text style={styles.rowLabel}>{label}</Text>
        <View style={styles.rowValueContainer}>
            <Text style={[styles.rowValue, !isEditable && styles.textDisabled]}>{value}</Text>
            {isEditable && <Text style={styles.arrow}>{'>'}</Text>}
        </View>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    imageContainer: {
        width: '100%',
        height: 400,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    detailsContainer: {
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        color: theme.colors.text,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    rowDisabled: {
        opacity: 0.7,
    },
    rowLabel: {
        fontSize: 16,
        color: '#666666',
    },
    rowValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowValue: {
        fontSize: 16,
        color: theme.colors.text,
        fontWeight: '500',
        marginRight: 8,
    },
    textDisabled: {
        color: '#999999',
    },
    arrow: {
        fontSize: 16,
        color: '#CCCCCC',
    },
    systemNote: {
        marginTop: 12,
        fontSize: 12,
        color: '#999999',
        fontStyle: 'italic',
    },
    actionsContainer: {
        marginTop: 32,
        paddingHorizontal: 20,
        gap: 16,
    },
    actionButton: {
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mixButton: {
        backgroundColor: theme.colors.primary, // Using primary color
    },
    mixButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#FF4444',
    },
    deleteButtonText: {
        color: '#FF4444',
        fontSize: 16,
        fontWeight: '500',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '50%',
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalClose: {
        fontSize: 16,
        color: '#007AFF',
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    optionText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    checkedIcon: {
        fontSize: 16,
        color: theme.colors.primary,
        fontWeight: 'bold',
    },
});
