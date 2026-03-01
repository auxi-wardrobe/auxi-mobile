import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { CategoryTabs } from '../components/features/CategoryTabs';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { theme } from '../theme/theme';
import { wardrobeService, WardrobeItem } from '../services/wardrobeService';

const { width: screenWidth } = Dimensions.get('window');

const FILTER_TABS = ['All', 'Tops', 'Bottoms', 'Shoes', 'One-piece', 'AC'] as const;
type FilterTab = (typeof FILTER_TABS)[number];

const HORIZONTAL_PADDING = 24;
const GRID_GAP = 4;
const TILE_WIDTH = (screenWidth - HORIZONTAL_PADDING * 2 - GRID_GAP * 3) / 4;
const TILE_HEIGHT = TILE_WIDTH * (4 / 3);

const resolveItemTab = (category?: string): FilterTab => {
  const normalized = category?.trim().toLowerCase() || '';

  if (!normalized) {
    return 'AC';
  }

  if (
    normalized.includes('shoe') ||
    normalized.includes('sneaker') ||
    normalized.includes('heel') ||
    normalized.includes('boot')
  ) {
    return 'Shoes';
  }

  if (
    normalized.includes('bottom') ||
    normalized.includes('pant') ||
    normalized.includes('trouser') ||
    normalized.includes('jean') ||
    normalized.includes('skirt') ||
    normalized.includes('short')
  ) {
    return 'Bottoms';
  }

  if (
    normalized.includes('dress') ||
    normalized.includes('one-piece') ||
    normalized.includes('one piece') ||
    normalized.includes('one_piece') ||
    normalized.includes('jumpsuit') ||
    normalized.includes('romper')
  ) {
    return 'One-piece';
  }

  if (
    normalized === 'ac' ||
    normalized.includes('accessor') ||
    normalized.includes('bag') ||
    normalized.includes('belt') ||
    normalized.includes('hat') ||
    normalized.includes('jewel')
  ) {
    return 'AC';
  }

  return 'Tops';
};

const resolveUploadCategory = (selectedTab: FilterTab): string | undefined => {
  switch (selectedTab) {
    case 'Tops':
      return 'top';
    case 'Bottoms':
      return 'bottom';
    case 'Shoes':
      return 'shoes';
    case 'One-piece':
      return 'one_piece';
    case 'AC':
      return 'accessory';
    case 'All':
    default:
      return undefined;
  }
};

export const WardrobeScreen = () => {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<FilterTab>('All');

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await wardrobeService.getWardrobeItems();
      setItems(data);
    } catch (error) {
      console.error('Error fetching wardrobe items', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleImageSelection = async (type: 'camera' | 'gallery') => {
    setModalVisible(false);

    setTimeout(async () => {
      const options = {
        mediaType: 'photo' as const,
        selectionLimit: 1,
      };

      const result = type === 'camera' ? await launchCamera(options) : await launchImageLibrary(options);

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Failed to pick image');
        return;
      }

      if (result.assets?.length) {
        try {
          setUploading(true);
          await wardrobeService.uploadWardrobeItem(
            result.assets[0],
            resolveUploadCategory(selectedTab),
          );
          await fetchItems();
        } catch (error) {
          console.error('Upload error', error);
          Alert.alert('Error', 'Failed to upload item');
        } finally {
          setUploading(false);
        }
      }
    }, 350);
  };

  const filteredItems = useMemo(() => {
    if (selectedTab === 'All') {
      return items;
    }

    return items.filter((item) => resolveItemTab(item.category) === selectedTab);
  }, [items, selectedTab]);

  return (
    <SafeAreaView style={styles.container}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <Header
        title="Wardrobe"
        onBack={() => setIsSidebarOpen(true)}
        rightComponent={(
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            disabled={uploading}
            style={styles.plusButton}
            activeOpacity={0.85}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={theme.colors.figmaAction} />
            ) : (
              <Text style={styles.plusGlyph}>+</Text>
            )}
          </TouchableOpacity>
        )}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <CategoryTabs
          categories={[...FILTER_TABS]}
          selectedCategory={selectedTab}
          onSelectCategory={(category) => setSelectedTab(category as FilterTab)}
        />

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.colors.figmaAction} />
          </View>
        ) : filteredItems.length ? (
          <View style={styles.grid}>
            {filteredItems.map((item) => (
              <View key={item.id} style={styles.tile}>
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.tileImage}
                  resizeMode="contain"
                />

                <View style={styles.tileBadgeWrap}>
                  <View style={styles.tileBadge}>
                    <Text numberOfLines={1} style={styles.tileBadgeText}>
                      common items
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No items in this category yet</Text>
            <Text style={styles.emptySubtitle}>
              Use the plus button to add a piece and start filling this section.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add New Item</Text>

                <TouchableOpacity
                  style={styles.modalAction}
                  onPress={() => handleImageSelection('camera')}
                >
                  <Text style={styles.modalActionText}>Take a photo</Text>
                </TouchableOpacity>

                <View style={styles.modalDivider} />

                <TouchableOpacity
                  style={styles.modalAction}
                  onPress={() => handleImageSelection('gallery')}
                >
                  <Text style={styles.modalActionText}>Upload from gallery</Text>
                </TouchableOpacity>

                <View style={styles.modalDivider} />

                <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
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
    backgroundColor: theme.colors.figmaBackground,
  },
  plusButton: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusGlyph: {
    color: theme.colors.figmaAction,
    fontSize: 28,
    lineHeight: 28,
    marginTop: -2,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 32,
  },
  loadingState: {
    minHeight: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  tile: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: theme.borderRadius.l,
    overflow: 'hidden',
    backgroundColor: '#ECE6F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileBadgeWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  tileBadge: {
    minWidth: 58,
    maxWidth: TILE_WIDTH - 8,
    height: 19,
    paddingHorizontal: 12,
    borderTopLeftRadius: theme.borderRadius.m,
    borderTopRightRadius: theme.borderRadius.m,
    backgroundColor: 'rgba(39, 42, 50, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileBadgeText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 8,
    lineHeight: 12,
    color: theme.colors.white,
  },
  emptyState: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    ...theme.typography.aliases.manropeBody,
    color: theme.colors.figmaAction,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(25, 27, 34, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.figmaSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 34,
  },
  modalTitle: {
    ...theme.typography.aliases.manropeBody,
    textAlign: 'center',
    color: theme.colors.figmaAction,
    marginBottom: 16,
  },
  modalAction: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionText: {
    ...theme.typography.aliases.manropeBody,
    color: theme.colors.figmaAction,
  },
  modalDivider: {
    height: 1,
    backgroundColor: theme.colors.figmaDivider,
  },
  modalCancel: {
    marginTop: 8,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    ...theme.typography.aliases.manropeBody,
    color: theme.colors.figmaRed,
  },
});
