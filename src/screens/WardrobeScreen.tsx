import React, { useCallback, useEffect, useState } from 'react';
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
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import {
  launchCamera,
  launchImageLibrary,
  Asset,
} from 'react-native-image-picker';
import { CategoryTabs } from '../components/features/CategoryTabs';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { BottomSheetSurface } from '../components/primitives/FigmaPrimitives';
import { wardrobeService, WardrobeItem } from '../services/wardrobeService';
import { theme } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { AppStackParamList } from '../types/navigation';
import { resolveItemImage } from '../utils/url';
import { Icons } from '../assets/icons';
import { track } from '../services/analytics';

const { width: screenWidth } = Dimensions.get('window');

// Wardrobe filter chips — design order (node 3234:17793).
const FILTER_TABS = [
  'All',
  'Top',
  'Bottoms',
  'One-Piece',
  'Shoes',
  'Ac',
] as const;
type FilterTab = (typeof FILTER_TABS)[number];

// Grid — Figma node 2850:16492: 3 columns, 24px side padding, 4px gaps, 3:4 tiles.
const HORIZONTAL_PADDING = 24;
const GRID_GAP = 4;
const GRID_COLUMNS = 3;
const TILE_WIDTH =
  (screenWidth - HORIZONTAL_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) /
  GRID_COLUMNS;
const TILE_HEIGHT = TILE_WIDTH * (4 / 3);

type ScreenNavigation = NativeStackNavigationProp<
  AppStackParamList,
  'Wardrobe'
>;

const resolveFilterQuery = (selectedTab: FilterTab): string | undefined => {
  switch (selectedTab) {
    case 'Top':
      return 'top';
    case 'Bottoms':
      return 'bottom';
    case 'Shoes':
      return 'shoes';
    case 'One-Piece':
      return 'one_piece';
    case 'Ac':
      return 'accessory';
    case 'All':
    default:
      return undefined;
  }
};

const isCommonItem = (item: WardrobeItem): boolean =>
  item.is_common_item === true ||
  item.user_id === null ||
  item.user_id === undefined;

export const WardrobeScreen = () => {
  const navigation = useNavigation<ScreenNavigation>();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingPhotoUri, setUploadingPhotoUri] = useState<string | null>(
    null,
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<FilterTab>('All');
  const [addSheetVisible, setAddSheetVisible] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const category = resolveFilterQuery(selectedTab);
      const data = category
        ? await wardrobeService.filterWardrobeItems({ category })
        : await wardrobeService.getWardrobeItems();
      setItems(data);
    } catch (error) {
      console.error('Error fetching wardrobe items', error);
      Toast.show({
        type: 'error',
        text1: t('common.load_wardrobe_failed_title'),
        text2: t('common.try_again_moment'),
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedTab, t]);

  useEffect(() => {
    if (isFocused) {
      fetchItems();
      track('wardrobe_viewed', { category: selectedTab });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchItems, isFocused]);

  const handleSelectTab = (category: FilterTab) => {
    setSelectedTab(category);
    track('wardrobe_filter_changed', { category });
  };

  const handleItemPress = (item: WardrobeItem) => {
    track('wardrobe_item_opened', {
      item_id: item.id,
      is_common: isCommonItem(item),
    });
    navigation.navigate('ItemDetail', { itemId: item.id });
  };

  const openAddSheet = (source: 'header' | 'empty_state') => {
    track('add_item_opened', { source });
    setAddSheetVisible(true);
  };

  const handleSearchDatabase = () => {
    track('add_item_method_selected', { method: 'search_database' });
    setAddSheetVisible(false);
    navigation.navigate('Database');
  };

  const handleImportFromWeb = () => {
    track('add_item_method_selected', { method: 'import_web' });
    Toast.show({
      type: 'info',
      text1: t('common.coming_soon'),
      text2: t('wardrobe.list.coming_soon_body'),
      position: 'bottom',
    });
  };

  const handleImageSelection = async (type: 'camera' | 'gallery') => {
    setAddSheetVisible(false);

    setTimeout(async () => {
      const options = {
        mediaType: 'photo' as const,
        selectionLimit: 1,
      };

      const result =
        type === 'camera'
          ? await launchCamera(options)
          : await launchImageLibrary(options);

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert(
          t('common.error_title'),
          result.errorMessage || t('common.pick_image_failed'),
        );
        return;
      }

      const asset: Asset | undefined = result.assets?.[0];
      if (!asset) {
        return;
      }

      try {
        setUploadingPhotoUri(asset.uri ?? null);
        setUploading(true);
        track('add_item_upload_started', { source: type });

        await wardrobeService.uploadWardrobeItem(
          asset,
          user!,
          resolveFilterQuery(selectedTab),
        );

        track('add_item_upload_succeeded', { source: type });
        Toast.show({
          type: 'success',
          text1: t('wardrobe.list.added_title'),
          position: 'bottom',
        });

        await fetchItems();
      } catch (error) {
        console.error('Upload error', error);
        track('add_item_upload_failed', { source: type });
        Toast.show({
          type: 'error',
          text1: t('wardrobe.list.upload_failed_title'),
          text2: t('wardrobe.list.upload_failed_body'),
          position: 'bottom',
        });
      } finally {
        setUploading(false);
        setUploadingPhotoUri(null);
      }
    }, 250);
  };

  const handleTakePhoto = () => {
    track('add_item_method_selected', { method: 'take_photo' });
    setAddSheetVisible(false);
    setTimeout(() => {
      Alert.alert(
        t('wardrobe.list.add_photo_title'),
        t('wardrobe.list.add_photo_body'),
        [
          {
            text: t('common.take_photo'),
            onPress: () => handleImageSelection('camera'),
          },
          {
            text: t('common.choose_from_library'),
            onPress: () => handleImageSelection('gallery'),
          },
          { text: t('common.cancel'), style: 'cancel' },
        ],
      );
    }, 250);
  };

  const renderGridTile = (item: WardrobeItem, index: number) => {
    const imageUrl = resolveItemImage({
      image_png: item.image_png ?? null,
      image_url: item.image_url ?? '',
    });

    // qa-ui: the first tile gets a stable `wardrobe-item-first` testID so
    // Maestro flows can deterministically open the first item without relying
    // on the implicit `wardrobe-item-.*` prefix + index:0 match. Subsequent
    // tiles keep the backend-dynamic `wardrobe-item-<id>` testID (both match
    // the `wardrobe-item-.*` prefix, so existing flows still work).
    const tileTestID =
      index === 0 ? 'wardrobe-item-first' : `wardrobe-item-${item.id}`;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.tile}
        activeOpacity={0.88}
        onPress={() => handleItemPress(item)}
        testID={tileTestID}
        accessibilityLabel={item.name || t('wardrobe.list.a11y_item_fallback')}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl, cache: 'force-cache' }}
            style={styles.tileImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.tileFallback}>
            <Text style={styles.tileFallbackText}>{t('common.no_image')}</Text>
          </View>
        )}

        {item.is_preparing ? (
          <View style={styles.tilePreparingOverlay}>
            <Text style={styles.tilePreparingText}>Preparing this item</Text>
          </View>
        ) : null}

        {isCommonItem(item) ? (
          <View style={styles.tileBadgeWrap}>
            <View style={styles.tileBadge}>
              <Text numberOfLines={1} style={styles.tileBadgeText}>
                {t('common.badge_common')}
              </Text>
            </View>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderLoadingGrid = () => (
    <View style={styles.grid}>
      {Array.from({ length: 6 }).map((_, index) => (
        <View key={`skeleton-${index}`} style={styles.tileSkeleton} />
      ))}
    </View>
  );

  const hasItems = items.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <Header
        title={t('wardrobe.list.title')}
        titleTextStyle={styles.headerTitle}
        leftIconStyle={styles.headerIconButton}
        onBack={() => setIsSidebarOpen(true)}
        rightComponent={
          <TouchableOpacity
            onPress={() => openAddSheet('header')}
            disabled={uploading}
            style={[styles.plusButton, styles.headerIconButton]}
            activeOpacity={0.85}
            testID="wardrobe-add-btn"
            accessibilityLabel={t('common.a11y_add_item')}
          >
            {uploading ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.figmaAction}
              />
            ) : (
              <Icons.Plus width={24} height={24} />
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <CategoryTabs
          categories={[...FILTER_TABS]}
          selectedCategory={selectedTab}
          onSelectCategory={category => handleSelectTab(category as FilterTab)}
          wrap
        />

        {loading ? (
          renderLoadingGrid()
        ) : hasItems ? (
          <View testID="wardrobe-grid-root" style={styles.grid}>
            {items.map(renderGridTile)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {selectedTab === 'All'
                ? t('wardrobe.list.empty_first_title')
                : t('wardrobe.list.empty_filtered_title')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {selectedTab === 'All'
                ? t('wardrobe.list.empty_first_body')
                : t('wardrobe.list.empty_filtered_body')}
            </Text>
            <TouchableOpacity
              style={styles.emptyCta}
              activeOpacity={0.85}
              onPress={() => openAddSheet('empty_state')}
              testID="wardrobe-empty-add-btn"
              accessibilityLabel={t('common.a11y_add_item')}
            >
              <Text style={styles.emptyCtaText}>
                {t('wardrobe.list.add_an_item')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add item — bottom sheet (Figma node 2852:19750) */}
      <Modal
        accessibilityLabel="add-item-modal"
        visible={addSheetVisible}
        onRequestClose={() => setAddSheetVisible(false)}
        animationType="slide"
        transparent
      >
        <TouchableWithoutFeedback onPress={() => setAddSheetVisible(false)}>
          <View style={styles.sheetOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <BottomSheetSurface style={styles.addSheet}>
                <Text style={styles.addSheetTitle}>
                  {t('wardrobe.list.add_item_sheet_title')}
                </Text>
                <Text style={styles.addSheetSubtitle}>
                  {t('wardrobe.list.add_item_sheet_subtitle')}
                </Text>

                <AddMethodRow
                  icon={
                    <Icons.Database
                      width={24}
                      height={24}
                      color={theme.colors.uacBackgroundBase}
                    />
                  }
                  title={t('wardrobe.list.method_search_title')}
                  description={t('wardrobe.list.method_search_desc')}
                  onPress={handleSearchDatabase}
                  testID="wardrobe-add-search"
                />
                <AddMethodRow
                  icon={
                    <Icons.Camera
                      width={24}
                      height={24}
                      color={theme.colors.uacBackgroundBase}
                    />
                  }
                  title={t('common.take_photo')}
                  description={t('wardrobe.list.method_photo_desc')}
                  onPress={handleTakePhoto}
                  testID="wardrobe-add-photo"
                />
                <AddMethodRow
                  icon={
                    <Icons.Globe
                      width={24}
                      height={24}
                      color={theme.colors.uacBackgroundBase}
                    />
                  }
                  title={t('wardrobe.list.method_web_title')}
                  description={t('wardrobe.list.method_web_desc')}
                  onPress={handleImportFromWeb}
                  testID="wardrobe-add-import"
                  isLast
                />
              </BottomSheetSurface>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* AI processing overlay (Figma node 2852:20021) */}
      <Modal visible={uploading} transparent animationType="fade">
        <View style={styles.preparingContainer}>
          <View style={styles.preparingPhotoWrap}>
            {uploadingPhotoUri ? (
              <Image
                source={{ uri: uploadingPhotoUri }}
                style={styles.preparingPhoto}
                resizeMode="contain"
              />
            ) : null}
          </View>
          <View style={styles.preparingPanel}>
            <ActivityIndicator size="small" color={theme.colors.figmaAction} />
            <Text style={styles.preparingTitle}>
              {t('wardrobe.list.preparing_title')}
            </Text>
            <Text style={styles.preparingStep}>
              {'• '}
              {t('wardrobe.list.preparing_step1')}
            </Text>
            <Text style={styles.preparingStep}>
              {'• '}
              {t('wardrobe.list.preparing_step2')}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

interface AddMethodRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
  testID: string;
  isLast?: boolean;
}

const AddMethodRow: React.FC<AddMethodRowProps> = ({
  icon,
  title,
  description,
  onPress,
  testID,
  isLast,
}) => (
  <TouchableOpacity
    style={[styles.methodRow, !isLast && styles.methodRowDivider]}
    activeOpacity={0.7}
    onPress={onPress}
    testID={testID}
    accessibilityLabel={title}
  >
    <View style={styles.methodIcon}>{icon}</View>
    <View style={styles.methodTexts}>
      <Text style={styles.methodTitle}>{title}</Text>
      <Text style={styles.methodDescription}>{description}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  headerTitle: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
  },
  plusButton: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconButton: {
    backgroundColor: theme.colors.figmaSurface,
    borderRadius: 14,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 32,
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
    borderRadius: theme.borderRadius.figmaTile,
    overflow: 'hidden',
    backgroundColor: theme.colors.figmaDetailSurface,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tileFallbackText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
  tileBadgeWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    alignItems: 'center',
  },
  tileBadge: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 9999,
    backgroundColor: 'rgba(18, 18, 18, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileBadgeText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.white,
  },
  tilePreparingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tilePreparingText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.figmaTextPrimary,
    textAlign: 'center',
  },
  tileSkeleton: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: theme.borderRadius.figmaTile,
    backgroundColor: theme.colors.figmaDetailSurface,
  },
  emptyState: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 56,
    alignItems: 'center',
  },
  emptyTitle: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
  emptyCta: {
    marginTop: 20,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.uacBackgroundBase,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaText: {
    ...theme.typography.aliases.interMediumSm,
    color: theme.colors.white,
  },
  // Add-item bottom sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(18, 18, 18, 0.4)',
  },
  addSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  addSheetTitle: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
  },
  addSheetSubtitle: {
    ...theme.typography.aliases.interBodyMd,
    color: theme.colors.figmaTextPrimary,
    marginTop: 2,
    marginBottom: 8,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
  },
  methodRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.figmaListDivider,
  },
  methodIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTexts: {
    flex: 1,
  },
  methodTitle: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
  },
  methodDescription: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    marginTop: 2,
  },
  // AI processing overlay
  preparingContainer: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  preparingPhotoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
    paddingHorizontal: 24,
  },
  preparingPhoto: {
    width: '100%',
    height: '100%',
  },
  preparingPanel: {
    backgroundColor: theme.colors.figmaDetailSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  preparingTitle: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
    marginTop: 4,
  },
  preparingStep: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
});
