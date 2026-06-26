import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  ImageSourcePropType,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  NavigationAction,
  RouteProp,
  useFocusEffect,
  useRoute,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppStackParamList } from '../types/navigation';
import { theme } from '../theme/theme';
import { motion } from '../theme/motion';
import {
  CanvasItemData,
  OutfitCanvasSurface,
} from '../components/features/OutfitCanvasSurface';
import { seedCanvasLayout } from '../components/features/collage-seed-layout';
import { wardrobeService, WardrobeItem } from '../services/wardrobeService';
import { CategoryTabs } from '../components/features/CategoryTabs';
import { PillButton } from '../components/primitives/FigmaPrimitives';
import { getImageUrl } from '../utils/url';
import { useSidebar } from '../context/SidebarContext';
import { useCreationsSeen } from '../context/CreationsSeenContext';
import { track } from '../services/analytics';
import {
  CREATIONS_QUERY_KEY,
  CreationItem,
  creationsService,
} from '../services/creationsService';
import {
  requestCanvasExit,
  setCanvasExitGuard,
} from '../navigation/canvasExitGuard';
import { DiscardCreationDialog } from './canvas/DiscardCreationDialog';
import { ItemReadySnackbar } from '../components/feedback/ItemReadySnackbar';
import IconChevronLeft from '../assets/images/icon_chevron_left.svg';
import IconMenu from '../assets/images/icon_menu.svg';
import IconMyCreation from '../assets/images/icon_my_creation.svg';
import IconCanvasUndo from '../assets/images/canvas-icons/undo.svg';
import IconCanvasRedo from '../assets/images/canvas-icons/redo.svg';
import IconCanvasAdd from '../assets/images/canvas-icons/add.svg';
import IconCanvasLayerUp from '../assets/images/canvas-icons/layer_up.svg';
import IconCanvasLayerDown from '../assets/images/canvas-icons/layer_down.svg';
import IconCanvasDuplicate from '../assets/images/canvas-icons/duplicate.svg';
import IconCanvasSwap from '../assets/images/canvas-icons/swap.svg';
import IconCanvasDelete from '../assets/images/canvas-icons/trash.svg';

// Test image for canvas preview
const testJeansImg = require('../assets/images/test_jeans.png');

type Props = NativeStackScreenProps<AppStackParamList, 'OutfitCanvas'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Figma "remix" frame (node 2852:16582): the canvas card "Image 3:4" is an
// inset rounded card sitting inside the body's 12px horizontal padding
// (theme.spacing.uacDimension12 each side), aspect 3:4 (height = width × 4/3).
const CANVAS_WIDTH = SCREEN_WIDTH - 2 * theme.spacing.uacDimension12;
const CANVAS_HEIGHT = (CANVAS_WIDTH * 4) / 3;
const ITEM_DEFAULT_SIZE = 160;

// How long the "Saved to My Creations" success snackbar stays up (mirrors
// Wardrobe's READY_SNACKBAR_MS).
const SAVED_SNACKBAR_MS = 4000;

// Pull a serializable URI out of a canvas item's imageSource for persistence.
// Remote/picked items are `{ uri }`; require()'d mock assets are numbers (no
// URI) and return undefined so the caller can skip them.
const extractUri = (source: ImageSourcePropType): string | undefined => {
  if (
    source &&
    typeof source === 'object' &&
    !Array.isArray(source) &&
    typeof (source as { uri?: unknown }).uri === 'string'
  ) {
    return (source as { uri: string }).uri;
  }
  return undefined;
};

const PICKER_COLUMNS = 3;
const PICKER_GAP = 4;
const PICKER_TILE =
  (SCREEN_WIDTH - 32 - PICKER_GAP * (PICKER_COLUMNS - 1)) / PICKER_COLUMNS;
const PICKER_TILE_HEIGHT = PICKER_TILE * (4 / 3);

const PICKER_FILTER_TABS = [
  'All',
  'Tops',
  'Bottoms',
  'Shoes',
  'One-piece',
  'AC',
] as const;
type PickerFilterTab = (typeof PICKER_FILTER_TABS)[number];

const resolvePickerCategory = (tab: PickerFilterTab): string | undefined => {
  switch (tab) {
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
    default:
      return undefined;
  }
};

type HistorySnapshot = CanvasItemData[];

const INITIAL_MOCK_ITEMS: CanvasItemData[] = [];

// --- Item picker panel (slides in from right) ---
interface ItemPickerPanelProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (items: WardrobeItem[]) => void;
}

const ItemPickerPanel: React.FC<ItemPickerPanelProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const slideX = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const [selectedTab, setSelectedTab] = useState<PickerFilterTab>('All');
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    Animated.timing(slideX, {
      toValue: visible ? 0 : SCREEN_WIDTH,
      duration: motion.duration.medium,
      easing: motion.easing.standard,
      useNativeDriver: true,
    }).start();
    if (!visible) {
      setSelectedIds([]);
    }
  }, [visible, slideX]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    const category = resolvePickerCategory(selectedTab);
    wardrobeService
      .filterWardrobeItems({ category })
      .then(data => {
        if (!cancelled) {
          setWardrobeItems(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWardrobeItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [visible, selectedTab]);

  const toggleItem = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const handleConfirm = () => {
    const chosen = wardrobeItems.filter(it => selectedIds.includes(it.id));
    onConfirm(chosen);
  };

  return (
    <Animated.View
      style={[pickerStyles.panel, { transform: [{ translateX: slideX }] }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <SafeAreaView style={pickerStyles.safeArea}>
        {/* Header */}
        <View style={pickerStyles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={pickerStyles.backBtn}
            accessibilityLabel={t('outfitCanvas.a11y_close_picker')}
          >
            <IconChevronLeft width={24} height={24} />
          </TouchableOpacity>
          <Text style={pickerStyles.title}>
            {t('outfitCanvas.add_to_canvas')}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Category tabs + grid */}
        <View style={pickerStyles.body}>
          <CategoryTabs
            categories={[...PICKER_FILTER_TABS]}
            selectedCategory={selectedTab}
            onSelectCategory={tab => setSelectedTab(tab as PickerFilterTab)}
          />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={pickerStyles.scrollContent}
          >
            {loading ? (
              <ActivityIndicator style={{ marginTop: 40 }} />
            ) : wardrobeItems.length === 0 ? (
              <Text style={pickerStyles.empty}>
                {t('outfitCanvas.no_items_found')}
              </Text>
            ) : (
              <View style={pickerStyles.grid}>
                {wardrobeItems.map(item => {
                  const uri = getImageUrl(item.image_png ?? item.image_url);
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        pickerStyles.tile,
                        isSelected && pickerStyles.tileSelected,
                      ]}
                      activeOpacity={0.82}
                      onPress={() => toggleItem(item.id)}
                    >
                      {uri ? (
                        <Image
                          source={{ uri }}
                          style={pickerStyles.tileImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={pickerStyles.tileFallback}>
                          <Text style={pickerStyles.tileFallbackText}>
                            {t('common.no_image')}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>

        {/* Confirm button */}
        <View style={pickerStyles.footer}>
          <TouchableOpacity
            style={[
              pickerStyles.confirmBtn,
              selectedIds.length === 0 && pickerStyles.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            disabled={selectedIds.length === 0}
            activeOpacity={0.85}
          >
            <Text style={pickerStyles.confirmBtnLabel}>
              {selectedIds.length > 0
                ? t('outfitCanvas.add_count', { count: selectedIds.length })
                : t('outfitCanvas.add_to_canvas')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
};

// --- Tag chip ---
const TagChip = ({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.tagChip}>
      <Text style={styles.tagChipLabel}>{label}</Text>
      <Pressable
        testID={`canvas-tag-remove-${label}`}
        onPress={onRemove}
        hitSlop={8}
        style={styles.tagChipRemove}
        accessibilityLabel={t('outfitCanvas.a11y_remove_tag', { label })}
      >
        <Text style={styles.tagChipX}>×</Text>
      </Pressable>
    </View>
  );
};

// --- Toolbar button ---
const ToolbarBtn = ({
  testID,
  onPress,
  disabled,
  children,
  accessibilityLabel,
}: {
  testID: string;
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  accessibilityLabel: string;
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    disabled={disabled}
    accessibilityLabel={accessibilityLabel}
    style={({ pressed }) => [
      styles.toolbarBtn,
      disabled && styles.toolbarBtnDisabled,
      pressed && !disabled && styles.toolbarBtnPressed,
    ]}
  >
    {children}
  </Pressable>
);

// --- Main screen ---
export const OutfitCanvasScreen: React.FC<Props> = ({ navigation }) => {
  const route = useRoute<RouteProp<AppStackParamList, 'OutfitCanvas'>>();
  const { t } = useTranslation();
  const { open: openSidebar } = useSidebar();
  const { hasUnseen: hasUnseenCreations, markSaved: markCreationSaved } =
    useCreationsSeen();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  // Entered via Home's Remix button → show a back chevron (goes back to Home).
  // Entered from the sidebar drawer → show the hamburger that re-opens it.
  const fromRemix = route.params?.entry === 'remix';
  // Seed from the real outfit passed by Home's Remix button, reusing the shared
  // collage layout so pieces land in the SAME overlapping positions/sizes the
  // user just saw in Home's collage view (scaled to this canvas width). Fall
  // back to mock items only when opened without params (deep-link / dev).
  const initialItems = useRef<CanvasItemData[]>(
    route.params?.items?.length
      ? seedCanvasLayout(
          route.params.items.map(it => ({
            id: it.id,
            imageUri: it.imageUrl,
          })),
          CANVAS_WIDTH,
        )
      : INITIAL_MOCK_ITEMS,
  ).current;
  const [items, setItems] = useState<CanvasItemData[]>(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>(['Low Energy', 'Calm']);
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);

  // Unsaved-changes guard: any edit (item move/add/delete/layer, tag change)
  // flips this true; Save clears it. Drives the "Discard this creation?" sheet
  // shown when the user tries to leave with pending edits.
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [discardVisible, setDiscardVisible] = useState(false);
  // The navigation action we intercepted (back / goBack), replayed verbatim
  // once the user resolves the sheet. `proceedRef` lets that replay through the
  // beforeRemove guard without re-prompting (a ref so the live listener reads it).
  const [pendingAction, setPendingAction] = useState<NavigationAction | null>(
    null,
  );
  const proceedRef = useRef(false);
  // A push-style exit intercepted by the canvas exit guard (My Creations icon,
  // sidebar destinations that push rather than pop). Unlike `pendingAction`
  // (a NavigationAction replayed via dispatch), this is a thunk that performs
  // the navigation, replayed once the user resolves the discard sheet.
  const pendingProceedRef = useRef<(() => void) | null>(null);

  // Self-controlled success snackbar (mint M3 ItemReadySnackbar, same component
  // as Wardrobe's "item ready"): the library Toast render path is unused here,
  // so we mount it as a bottom overlay and auto-dismiss.
  const [savedSnackbarVisible, setSavedSnackbarVisible] = useState(false);
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSavedSnackbar = useCallback(() => {
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
    }
    setSavedSnackbarVisible(true);
    snackbarTimerRef.current = setTimeout(() => {
      setSavedSnackbarVisible(false);
      snackbarTimerRef.current = null;
    }, SAVED_SNACKBAR_MS);
  }, []);

  useEffect(
    () => () => {
      if (snackbarTimerRef.current) {
        clearTimeout(snackbarTimerRef.current);
      }
    },
    [],
  );

  // Undo / redo
  const history = useRef<HistorySnapshot[]>([initialItems]);
  const historyIndex = useRef(0);

  const pushHistory = useCallback((snapshot: CanvasItemData[]) => {
    const newHistory = history.current.slice(0, historyIndex.current + 1);
    newHistory.push(snapshot);
    history.current = newHistory;
    historyIndex.current = newHistory.length - 1;
    // Every history push is a user edit → mark the canvas dirty.
    setHasUnsavedChanges(true);
  }, []);

  const canUndo = historyIndex.current > 0;
  const canRedo = historyIndex.current < history.current.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo) {
      return;
    }
    historyIndex.current -= 1;
    setItems(history.current[historyIndex.current]);
    setSelectedId(null);
  }, [canUndo]);

  const handleRedo = useCallback(() => {
    if (!canRedo) {
      return;
    }
    historyIndex.current += 1;
    setItems(history.current[historyIndex.current]);
    setSelectedId(null);
  }, [canRedo]);

  // Item actions
  const handleSelect = useCallback((id: string) => {
    setSelectedId(prev => (prev === id ? null : id));
  }, []);

  const handlePositionChange = useCallback(
    (id: string, x: number, y: number) => {
      setItems(prev => {
        const next = prev.map(it => (it.id === id ? { ...it, x, y } : it));
        pushHistory(next);
        return next;
      });
    },
    [pushHistory],
  );

  const handleScaleChange = useCallback(
    (id: string, scale: number) => {
      setItems(prev => {
        const next = prev.map(it => (it.id === id ? { ...it, scale } : it));
        pushHistory(next);
        return next;
      });
    },
    [pushHistory],
  );

  const handleRotationChange = useCallback(
    (id: string, rotation: number) => {
      setItems(prev => {
        const next = prev.map(it => (it.id === id ? { ...it, rotation } : it));
        pushHistory(next);
        return next;
      });
    },
    [pushHistory],
  );

  // Move the selected item one layer in `direction` by SWAPPING its z-index with
  // the immediate neighbour in stacking order. Nudging a single item's z by ±1
  // (the old behaviour) produced ties — two items sharing a z-index don't
  // reorder deterministically, so the move was invisible. Swapping guarantees a
  // distinct, visible re-stack and keeps z-indices a stable permutation.
  const moveLayer = useCallback(
    (direction: 'forward' | 'backward') => {
      if (!selectedId) {
        return;
      }
      // Ascending z = bottom→top render order.
      const ordered = [...items].sort((a, b) => a.zIndex - b.zIndex);
      const idx = ordered.findIndex(it => it.id === selectedId);
      if (idx === -1) {
        return;
      }
      // 'forward' = toward the top (higher z) = next item up; 'backward' =
      // toward the bottom (lower z) = previous item.
      const neighbourIdx = direction === 'forward' ? idx + 1 : idx - 1;
      if (neighbourIdx < 0 || neighbourIdx >= ordered.length) {
        // Already at the front/back edge — nothing to swap with, no event.
        return;
      }
      const selZ = ordered[idx].zIndex;
      const neighbourId = ordered[neighbourIdx].id;
      const neighbourZ = ordered[neighbourIdx].zIndex;
      const next = items.map(it => {
        if (it.id === selectedId) {
          return { ...it, zIndex: neighbourZ };
        }
        if (it.id === neighbourId) {
          return { ...it, zIndex: selZ };
        }
        return it;
      });
      setItems(next);
      pushHistory(next);
      track('canvas_item_layer_reordered', { direction });
    },
    [selectedId, items, pushHistory],
  );

  const handleLayerUp = useCallback(() => moveLayer('forward'), [moveLayer]);

  const handleLayerDown = useCallback(() => moveLayer('backward'), [moveLayer]);

  const handleDuplicate = useCallback(() => {
    if (!selectedId) {
      return;
    }
    setItems(prev => {
      const source = prev.find(it => it.id === selectedId);
      if (!source) {
        return prev;
      }
      const maxZ = Math.max(...prev.map(it => it.zIndex));
      const copy: CanvasItemData = {
        ...source,
        id: `${source.id}-copy-${Date.now()}`,
        x: source.x + 20,
        y: source.y + 20,
        zIndex: maxZ + 1,
        scale: source.scale || 1,
        rotation: source.rotation || 0,
      };
      const next = [...prev, copy];
      pushHistory(next);
      return next;
    });
  }, [selectedId, pushHistory]);

  const handleDelete = useCallback(() => {
    if (!selectedId) {
      return;
    }
    setItems(prev => {
      const next = prev.filter(it => it.id !== selectedId);
      pushHistory(next);
      return next;
    });
    setSelectedId(null);
  }, [selectedId, pushHistory]);

  const handleAddItem = useCallback(() => {
    setPickerVisible(true);
  }, []);

  const handlePickerConfirm = useCallback(
    (picked: WardrobeItem[]) => {
      setPickerVisible(false);
      if (picked.length === 0) {
        return;
      }
      setItems(prev => {
        let maxZ = prev.length > 0 ? Math.max(...prev.map(it => it.zIndex)) : 0;
        const newItems: CanvasItemData[] = picked.map((item, i) => {
          const uri = getImageUrl(item.image_png ?? item.image_url);
          return {
            id: `item-${item.id}-${Date.now()}-${i}`,
            imageSource: uri ? { uri } : testJeansImg,
            x: 40 + i * 20,
            y: 40 + i * 20,
            zIndex: ++maxZ,
            width: ITEM_DEFAULT_SIZE,
            height: ITEM_DEFAULT_SIZE,
            scale: 1,
            rotation: 0,
          };
        });
        const next = [...prev, ...newItems];
        pushHistory(next);
        return next;
      });
    },
    [pushHistory],
  );

  // Tag actions
  const handleRemoveTag = useCallback((tag: string) => {
    setTags(prev => prev.filter(existing => existing !== tag));
    setHasUnsavedChanges(true);
  }, []);

  const handleConfirmTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
      setHasUnsavedChanges(true);
    }
    setTagInput('');
    setAddingTag(false);
  }, [tagInput, tags]);

  // Persist the current canvas arrangement to the local My Creations store and
  // confirm with a toast that says WHERE it went. Returns whether anything was
  // saved (false when there's nothing URI-backed to persist). Does NOT navigate
  // — the user stays on the canvas; the toast points them at My Creations.
  const persistCreation = useCallback(async (): Promise<boolean> => {
    // Only items backed by a real image URI persist — mock require()'d assets
    // (the deep-link/dev fallback) aren't serializable and are skipped.
    const savedItems = items.reduce<CreationItem[]>((acc, it) => {
      const uri = extractUri(it.imageSource);
      if (uri) {
        acc.push({
          id: it.id,
          imageUri: uri,
          x: it.x,
          y: it.y,
          width: it.width,
          height: it.height,
          zIndex: it.zIndex,
          scale: it.scale,
          rotation: it.rotation,
        });
      }
      return acc;
    }, []);

    if (savedItems.length === 0) {
      return false;
    }

    await creationsService.saveCreation({
      items: savedItems,
      tags,
      canvasWidth: CANVAS_WIDTH,
    });
    queryClient.invalidateQueries({ queryKey: CREATIONS_QUERY_KEY });
    track('creation_saved', { item_count: savedItems.length });
    setHasUnsavedChanges(false);
    // Light the My Creations header dot (same "unseen saved" feedback as the
    // Home favourites "Wear this" mint dot); cleared when the list is opened.
    markCreationSaved();
    showSavedSnackbar();
    return true;
  }, [items, tags, queryClient, showSavedSnackbar, markCreationSaved]);

  const handleSave = useCallback(() => {
    persistCreation();
  }, [persistCreation]);

  const handleOpenCreations = useCallback(() => {
    // "My Creations" lists everything the user has saved from the canvas
    // (new canvases, remixed outfits, …). Opening it PUSHES the screen, so it
    // never trips beforeRemove — route through the exit guard so unsaved edits
    // surface the discard sheet first (passes straight through when clean).
    requestCanvasExit(() => {
      track('canvas_my_creations_opened');
      navigation.navigate('MyCreations');
    });
  }, [navigation]);

  // Intercept leaving the canvas (back chevron / hardware back) while there are
  // unsaved edits → show the "Discard this creation?" sheet instead. The
  // intercepted action is replayed once the user picks Save or Discard.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (proceedRef.current || !hasUnsavedChanges) {
        return;
      }
      e.preventDefault();
      pendingProceedRef.current = null;
      setPendingAction(e.data.action);
      setDiscardVisible(true);
    });
    return unsubscribe;
  }, [navigation, hasUnsavedChanges]);

  // Register the module-level exit guard so PUSH-style exits that never hit
  // beforeRemove (the My Creations icon, sidebar destinations) also surface the
  // discard sheet. Focus-gated: the guard is only armed while the canvas is the
  // focused screen, so a sidebar tap from a screen pushed ON TOP of a still-
  // mounted dirty canvas (e.g. My Creations) doesn't surface the canvas dialog.
  // The focus callback also re-arms proceedRef (a push exit leaves the canvas
  // mounted with it stuck true) so a later back/exit prompts again if dirty.
  useFocusEffect(
    useCallback(() => {
      proceedRef.current = false;
      if (hasUnsavedChanges) {
        setCanvasExitGuard(proceed => {
          pendingProceedRef.current = proceed;
          setPendingAction(null);
          setDiscardVisible(true);
        });
      } else {
        setCanvasExitGuard(null);
      }
      return () => setCanvasExitGuard(null);
    }, [hasUnsavedChanges]),
  );

  const leaveWithPendingAction = useCallback(() => {
    proceedRef.current = true;
    setDiscardVisible(false);
    const proceed = pendingProceedRef.current;
    pendingProceedRef.current = null;
    if (proceed) {
      // Push-style exit (My Creations icon / sidebar) — run the navigation thunk.
      proceed();
    } else if (pendingAction) {
      navigation.dispatch(pendingAction);
    } else {
      navigation.goBack();
    }
  }, [navigation, pendingAction]);

  // Discard sheet — "Save" persists then continues leaving.
  const handleDiscardSave = useCallback(async () => {
    await persistCreation();
    leaveWithPendingAction();
  }, [persistCreation, leaveWithPendingAction]);

  // "Discard" leaves without saving.
  const handleDiscardConfirm = useCallback(() => {
    track('creation_discarded');
    leaveWithPendingAction();
  }, [leaveWithPendingAction]);

  // Backdrop / back dismiss — stay on the canvas.
  const handleDiscardCancel = useCallback(() => {
    setDiscardVisible(false);
    setPendingAction(null);
    pendingProceedRef.current = null;
  }, []);

  const actionDisabled = !selectedId;

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header — left group: menu/back + undo + redo. Right: My Creations. */}
        <View style={styles.header}>
          <View style={styles.headerActions}>
            {fromRemix ? (
              <Pressable
                testID="canvas-header-back"
                onPress={() => navigation.goBack()}
                accessibilityLabel={t('common.a11y_go_back')}
                style={styles.headerIconBtn}
              >
                <IconChevronLeft width={24} height={24} />
              </Pressable>
            ) : (
              <Pressable
                testID="canvas-header-menu"
                onPress={openSidebar}
                accessibilityLabel={t('home.a11y_open_menu')}
                style={styles.headerIconBtn}
              >
                <IconMenu width={24} height={24} />
              </Pressable>
            )}
            <Pressable
              testID="canvas-header-undo"
              onPress={handleUndo}
              disabled={!canUndo}
              accessibilityLabel={t('outfitCanvas.a11y_undo')}
              style={[
                styles.headerIconBtn,
                !canUndo && styles.headerIconBtnDisabled,
              ]}
            >
              <IconCanvasUndo width={18} height={18} />
            </Pressable>
            <Pressable
              testID="canvas-header-redo"
              onPress={handleRedo}
              disabled={!canRedo}
              accessibilityLabel={t('outfitCanvas.a11y_redo')}
              style={[
                styles.headerIconBtn,
                !canRedo && styles.headerIconBtnDisabled,
              ]}
            >
              <IconCanvasRedo width={18} height={18} />
            </Pressable>
          </View>

          <Pressable
            testID="canvas-header-my-creations"
            onPress={handleOpenCreations}
            accessibilityLabel={t('outfitCanvas.a11y_my_creations')}
            style={styles.headerIconBtn}
          >
            <IconMyCreation width={24} height={24} />
            {/* Mint "unseen saved creation" dot — same feedback as the Home
                favourites "Wear this" dot. Lit on save, cleared when the My
                Creations list is opened. */}
            {hasUnseenCreations ? (
              <View
                testID="canvas-my-creations-badge"
                style={styles.creationDot}
                pointerEvents="none"
              />
            ) : null}
          </Pressable>
        </View>

        {/* Body — Figma justify-between: canvas card / add-row / tags grouped at
          top, Save pinned at the bottom. Backdrop tap deselects. */}
        <Pressable
          testID="canvas-backdrop"
          onPress={() => setSelectedId(null)}
          style={styles.body}
        >
          {/* Top group — gap 16 (theme.spacing.m) between card / add-row / tags */}
          <View style={styles.topGroup}>
            {/* Canvas card — fixed-size inset rounded card (Figma "Image 3:4") */}
            <OutfitCanvasSurface
              items={items}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              selectedId={selectedId}
              onSelect={handleSelect}
              onPositionChange={handlePositionChange}
              onScaleChange={handleScaleChange}
              onRotationChange={handleRotationChange}
              showGrid
              itemTestIDPrefix="canvas-item"
              enablePinchZoom
            />

            {/* Toolbar */}
            <View style={styles.toolbar}>
              <ToolbarBtn
                testID="canvas-tool-add"
                onPress={handleAddItem}
                accessibilityLabel={t('common.a11y_add_item')}
              >
                <IconCanvasAdd width={18} height={18} />
              </ToolbarBtn>
              <ToolbarBtn
                testID="canvas-tool-layer-up"
                onPress={handleLayerUp}
                disabled={actionDisabled}
                accessibilityLabel={t('outfitCanvas.a11y_bring_forward')}
              >
                <IconCanvasLayerUp width={32} height={31} />
              </ToolbarBtn>
              <ToolbarBtn
                testID="canvas-tool-layer-down"
                onPress={handleLayerDown}
                disabled={actionDisabled}
                accessibilityLabel={t('outfitCanvas.a11y_send_backward')}
              >
                <IconCanvasLayerDown width={32} height={31} />
              </ToolbarBtn>
              <ToolbarBtn
                testID="canvas-tool-duplicate"
                onPress={handleDuplicate}
                disabled={actionDisabled}
                accessibilityLabel={t('outfitCanvas.a11y_duplicate')}
              >
                <IconCanvasDuplicate width={32} height={31} />
              </ToolbarBtn>
              <ToolbarBtn
                testID="canvas-tool-swap"
                onPress={() => {
                  /* TODO: navigate to item picker */
                }}
                disabled={actionDisabled}
                accessibilityLabel={t('outfitCanvas.a11y_swap')}
              >
                <IconCanvasSwap width={32} height={31} />
              </ToolbarBtn>
              <ToolbarBtn
                testID="canvas-tool-delete"
                onPress={handleDelete}
                disabled={actionDisabled}
                accessibilityLabel={t('outfitCanvas.a11y_delete_item')}
              >
                <IconCanvasDelete width={18} height={18} />
              </ToolbarBtn>
            </View>

            {/* Tags row */}
            <View style={styles.tagsRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagsScroll}
                keyboardShouldPersistTaps="handled"
              >
                {tags.map(tag => (
                  <TagChip
                    key={tag}
                    label={tag}
                    onRemove={() => handleRemoveTag(tag)}
                  />
                ))}
                {addingTag ? (
                  <TextInput
                    testID="canvas-tag-input"
                    value={tagInput}
                    onChangeText={setTagInput}
                    onSubmitEditing={handleConfirmTag}
                    onBlur={handleConfirmTag}
                    autoFocus
                    returnKeyType="done"
                    placeholder={t('outfitCanvas.tag_placeholder')}
                    style={styles.tagInput}
                    accessibilityLabel={t('outfitCanvas.a11y_tag_input')}
                  />
                ) : (
                  <Pressable
                    testID="canvas-tag-add"
                    onPress={() => setAddingTag(true)}
                    accessibilityLabel={t('outfitCanvas.a11y_add_tag')}
                    style={styles.tagAddBtn}
                  >
                    <IconCanvasAdd width={12} height={12} />
                  </Pressable>
                )}
              </ScrollView>
            </View>

            {/* Save button — canonical secondary button. */}
            <View style={styles.saveRow}>
              <PillButton
                testID="canvas-save"
                onPress={handleSave}
                accessibilityLabel={t('outfitCanvas.a11y_save_outfit')}
                title={t('common.save')}
                variant="outline"
              />
            </View>
          </View>
        </Pressable>
      </SafeAreaView>

      {/* Item picker panel */}
      <ItemPickerPanel
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onConfirm={handlePickerConfirm}
      />

      {/* Unsaved-changes guard sheet (shown on leave with pending edits) */}
      <DiscardCreationDialog
        visible={discardVisible}
        onCancel={handleDiscardCancel}
        onSave={handleDiscardSave}
        onDiscard={handleDiscardConfirm}
      />

      {/* Success snackbar overlay — "Saved to My Creations" (mint M3 snackbar,
          same component as Wardrobe). Informational, so it never blocks touches. */}
      {savedSnackbarVisible ? (
        <View
          style={[styles.savedSnackbarOverlay, { bottom: insets.bottom + 24 }]}
          pointerEvents="none"
          testID="canvas-saved-snackbar-overlay"
        >
          <ItemReadySnackbar message={t('outfitCanvas.saved_body')} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  // Bottom-anchored, centred overlay for the "Saved to My Creations" snackbar
  // (`bottom` supplied inline to respect the home-indicator safe area).
  savedSnackbarOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: theme.zIndex.toast,
    elevation: 1000,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    height: 56,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.white,
    ...theme.ds.shadow.headerIcon,
  },
  // Mint "unseen saved creation" dot — mirrors the Home favourites favDot
  // (12×12, top/right 8, figmaFavouriteDot) for a consistent saved-feedback cue.
  creationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.figmaFavouriteDot,
  },
  headerIconBtnDisabled: {
    opacity: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  // Body — fills remaining height; Figma justify-between pins Save at bottom.
  // 12px (theme.spacing.uacDimension12) horizontal inset matches the canvas card inset.
  body: {
    flex: 1,
    paddingHorizontal: theme.spacing.uacDimension12,
    justifyContent: 'space-between',
  },
  // Top group — canvas card / add-row / tags stacked with 16px gap.
  topGroup: {
    gap: theme.spacing.m,
  },
  // Add-item button (circular, below canvas — Figma Group 36, 48×48).
  // Left-aligned, flush to the canvas card's left edge (body provides the
  // 12px horizontal inset; gap handled by topGroup).
  addRow: {
    flexDirection: 'row',
  },
  // Toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.figmaDivider,
    backgroundColor: theme.colors.background,
  },
  toolbarBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.m,
  },
  toolbarBtnDisabled: {
    opacity: 0.5,
  },
  toolbarBtnPressed: {
    backgroundColor: theme.colors.figmaSurfaceSoft,
  },
  // Tags — row sits in topGroup (gap 16 above); chips flush to body inset.
  tagsRow: {},
  tagsScroll: {
    gap: 10, // Figma chip row gap
    alignItems: 'center',
  },
  // Tag chip — Figma: bg background/primary/subtle_100 (#e0d2c4), radius 6,
  // height 32, padding 8/12, gap 4, text Inter Regular 12/16 #070707.
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    backgroundColor: theme.colors.figmaInsightPillBg,
    borderRadius: theme.borderRadius.chip,
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.uacDimension12,
    gap: theme.spacing.xs,
  },
  tagChipLabel: {
    ...theme.typography.aliases.uacBodyXsRegular, // Inter Regular 12/16
    color: theme.colors.figmaTextDark,
  },
  tagChipRemove: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagChipX: {
    fontSize: 14,
    lineHeight: 16,
    color: theme.colors.figmaTextDark,
  },
  // Add chip — Figma: bg background/primary/subtle_50 (#f2efec), radius 6,
  // height 32, icon-only "+".
  tagAddBtn: {
    width: 38,
    height: 32,
    borderRadius: theme.borderRadius.chip,
    backgroundColor: theme.colors.figmaCardSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagInput: {
    ...theme.typography.aliases.uacBodyXsRegular, // Inter Regular 12/16
    height: 32,
    minWidth: 80,
    backgroundColor: theme.colors.figmaCardSurface,
    borderRadius: theme.borderRadius.chip,
    paddingHorizontal: theme.spacing.uacDimension12,
    color: theme.colors.figmaTextDark,
  },
  // Save button — Figma: 1.5px border border/neutral/base (#1d1f23), radius 16,
  // height 56, transparent fill, label Poppins Medium 16/24 #262421.
  // Side inset = 12px (theme.spacing.uacDimension12), supplied by the body padding so the
  // button aligns flush with the canvas card edges.
  saveRow: {
    paddingBottom: theme.spacing.m,
    paddingTop: theme.spacing.s,
  },
});

const pickerStyles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.figmaBackground,
    zIndex: theme.zIndex.sticky,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.m,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.figmaDivider,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: theme.colors.figmaTextPrimary,
  },
  body: {
    flex: 1,
    paddingTop: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PICKER_GAP,
  },
  tile: {
    width: PICKER_TILE,
    height: PICKER_TILE_HEIGHT,
    borderRadius: theme.borderRadius.m,
    overflow: 'hidden',
    backgroundColor: '#E8EBF0',
  },
  tileSelected: {
    borderRadius: 12,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileFallbackText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: theme.colors.figmaTextSecondary,
    fontFamily: 'Poppins-Regular',
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.figmaDivider,
  },
  confirmBtn: {
    backgroundColor: theme.colors.figmaPrimaryButtonBg,
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: theme.colors.figmaPrimaryButtonText,
    letterSpacing: 0.15,
  },
});
