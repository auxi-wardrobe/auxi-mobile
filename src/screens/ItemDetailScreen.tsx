import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Icons } from '../assets/icons';
import { itemService } from '../services/itemService';
import { theme } from '../theme/theme';
import { CATEGORIES, COLORS, Item, STYLES } from '../types/item';
import { getImageUrl } from '../utils/url';

const SURFACE = '#F3F5F9';
const DARK = '#272A32';
const RED = '#CC4C3E';
const TEXT_VARIANT = '#49454F';
const DIVIDER = '#D1D3D8';
const ICON_BG = '#E3E3EC';

const COLOR_SWATCHES: Record<string, string> = {
    black: '#272A32',
    blue: '#8EA1BE',
    green: '#7DAA8C',
    grey: '#8F939B',
    gray: '#8F939B',
    red: '#CC4C3E',
    white: '#F5F7FA',
    yellow: '#D9C26A',
    pink: '#DAA2B1',
    purple: '#A493BE',
    orange: '#C68A5A',
};

const getSwatchColor = (color: string | undefined): string => {
    if (!color) return '#8EA1BE';
    return COLOR_SWATCHES[color.toLowerCase()] || color;
};

type ItemRouteParams = {
    itemId: string;
};

export const ItemDetailScreen = () => {
    const route = useRoute();
    const navigation = useNavigation<any>();
    const { itemId } = (route.params || {}) as ItemRouteParams;

    const [item, setItem] = useState<Item | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingField, setEditingField] = useState<keyof Item | null>(null);
    const [editOptions, setEditOptions] = useState<string[]>([]);

    useEffect(() => {
        if (!itemId) {
            Alert.alert('Error', 'Missing item ID');
            navigation.goBack();
            return;
        }

        const loadItem = async () => {
            try {
                setLoading(true);
                const data = await itemService.getItem(itemId);
                if (!data) {
                    Alert.alert('Error', 'Item not found');
                    navigation.goBack();
                    return;
                }
                setItem(data as Item);
            } catch (error) {
                console.error(error);
                Alert.alert('Error', 'Failed to load item');
            } finally {
                setLoading(false);
            }
        };

        loadItem();
    }, [itemId, navigation]);

    const imageUrl = useMemo(() => {
        if (!item) return undefined;
        const legacyImageUrl = (item as Item & { imageUrl?: string }).imageUrl;
        return getImageUrl(item.image_url) || getImageUrl(legacyImageUrl) || legacyImageUrl;
    }, [item]);

    const openEditModal = (field: keyof Item, options: string[]) => {
        if (item?.isSystem) return;
        setEditingField(field);
        setEditOptions(options);
        setEditModalVisible(true);
    };

    const openEditMenu = () => {
        if (item?.isSystem) return;
        Alert.alert('Edit item', 'Choose what to update', [
            { text: 'Type', onPress: () => openEditModal('category', CATEGORIES) },
            { text: 'Color', onPress: () => openEditModal('color', COLORS) },
            { text: 'Style', onPress: () => openEditModal('style', STYLES) },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const handleSelectOption = async (option: string) => {
        if (!item || !editingField) return;

        try {
            setSaving(true);
            const updatedItem = await itemService.updateItem(item.id, { [editingField]: option });
            setItem(updatedItem as Item);
            setEditModalVisible(false);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to update item');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!item) return;

        Alert.alert(
            item.isSystem ? 'Remove from Wardrobe?' : 'Delete Item?',
            item.isSystem
                ? 'This removes the item from your wardrobe.'
                : 'This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: item.isSystem ? 'Remove' : 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await itemService.deleteItem(item.id);
                            navigation.goBack();
                        } catch (error) {
                            console.error(error);
                            Alert.alert('Error', 'Failed to delete item');
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleLessUsed = () => {
        Alert.alert('Noted', 'We will use this item less often in future outfit mixes.');
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!item) return null;

    const typeValue = item.category === 'Outerwear' ? 'Outer' : item.category;
    const fitValue = 'Regular';
    const styleValue = item.style || 'Casual';
    const colorValue = item.color || 'Blue';

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topRegion}>
                <View style={styles.topBar}>
                    <TouchableOpacity style={styles.roundButton} onPress={() => navigation.goBack()}>
                        <Text style={styles.backGlyph}>‹</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.roundButton} activeOpacity={0.8}>
                        <Icons.Heart width={22} height={22} />
                    </TouchableOpacity>
                </View>

                <View style={styles.imageWrap}>
                    {imageUrl ? (
                        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
                    ) : (
                        <View style={styles.imageFallback}>
                            <Text style={styles.imageFallbackText}>Image unavailable</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.sheet}>
                <View style={styles.details}>
                    <DetailLine label="Type:" value={typeValue} />
                    <DetailLine
                        label="Color"
                        value={colorValue}
                        colorChip={getSwatchColor(colorValue)}
                    />
                    <DetailLine label="Fit" value={fitValue} />
                    <DetailLine label="Style" value={styleValue} />
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity style={styles.mixButton}>
                        <Text style={styles.mixButtonText}>Mix with this</Text>
                        <Icons.Sort width={20} height={20} />
                    </TouchableOpacity>

                    <View style={styles.bottomActions}>
                        <View style={styles.leftActions}>
                            <TouchableOpacity style={styles.iconOnlyButton} onPress={handleDelete}>
                                <Icons.Trash width={20} height={20} />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.lessUsedButton} onPress={handleLessUsed}>
                                <Text style={styles.lessUsedText}>Less used</Text>
                                <Text style={styles.lessUsedIcon}>⊖</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={openEditMenu}
                            disabled={item.isSystem || saving}
                        >
                            <Text style={[styles.editText, item.isSystem && styles.disabledActionText]}>Edit</Text>
                            <Text style={[styles.editIcon, item.isSystem && styles.disabledActionText]}>✎</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <Modal
                visible={editModalVisible}
                transparent
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

const DetailLine = ({
    label,
    value,
    colorChip,
}: {
    label: string;
    value: string;
    colorChip?: string;
}) => (
    <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        {colorChip ? (
            <View style={[styles.colorDot, { backgroundColor: colorChip }]} />
        ) : (
            <Text style={styles.detailValue}>{value}</Text>
        )}
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SURFACE,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: SURFACE,
    },
    topRegion: {
        flex: 1,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 22,
        paddingTop: 8,
    },
    roundButton: {
        width: 45,
        height: 45,
        borderRadius: 14,
        backgroundColor: ICON_BG,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backGlyph: {
        fontSize: 34,
        lineHeight: 34,
        color: DARK,
        marginTop: -2,
    },
    imageWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 12,
    },
    image: {
        width: '100%',
        height: '100%',
        maxHeight: 430,
    },
    imageFallback: {
        width: '92%',
        aspectRatio: 3 / 4,
        borderRadius: 16,
        backgroundColor: '#E8EBF0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageFallbackText: {
        fontSize: 14,
        color: TEXT_VARIANT,
    },
    sheet: {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2.3,
        elevation: 4,
    },
    details: {
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: DIVIDER,
    },
    detailLabel: {
        color: TEXT_VARIANT,
        fontSize: 16,
        lineHeight: 24,
        fontFamily: 'ArchivoNarrow-Regular',
        fontWeight: '400',
        letterSpacing: 0.15,
    },
    detailValue: {
        color: TEXT_VARIANT,
        fontSize: 16,
        lineHeight: 24,
        fontFamily: 'ArchivoNarrow-Regular',
        fontWeight: '400',
        letterSpacing: 0.15,
    },
    colorDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#536173',
    },
    actions: {
        marginTop: 22,
        gap: 8,
    },
    mixButton: {
        height: 56,
        borderWidth: 1.5,
        borderColor: DARK,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    mixButtonText: {
        color: DARK,
        fontSize: 16,
        lineHeight: 24,
        fontFamily: 'ArchivoNarrow-SemiBold',
        fontWeight: '600',
        letterSpacing: 0.15,
    },
    bottomActions: {
        marginTop: 4,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconOnlyButton: {
        width: 58,
        height: 56,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lessUsedButton: {
        height: 56,
        borderRadius: 100,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 8,
    },
    lessUsedText: {
        color: RED,
        fontSize: 16,
        lineHeight: 24,
        fontFamily: 'ArchivoNarrow-Regular',
        fontWeight: '400',
        letterSpacing: 0.15,
    },
    lessUsedIcon: {
        color: RED,
        fontSize: 24,
        lineHeight: 24,
    },
    editButton: {
        height: 56,
        borderRadius: 100,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 8,
    },
    editText: {
        color: DARK,
        fontSize: 16,
        lineHeight: 24,
        fontFamily: 'ArchivoNarrow-Regular',
        fontWeight: '400',
        letterSpacing: 0.15,
    },
    editIcon: {
        color: DARK,
        fontSize: 20,
        lineHeight: 20,
    },
    disabledActionText: {
        opacity: 0.45,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '55%',
        paddingBottom: 36,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#ECECEC',
    },
    modalTitle: {
        fontSize: 18,
        color: DARK,
        fontWeight: '600',
    },
    modalClose: {
        fontSize: 16,
        color: '#4F4F4F',
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
        color: DARK,
    },
    checkedIcon: {
        fontSize: 16,
        color: theme.colors.primary,
        fontWeight: '700',
    },
});
