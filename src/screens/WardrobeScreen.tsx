import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { MacgieLoader } from '../components/macgie';
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
import { ItemReadySnackbar } from '../components/feedback/ItemReadySnackbar';
import { BottomSheetSurface } from '../components/primitives/FigmaPrimitives';
import { PressableScale } from '../components/primitives/PressableScale';
import { useSidebar } from '../context/SidebarContext';
import { wardrobeService, WardrobeItem } from '../services/wardrobeService';
import { theme } from '../theme/theme';
import { motion, useReducedMotion } from '../theme/motion';
import { useAuth } from '../context/AuthContext';
import { AppStackParamList } from '../types/navigation';
import { resolveItemImage } from '../utils/url';
import { Icons } from '../assets/icons';
import { track } from '../services/analytics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

// AU-361: items are uploaded then processed (bg-removal + auto-tagging) in the
// background. `is_preparing` flips true→false when processing finishes and the
// item becomes ready to use. The grid renders a "preparing" overlay while true.
const isPreparing = (item: WardrobeItem): boolean => item.is_preparing === true;

// While any item is still preparing we poll the wardrobe so the ready
// transition can actually be observed (the screen otherwise only refetches on
// focus). Kept light: a single refetch every few seconds, stopped once nothing
// is preparing.
const PREPARING_POLL_MS = 4000;

// AU-361: how long the self-controlled "item ready" snackbar stays on screen
// before auto-hiding.
const READY_SNACKBAR_MS = 4000;

export const WardrobeScreen = () => {
  const navigation = useNavigation<ScreenNavigation>();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { open: openSidebar } = useSidebar();

  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  // F7: distinguish a genuine empty wardrobe from a failed load. `loadError`
  // is set on a (non-silent) fetch failure so the screen shows a dedicated
  // error state + Retry rather than the misleading "add your first item" copy.
  const [loadError, setLoadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingPhotoUri, setUploadingPhotoUri] = useState<string | null>(
    null,
  );
  const [selectedTab, setSelectedTab] = useState<FilterTab>('All');
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  // F1: drive the add-item sheet with the canonical asymmetric motion (OPEN
  // medium/enter, CLOSE normal/exit) + reduce-motion fallback, mirroring
  // ContextChipsModal / MoodFeedbackSheet. `addSheetMounted` keeps the Modal
  // rendered through the close animation; `addSheetSlide` is the translateY.
  const [addSheetMounted, setAddSheetMounted] = useState(false);
  const addSheetSlide = useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    if (addSheetVisible && !addSheetMounted) {
      setAddSheetMounted(true);
      return;
    }

    if (addSheetVisible) {
      if (reducedMotion) {
        addSheetSlide.setValue(0);
        return;
      }
      addSheetSlide.setValue(screenHeight);
      Animated.timing(addSheetSlide, {
        toValue: 0,
        duration: motion.duration.medium,
        easing: motion.easing.enter,
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!addSheetMounted) {
      return;
    }

    if (reducedMotion) {
      setAddSheetMounted(false);
      return;
    }
    Animated.timing(addSheetSlide, {
      toValue: screenHeight,
      duration: motion.duration.normal,
      easing: motion.easing.exit,
      useNativeDriver: true,
    }).start(() => {
      setAddSheetMounted(false);
    });
  }, [addSheetVisible, addSheetMounted, addSheetSlide, reducedMotion]);

  // AU-361: item-ready snackbar. `preparingIdsRef` holds IDs that were still
  // preparing on the previous fetch; `readyToastedIdsRef` dedups so an item
  // only ever fires one "ready" snackbar per session even across
  // refetches/polls.
  const preparingIdsRef = useRef<Set<string>>(new Set());
  const readyToastedIdsRef = useRef<Set<string>>(new Set());

  // AU-361: self-controlled in-screen snackbar state. The library's
  // custom-config render path never mounted the snackbar, so we render it
  // ourselves as an absolute overlay (see ItemReadySnackbar). `snackbarTimerRef`
  // holds the auto-hide timeout so it can be cleared on re-trigger / unmount.
  const [readySnackbarVisible, setReadySnackbarVisible] = useState(false);
  const [readySnackbarMessage, setReadySnackbarMessage] = useState('');
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showReadySnackbar = useCallback((message: string) => {
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
    }
    setReadySnackbarMessage(message);
    setReadySnackbarVisible(true);
    snackbarTimerRef.current = setTimeout(() => {
      setReadySnackbarVisible(false);
      snackbarTimerRef.current = null;
    }, READY_SNACKBAR_MS);
  }, []);

  // Clear any pending auto-hide timer on unmount.
  useEffect(
    () => () => {
      if (snackbarTimerRef.current) {
        clearTimeout(snackbarTimerRef.current);
      }
    },
    [],
  );

  // AU-361: detect preparing→ready transitions and surface the toast once per
  // item. Compares this fetch against the prior fetch's preparing set.
  const reconcileReadyItems = useCallback(
    (data: WardrobeItem[]) => {
      const prevPreparing = preparingIdsRef.current;
      const nextPreparing = new Set<string>();

      for (const item of data) {
        if (!item.id) {
          continue;
        }
        if (isPreparing(item)) {
          nextPreparing.add(item.id);
          continue;
        }
        // Item is ready now. Toast only if it was preparing last fetch and
        // hasn't been toasted yet (dedup across polls/refocus).
        if (
          prevPreparing.has(item.id) &&
          !readyToastedIdsRef.current.has(item.id)
        ) {
          readyToastedIdsRef.current.add(item.id);
          // Self-controlled M3 snackbar (Figma node 3915:30077) — see
          // ItemReadySnackbar. The library's custom-config render path never
          // mounted, so we drive an in-screen overlay instead. Visual only; the
          // transition-detection / dedup / analytics logic is unchanged.
          showReadySnackbar(t('wardrobe.list.item_ready_title'));
          const readyProps: Record<string, unknown> = {};
          if (item.category) {
            readyProps.item_category = item.category;
          }
          track('item_ready_toast_shown', readyProps);
        }
      }

      preparingIdsRef.current = nextPreparing;
    },
    [t, showReadySnackbar],
  );

  // `silent` skips the skeleton spinner — used by the AU-361 background poll so
  // it doesn't flash the loading grid on every tick.
  const fetchItems = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        if (!options?.silent) {
          setLoading(true);
          setLoadError(false);
        }
        const category = resolveFilterQuery(selectedTab);
        const data = category
          ? await wardrobeService.filterWardrobeItems({ category })
          : await wardrobeService.getWardrobeItems();
        setItems(data);
        reconcileReadyItems(data);
      } catch (error) {
        console.error('Error fetching wardrobe items', error);
        if (!options?.silent) {
          // F7: surface a dedicated, recoverable error state (icon + message +
          // Retry) instead of falling through to the empty-wardrobe copy. The
          // toast stays as the transient confirmation; the inline state is the
          // journey-continuity fix.
          setLoadError(true);
          track('wardrobe_load_failed', { category: selectedTab });
          Toast.show({
            type: 'error',
            text1: t('common.load_wardrobe_failed_title'),
            text2: t('common.try_again_moment'),
            position: 'bottom',
          });
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [selectedTab, t, reconcileReadyItems],
  );

  const handleRetryLoad = useCallback(() => {
    track('wardrobe_load_retry_tapped', { category: selectedTab });
    fetchItems();
  }, [fetchItems, selectedTab]);

  useEffect(() => {
    if (isFocused) {
      fetchItems();
      track('wardrobe_viewed', { category: selectedTab });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchItems, isFocused]);

  // AU-361: while focused AND any item is still preparing, poll the wardrobe so
  // the preparing→ready transition is observed and the toast fires. Stops as
  // soon as nothing is preparing or the screen loses focus.
  const hasPreparingItems = items.some(isPreparing);
  useEffect(() => {
    if (!isFocused || !hasPreparingItems) {
      return;
    }
    const interval = setInterval(() => {
      fetchItems({ silent: true });
    }, PREPARING_POLL_MS);
    return () => clearInterval(interval);
  }, [isFocused, hasPreparingItems, fetchItems]);

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
        if (type === 'camera') {
          track('wardrobe_photo_captured', { source: 'add_item' });
        }

        const createdItem = await wardrobeService.uploadWardrobeItem(
          asset,
          user!,
          resolveFilterQuery(selectedTab),
        );

        track('add_item_upload_succeeded', { source: type });
        const addedProps: Record<string, unknown> = {
          source: type,
          method: 'take_photo',
        };
        if (createdItem?.id) {
          addedProps.item_id = createdItem.id;
        }
        if (createdItem?.category) {
          addedProps.category = createdItem.category;
        }
        track('wardrobe_item_added', addedProps);
        // AU-372: surface add-success via the mint M3 ItemReadySnackbar overlay
        // (same component as the ready moment), not the default bottom toast.
        // Copy reads "Item added. We'll finish preparing it in the background."
        showReadySnackbar(t('wardrobe.list.added_title'));

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
      <PressableScale
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
            <Text style={styles.tilePreparingText}>
              {t('wardrobe.list.preparing_tile')}
            </Text>
          </View>
        ) : null}

        {/* AU-351: "New" exploration badge — top-left overlay so it never
            collides with the bottom-centre common badge or the centred
            preparing overlay. */}
        {item.is_exploration_item ? (
          <View
            style={styles.tileNewBadge}
            testID={`wardrobe-item-new-${item.id}`}
            accessibilityLabel={t('wardrobe.new_badge')}
          >
            <Text numberOfLines={1} style={styles.tileNewBadgeText}>
              {t('wardrobe.new_badge')}
            </Text>
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
      </PressableScale>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title={t('wardrobe.list.title')}
        titleTextStyle={styles.headerTitle}
        leftIconStyle={styles.headerIconButton}
        onBack={openSidebar}
        rightComponent={
          <PressableScale
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
          </PressableScale>
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
        ) : loadError ? (
          // F7: failed load → dedicated error state with Retry, distinct from
          // the genuine empty-wardrobe copy below.
          <View style={styles.errorState} testID="wardrobe-error-state">
            <Text style={styles.errorTitle}>
              {t('common.load_wardrobe_failed_title')}
            </Text>
            <Text style={styles.errorBody}>
              {t('wardrobe.list.error_body')}
            </Text>
            <PressableScale
              style={styles.errorRetry}
              activeOpacity={0.82}
              onPress={handleRetryLoad}
              testID="wardrobe-error-retry"
              accessibilityRole="button"
              accessibilityLabel={t('common.a11y_retry_load')}
            >
              <Text style={styles.errorRetryLabel}>{t('common.retry')}</Text>
            </PressableScale>
          </View>
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
            <PressableScale
              style={styles.emptyCta}
              activeOpacity={0.85}
              onPress={() => openAddSheet('empty_state')}
              testID="wardrobe-empty-add-btn"
              accessibilityLabel={t('common.a11y_add_item')}
            >
              <Text style={styles.emptyCtaText}>
                {t('wardrobe.list.add_an_item')}
              </Text>
            </PressableScale>
          </View>
        )}
      </ScrollView>

      {/* Add item — bottom sheet (Figma node 2852:19750). F1: canonical
          asymmetric motion (OPEN medium/enter, CLOSE normal/exit) +
          reduce-motion fallback via addSheetSlide, mirroring
          ContextChipsModal / MoodFeedbackSheet. `animationType="none"` —
          the slide is driven by Animated, not the platform. */}
      <Modal
        accessibilityLabel="add-item-modal"
        visible={addSheetMounted}
        onRequestClose={() => setAddSheetVisible(false)}
        animationType="none"
        transparent
      >
        <TouchableWithoutFeedback onPress={() => setAddSheetVisible(false)}>
          <View style={styles.sheetOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <Animated.View
                style={[
                  styles.addSheetAnim,
                  { paddingBottom: insets.bottom },
                  { transform: [{ translateY: addSheetSlide }] },
                ]}
              >
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
                    isLast
                  />
                </BottomSheetSurface>
              </Animated.View>
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
            <MacgieLoader
              variant="inline"
              size={40}
              testID="wardrobe-preparing-macgie"
            />
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

      {/* AU-361: self-controlled "item ready" snackbar overlay. Sits above the
          grid near the bottom (Figma node 3915:30077). Informational only, so
          pointerEvents="none" keeps touches passing through to the grid. */}
      {readySnackbarVisible ? (
        <View
          style={[
            styles.readySnackbarOverlay,
            // F6: respect the home-indicator inset so the snackbar never sits
            // behind it. 24 is the design gap above the safe area.
            { bottom: insets.bottom + 24 },
          ]}
          pointerEvents="none"
          testID="wardrobe-item-ready-snackbar-overlay"
        >
          <ItemReadySnackbar message={readySnackbarMessage} />
        </View>
      ) : null}
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
  <PressableScale
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
  </PressableScale>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  // AU-361: bottom-anchored, centred overlay for the item-ready snackbar.
  // High zIndex/elevation so it floats above the grid; the inner snackbar
  // carries its own width + styling.
  readySnackbarOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    // `bottom` is supplied inline (insets.bottom + 24) so it respects the
    // home-indicator safe area — see F6.
    alignItems: 'center',
    zIndex: theme.zIndex.toast,
    elevation: 1000,
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
    borderRadius: 16,
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
  // AU-351: "New" exploration pill — top-left, token-styled (accent fill so it
  // reads distinctly from the bottom common badge), no hex literals.
  tileNewBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: theme.spacing.uacDimension8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.figmaAction,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileNewBadgeText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.white,
  },
  tileBadge: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 9999,
    // F5: reuse the existing token instead of re-inlining the rgba duplicate
    // (figmaCardTag === rgba(18,18,18,0.75), theme.ts:23). DRY.
    backgroundColor: theme.colors.figmaCardTag,
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
  // F7: error state — distinct from empty, with a Retry CTA. Mirrors the
  // HomeScreen error-state layout/tokens for cross-screen consistency.
  errorState: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 56,
    alignItems: 'center',
  },
  errorTitle: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
    textAlign: 'center',
  },
  errorBody: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
  errorRetry: {
    marginTop: 20,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.figmaText,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRetryLabel: {
    ...theme.typography.aliases.interMediumSm,
    color: theme.colors.figmaText,
  },
  // Add-item bottom sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(18, 18, 18, 0.4)',
  },
  // F1/F6: wraps BottomSheetSurface so the slide transform + safe-area bottom
  // inset live outside the surface's own padding.
  addSheetAnim: {
    width: '100%',
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
