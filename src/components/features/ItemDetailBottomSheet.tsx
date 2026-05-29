import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Animated,
    TouchableOpacity,
    Dimensions,
    Image,
    Platform,
    ScrollView,
} from 'react-native';
import { theme } from '../../theme/theme';
import { Item } from '../../types/item';
import { resolveItemImage } from '../../utils/url';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ItemDetailBottomSheetProps {
    visible: boolean;
    item: Item | null;
    onClose: () => void;
}

export const ItemDetailBottomSheet: React.FC<ItemDetailBottomSheetProps> = ({
    visible,
    item,
    onClose,
}) => {
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
        if (visible) {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, slideAnim]);

    const handleClose = () => {
        Animated.timing(slideAnim, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    if (!item) return null;

    return (
        <Modal
            transparent
            visible={visible}
            onRequestClose={handleClose}
            animationType="none"
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} onPress={handleClose} />
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {/* Top Bar / Handle */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>Close</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        {/* Image Section */}
                        <View style={styles.imageContainer}>
                            {resolveItemImage(item) && (
                                <Image source={{ uri: resolveItemImage(item)! }} style={styles.image} resizeMode="cover" />
                            )}
                            <View style={styles.commonItemsTag}>
                                <Text style={styles.commonItemsText}>common items</Text>
                            </View>
                        </View>

                        {/* Gradient Overlay Placeholder (Frame 2048 in Figma) */}
                        {/* The gradient is visually subtle in code without specific assets, using a simple view for now if needed or skipping */}

                        {/* Details Section */}
                        <View style={styles.detailsContainer}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoText}>
                                    Item type: {item.category || 'Shirt'}{'\n'}
                                    Fit: Regular fit{'\n'}
                                    Sleeve: Long sleeve{'\n'}
                                    Material: Cotton
                                </Text>

                                <View style={styles.loveSection}>
                                    {/* Placeholder for Love Icon */}
                                    <View style={styles.loveIconPlaceholder} />
                                    <Text style={styles.loveText}>love this</Text>
                                </View>
                            </View>

                            <View style={styles.colorRow}>
                                <Text style={styles.colorLabel}>Color</Text>
                                <View style={[styles.colorDot, { backgroundColor: item.color || '#000' }]} />
                            </View>
                        </View>

                        {/* Actions Section */}
                        <View style={styles.actionsContainer}>
                            <TouchableOpacity style={styles.primaryButton}>
                                <Text style={styles.primaryButtonText}>Mix with this</Text>
                                {/* Icon placeholder */}
                            </TouchableOpacity>

                            <View style={styles.secondaryActionsRow}>
                                <TouchableOpacity style={styles.secondaryButton}>
                                    <Text style={styles.secondaryButtonText}>Less used</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.secondaryButton}>
                                    <Text style={styles.secondaryButtonText}>Edit</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        backgroundColor: theme.colors.background,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        height: '90%', // Occupies most of the screen
        paddingBottom: 40,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.25,
                shadowRadius: 5,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    closeButton: {
        padding: 8,
    },
    closeText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        fontFamily: theme.typography.fontFamily,
    },
    content: {
        padding: 24,
    },
    imageContainer: {
        position: 'relative',
        marginBottom: 32,
        borderRadius: 8,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        aspectRatio: 3 / 4,
        borderRadius: 8,
    },
    commonItemsTag: {
        position: 'absolute',
        bottom: 12,
        left: '50%',
        marginLeft: -40, // Half of width (80)
        backgroundColor: 'rgba(39, 42, 50, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 4,
    },
    commonItemsText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '500',
        textAlign: 'center',
        fontFamily: theme.typography.fontFamily,
    },
    detailsContainer: {
        gap: 8,
        marginBottom: 32,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    infoText: {
        fontSize: 16,
        lineHeight: 24,
        color: theme.colors.textSecondary, // #49454F
        fontFamily: theme.typography.fontFamily,
        fontWeight: '500',
        flex: 1,
    },
    loveSection: {
        alignItems: 'center',
        gap: 4,
    },
    loveIconPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.colors.text,
    },
    loveText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
    },
    colorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    colorLabel: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        fontFamily: theme.typography.fontFamily,
        fontWeight: '500',
    },
    colorDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    actionsContainer: {
        gap: 16,
    },
    primaryButton: {
        backgroundColor: theme.colors.background,
        borderWidth: 1.5,
        borderColor: theme.colors.figmaButton,
        borderRadius: 100,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    primaryButtonText: {
        color: theme.colors.figmaButton,
        fontSize: 16,
        fontWeight: '600',
        fontFamily: theme.typography.fontFamily,
    },
    secondaryActionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
    },
    secondaryButton: {
        flex: 1,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 100,
        backgroundColor: theme.colors.surface,
        // Figma uses a specific style for "Secondary button", likely transparent or light bg
    },
    secondaryButtonText: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '600',
        fontFamily: theme.typography.fontFamily,
    }
});
