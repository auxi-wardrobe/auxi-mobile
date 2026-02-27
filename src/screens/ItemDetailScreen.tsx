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
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  BottomSheetSurface,
  DividerRow,
  PillButton,
  TopIconButton,
} from '../components/primitives/FigmaPrimitives';
import { Icons } from '../assets/icons';
import { itemService } from '../services/itemService';
import { theme } from '../theme/theme';
import { AppStackParamList } from '../types/navigation';
import { CATEGORIES, COLORS, Item, STYLES } from '../types/item';
import { getImageUrl } from '../utils/url';

type ScreenNavigation = NativeStackNavigationProp<AppStackParamList, 'ItemDetail'>;
type ScreenRoute = RouteProp<AppStackParamList, 'ItemDetail'>;

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

export const ItemDetailScreen = () => {
  const navigation = useNavigation<ScreenNavigation>();
  const route = useRoute<ScreenRoute>();
  const { itemId } = route.params;

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<keyof Item | null>(null);
  const [editOptions, setEditOptions] = useState<string[]>([]);

  useEffect(() => {
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
      item.isSystem ? 'This removes the item from your wardrobe.' : 'This action cannot be undone.',
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
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.figmaAction} />
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
          <TopIconButton
            onPress={() => navigation.goBack()}
            icon={<Text style={styles.backGlyph}>‹</Text>}
          />

          <TopIconButton icon={<Icons.Heart width={22} height={22} />} />
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

      <BottomSheetSurface style={styles.sheet}>
        <View style={styles.details}>
          <DividerRow label="Type" value={typeValue} />
          <DividerRow
            label="Color"
            rightNode={<View style={[styles.colorDot, { backgroundColor: getSwatchColor(colorValue) }]} />}
          />
          <DividerRow label="Fit" value={fitValue} />
          <DividerRow label="Style" value={styleValue} hideDivider />
        </View>

        <View style={styles.actionBlock}>
          <PillButton
            title="Mix with this"
            variant="outline"
            trailing={<Icons.Sort width={18} height={18} />}
          />

          <View style={styles.bottomRow}>
            <View style={styles.leftRow}>
              <TouchableOpacity onPress={handleDelete} style={styles.iconOnlyButton}>
                <Icons.Trash width={20} height={20} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryAction} onPress={() => Alert.alert('Noted', 'We will use this item less often in future outfit mixes.')}>
                <Text style={styles.lessUsedText}>Less used</Text>
                <Text style={styles.lessUsedIcon}>-</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.secondaryAction} onPress={openEditMenu} disabled={item.isSystem || saving}>
              <Text style={[styles.editText, item.isSystem && styles.disabledText]}>Edit</Text>
              <Text style={[styles.editIcon, item.isSystem && styles.disabledText]}>*</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetSurface>

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
                  {item[editingField as keyof Item] === option ? <Text style={styles.checkedIcon}>x</Text> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaSurfaceSoft,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.figmaSurfaceSoft,
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
  backGlyph: {
    fontSize: 34,
    lineHeight: 34,
    color: theme.colors.figmaAction,
    marginTop: -2,
  },
  imageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 14,
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
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaTextMuted,
  },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  details: {
    gap: 8,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#536173',
  },
  actionBlock: {
    marginTop: 22,
    gap: 8,
  },
  bottomRow: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconOnlyButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAction: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  lessUsedText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaRed,
  },
  lessUsedIcon: {
    color: theme.colors.figmaRed,
    fontSize: 24,
    lineHeight: 24,
  },
  editText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaAction,
  },
  editIcon: {
    color: theme.colors.figmaAction,
    fontSize: 18,
    lineHeight: 18,
  },
  disabledText: {
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
    ...theme.typography.aliases.manropeBody,
    color: theme.colors.figmaAction,
  },
  modalClose: {
    ...theme.typography.aliases.manropeBody,
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
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaAction,
  },
  checkedIcon: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaAction,
  },
});
