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
import {
  addSeededItems,
  seedCanvasLayout,
} from '../components/features/collage-seed-layout';
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
  CreationSaveError,
  creationsService,
} from '../services/creationsService';
import {
  requestCanvasExit,
  setCanvasExitGuard,
} from '../navigation/canvasExitGuard';
import { DiscardCreationDialog } from './canvas/DiscardCreationDialog';
import { NameCreationSheet } from './canvas/NameCreationSheet';
import { ItemReadySnackbar } from '../components/feedback/ItemReadySnackbar';
import { InfoSnackbar } from '../components/feedback/InfoSnackbar';
import { DotsLoader } from '../components/atoms/DotsLoader';
import IconChevronLeft from '../assets/images/icon_chevron_left.svg';
import IconMenu from '../assets/images/icon_menu.svg';
import IconMyCreation from '../assets/images/icon_my_creation.svg';
// Footer "new blank canvas" affordance — a canvas/frame glyph, deliberately
// distinct from the toolbar's "+" add-item icon so the two aren't ambiguous.
import IconNewCanvas from '../assets/images/icon_outfit_canvas.svg';
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

// How long the "Saved to My Creations" success snackbar stays up (mirrors
// Wardrobe's READY_SNACKBAR_MS).
const SAVED_SNACKBAR_MS = 4000;

// Upper bound on how long we'll wait for picked images before showing the
// canvas anyway. Caps the picker's "Adding…" button spinner and the canvas
// "Adding…" status so a slow or broken image can never wedge either: we warm
// the cache for snappy placement, but never block the UI on the network.
const ADD_IMAGE_TIMEOUT_MS = 6000;

// Minimum time the "Adding…" feedback (picker button spinner + canvas status)
// stays up, even when images are already cached and load instantly. Without this
// floor the feedback can flash by unseen (common on web, where the cache hit is
// immediate); it also smooths the fast path so the spinner never just flickers.
const MIN_ADD_FEEDBACK_MS = 700;

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

// Prefetch a remote image into the cache, resolving on success, failure, OR a
// timeout — whichever comes first. Always resolves (never rejects) so a single
// bad URL can't reject the whole Promise.all in the add flow.
const prefetchWithTimeout = (uri: string): Promise<void> =>
  new Promise<void>(resolve => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    const timer = setTimeout(finish, ADD_IMAGE_TIMEOUT_MS);
    Image.prefetch(uri)
      .catch(() => undefined)
      .finally(() => {
        clearTimeout(timer);
        finish();
      });
  });

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
  // May be async: the panel keeps its "Add" button in a loading state until the
  // promise settles (the parent warms the image cache before placing items).
  onConfirm: (items: WardrobeItem[]) => void | Promise<void>;
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
  // True while the parent is warming the picked images / placing them on the
  // canvas — drives the "Add" button's spinner.
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    Animated.timing(slideX, {
      toValue: visible ? 0 : SCREEN_WIDTH,
      duration: motion.duration.medium,
      easing: motion.easing.standard,
      useNativeDriver: true,
    }).start();
    if (!visible) {
      setSelectedIds([]);
      setConfirming(false);
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

  const handleConfirm = async () => {
    if (confirming || selectedIds.length === 0) {
      return;
    }
    const chosen = wardrobeItems.filter(it => selectedIds.includes(it.id));
    setConfirming(true);
    try {
      await onConfirm(chosen);
    } finally {
      // Guard against a state update after the panel closed/unmounted: the
      // visibility effect already resets `confirming`, so this is a no-op then.
      setConfirming(false);
    }
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

        {/* Confirm button — switches to a loading spinner while the picked
            images are being warmed/placed (testID flips so Maestro can target
            either state). */}
        <View style={pickerStyles.footer}>
          <TouchableOpacity
            testID={
              confirming ? 'canvas-picker-confirm-loading' : 'canvas-picker-confirm'
            }
            style={[
              pickerStyles.confirmBtn,
              (selectedIds.length === 0 || confirming) &&
                pickerStyles.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            disabled={selectedIds.length === 0 || confirming}
            activeOpacity={0.85}
          >
            {confirming ? (
              <View style={pickerStyles.confirmBtnLoadingRow}>
                <DotsLoader
                  color={theme.colors.figmaPrimaryButtonText}
                  accessibilityLabel={t('outfitCanvas.adding')}
                />
                <Text style={pickerStyles.confirmBtnLabel}>
                  {t('outfitCanvas.adding')}
                </Text>
              </View>
            ) : (
              <Text style={pickerStyles.confirmBtnLabel}>
                {selectedIds.length > 0
                  ? t('outfitCanvas.add_count', { count: selectedIds.length })
                  : t('outfitCanvas.add_to_canvas')}
              </Text>
            )}
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
            category: it.category,
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
  // IDs of items just added from the picker whose remote images haven't finished
  // loading yet. Each id clears on its image's onLoadEnd (and a safety timeout
  // clears the rest).
  const [addingIds, setAddingIds] = useState<string[]>([]);
  // The on-canvas "Adding…" status is its own flag (not just `addingIds > 0`) so
  // it can stay up for a minimum perceptible window even when cached images load
  // instantly — see the hide effect below. `addShownAtRef` stamps when it opened.
  const [addStatusVisible, setAddStatusVisible] = useState(false);
  const addShownAtRef = useRef(0);

  // Unsaved-changes guard: any edit (item move/add/delete/layer, tag change)
  // flips this true; Save clears it. Drives the "Discard this creation?" sheet
  // shown when the user tries to leave with pending edits.
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // In-flight Save guard: true while persistCreation awaits the network so the
  // Save button can show its spinner and block a double-tap. Cleared in a
  // `finally`, so it always resets even if the save throws.
  const [isSaving, setIsSaving] = useState(false);
  const [discardVisible, setDiscardVisible] = useState(false);
  // Save flow: tapping Save opens the naming sheet; the actual persist runs when
  // the user submits a name. `afterNameSaveRef` carries what to do once that
  // save succeeds — null for a plain Save (just close), or `resolveSheet` when
  // the naming step was reached from the discard sheet (leave / new-canvas).
  const [nameSheetVisible, setNameSheetVisible] = useState(false);
  const afterNameSaveRef = useRef<(() => void) | null>(null);
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
  // Self-controlled save-FAILURE snackbar (black InfoSnackbar). Mounted as a
  // bottom overlay like the success one — deliberately NOT react-native-toast-
  // message, which the toast migration (#177/#181) is removing.
  const [saveErrorVisible, setSaveErrorVisible] = useState(false);
  const saveErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether the screen is still mounted so async flows (the picker's
  // prefetch await) can skip their trailing setState if it unmounted mid-flight.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  const dismissSaveError = useCallback(() => {
    if (saveErrorTimerRef.current) {
      clearTimeout(saveErrorTimerRef.current);
      saveErrorTimerRef.current = null;
    }
    setSaveErrorVisible(false);
  }, []);

  const showSaveError = useCallback(() => {
    if (saveErrorTimerRef.current) {
      clearTimeout(saveErrorTimerRef.current);
    }
    setSaveErrorVisible(true);
    saveErrorTimerRef.current = setTimeout(() => {
      setSaveErrorVisible(false);
      saveErrorTimerRef.current = null;
    }, SAVED_SNACKBAR_MS);
  }, []);

  useEffect(
    () => () => {
      if (snackbarTimerRef.current) {
        clearTimeout(snackbarTimerRef.current);
      }
      if (saveErrorTimerRef.current) {
        clearTimeout(saveErrorTimerRef.current);
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
    async (picked: WardrobeItem[]) => {
      if (picked.length === 0) {
        setPickerVisible(false);
        return;
      }
      // Build the canvas items up front so we know which URIs to warm. zIndex is
      // assigned later inside the setItems updater against the freshest state.
      const stamp = Date.now();
      const prepared = picked.map((item, i) => {
        const uri = getImageUrl(item.image_png ?? item.image_url);
        return {
          id: `item-${item.id}-${stamp}-${i}`,
          // The real wardrobe id, carried so a saved creation can launch try-on.
          wardrobeItemId: item.id,
          uri,
          category: item.category,
          imageSource: uri ? { uri } : testJeansImg,
        };
      });

      // Warm the cache (bounded) so pieces land already-decoded rather than
      // popping in one-by-one. The picker's "Add" button stays in its loading
      // state for this await — floored at MIN_ADD_FEEDBACK_MS so a cache hit
      // doesn't make the spinner flash by.
      await Promise.all([
        delay(MIN_ADD_FEEDBACK_MS),
        ...prepared.map(p =>
          p.uri ? prefetchWithTimeout(p.uri) : Promise.resolve(),
        ),
      ]);

      // The screen may have unmounted while we awaited the prefetch — bail before
      // touching state so we don't update an unmounted component.
      if (!isMountedRef.current) {
        return;
      }

      setItems(prev => {
        // Real image source for each NEW item, keyed by its generated id — the
        // collage engine computes geometry from category only, so re-attach the
        // actual (possibly require()'d) source afterwards. Reuse the ids and
        // sources from `prepared` so the prefetch warming and the per-item
        // "adding…" tracking below line up with the items actually placed.
        const srcByNewId = new Map<string, ImageSourcePropType>();
        const wardrobeIdByNewId = new Map<string, string>();
        const newSeeds = prepared.map(p => {
          srcByNewId.set(p.id, p.imageSource);
          wardrobeIdByNewId.set(p.id, p.wardrobeItemId);
          return { id: p.id, imageUri: p.uri ?? '', category: p.category };
        });

        // Lay out ONLY the new item(s) through the collage engine; every item
        // already on the canvas keeps its current (possibly hand-edited)
        // position, scale and rotation. (CEO decision: adding an item must NOT
        // wipe manual edits — previously the whole canvas was re-seeded.) New
        // items stack above the existing arrangement. Undoable. Existing items
        // are returned by reference, so re-attach the source only for new ids.
        const next = addSeededItems(prev, newSeeds, CANVAS_WIDTH).map(c =>
          srcByNewId.has(c.id)
            ? {
                ...c,
                imageSource: srcByNewId.get(c.id)!,
                wardrobeItemId: wardrobeIdByNewId.get(c.id),
              }
            : c,
        );
        pushHistory(next);
        return next;
      });

      // Track each new remote image until it reports loaded (onLoadEnd) — the
      // safety net for anything the prefetch didn't fully warm — and open the
      // canvas status. URI-less mock items need no status.
      const pendingIds = prepared.filter(p => p.uri).map(p => p.id);
      if (pendingIds.length > 0) {
        addShownAtRef.current = Date.now();
        setAddingIds(pendingIds);
        setAddStatusVisible(true);
      }
      setPickerVisible(false);
    },
    [pushHistory],
  );

  // Clear an item's "adding…" marker once its image has loaded. Returns the same
  // array reference for unrelated items so untracked image loads don't re-render.
  const handleItemImageLoad = useCallback((id: string) => {
    setAddingIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : prev));
  }, []);

  // Safety net: never leave a marker stuck if an image's onLoadEnd never arrives
  // (e.g. a dead URL on web). Clears whatever's left after the cap.
  useEffect(() => {
    if (addingIds.length === 0) {
      return;
    }
    const timer = setTimeout(() => setAddingIds([]), ADD_IMAGE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [addingIds]);

  // Hide the canvas "Adding…" status once every new image has loaded, but not
  // before MIN_ADD_FEEDBACK_MS has passed since it opened — so a cache hit (which
  // empties `addingIds` almost immediately) still shows the status long enough to
  // register.
  useEffect(() => {
    if (!addStatusVisible || addingIds.length > 0) {
      return;
    }
    const remaining = Math.max(
      0,
      MIN_ADD_FEEDBACK_MS - (Date.now() - addShownAtRef.current),
    );
    const timer = setTimeout(() => setAddStatusVisible(false), remaining);
    return () => clearTimeout(timer);
  }, [addStatusVisible, addingIds]);

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
  const persistCreation = useCallback(async (name?: string): Promise<boolean> => {
    // Only items backed by a real image URI persist — mock require()'d assets
    // (the deep-link/dev fallback) aren't serializable and are skipped.
    const savedItems = items.reduce<CreationItem[]>((acc, it) => {
      const uri = extractUri(it.imageSource);
      if (uri) {
        acc.push({
          id: it.id,
          wardrobeItemId: it.wardrobeItemId,
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

    setIsSaving(true);
    try {
      await creationsService.saveCreation({
        items: savedItems,
        tags,
        canvasWidth: CANVAS_WIDTH,
        name,
      });
      queryClient.invalidateQueries({ queryKey: CREATIONS_QUERY_KEY });
      track('creation_saved', {
        item_count: savedItems.length,
        named: !!name,
      });
      setHasUnsavedChanges(false);
      // Light the My Creations header dot (same "unseen saved" feedback as the
      // Home favourites "Wear this" mint dot); cleared when the list is opened.
      markCreationSaved();
      showSavedSnackbar();
      return true;
    } catch (error) {
      // A genuine save failure (a true offline error never reaches here — the
      // service falls back to a local save). `auth` = session expired: the
      // apiClient interceptor already cleared tokens, redirected to login and
      // toasted, so we stay silent and let that play out. Anything else didn't
      // save — tell the user so they can retry instead of seeing fake success.
      const isAuth =
        error instanceof CreationSaveError && error.kind === 'auth';
      if (!isAuth) {
        showSaveError();
      }
      track('creation_save_failed', {
        kind: error instanceof CreationSaveError ? error.kind : 'unknown',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    items,
    tags,
    queryClient,
    showSavedSnackbar,
    markCreationSaved,
    showSaveError,
  ]);

  // Save no longer persists immediately — it opens the naming sheet, and the
  // actual save runs once the user submits a name (handleNameSubmit). The Save
  // button is already gated to non-empty canvases, so there's always something
  // to name here.
  const handleSave = useCallback(() => {
    afterNameSaveRef.current = null;
    setNameSheetVisible(true);
  }, []);

  // Naming sheet "continue" arrow — persist with the entered name, then run any
  // queued follow-up (e.g. resolve the discard sheet's leave/new intent). Closes
  // the sheet on completion; success/failure surfaces via the canvas snackbars.
  const handleNameSubmit = useCallback(
    async (name: string) => {
      const saved = await persistCreation(name);
      setNameSheetVisible(false);
      if (saved) {
        const after = afterNameSaveRef.current;
        afterNameSaveRef.current = null;
        after?.();
      }
    },
    [persistCreation],
  );

  // Naming sheet back chip — abandon naming, keep the canvas + items intact.
  const handleNameBack = useCallback(() => {
    setNameSheetVisible(false);
    afterNameSaveRef.current = null;
  }, []);

  const handleOpenCreations = useCallback(() => {
    // "My Creations" lists everything the user has saved from the canvas
    // (new canvases, remixed outfits, …). Opening it PUSHES the screen, so it
    // never trips beforeRemove — route through the exit guard so unsaved edits
    // surface the discard sheet first (passes straight through when clean).
    requestCanvasExit(() => {
      track('canvas_my_creations_opened');
      // Back chevron (→ Outfit Canvas) instead of the hamburger — the user is in
      // a sub-flow, not at a top-level destination.
      navigation.navigate('MyCreations', { showBackButton: true });
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

  // The unsaved-changes sheet is reused for two intents: leaving the screen
  // (replay the intercepted nav action) and starting a NEW blank canvas (reset
  // in place). A ref tracks which, so the shared Save/Discard handlers resolve
  // correctly.
  const sheetIntentRef = useRef<'leave' | 'new'>('leave');

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

  // Reset to a fresh, empty canvas (clears items, selection and history) and
  // mark it clean so the navigation guard and the "+" button settle.
  const resetCanvasToBlank = useCallback(() => {
    const blank: CanvasItemData[] = [];
    history.current = [blank];
    historyIndex.current = 0;
    setItems(blank);
    setSelectedId(null);
    setHasUnsavedChanges(false);
    track('canvas_reset');
  }, []);

  // Resolve the sheet per the active intent: start a blank canvas, or continue
  // leaving the screen.
  const resolveSheet = useCallback(() => {
    setDiscardVisible(false);
    if (sheetIntentRef.current === 'new') {
      sheetIntentRef.current = 'leave';
      resetCanvasToBlank();
    } else {
      leaveWithPendingAction();
    }
  }, [resetCanvasToBlank, leaveWithPendingAction]);

  // Discard sheet — "Save" routes through the naming step like the main Save,
  // queueing `resolveSheet` to run once the save succeeds (leave / new canvas).
  // A failed or abandoned save leaves the canvas untouched (the intent only
  // fires on success), so the user never loses work.
  const handleDiscardSave = useCallback(() => {
    afterNameSaveRef.current = resolveSheet;
    setDiscardVisible(false);
    // Defer opening the naming sheet until the discard dialog's Modal has
    // finished dismissing — presenting a Modal while another is mid-dismiss can
    // drop the presentation on iOS (the race SeeThisOnMeScreen defers around).
    setTimeout(() => {
      if (isMountedRef.current) {
        setNameSheetVisible(true);
      }
    }, motion.duration.medium);
  }, [resolveSheet]);

  // "Discard" resolves without saving.
  const handleDiscardConfirm = useCallback(() => {
    track('creation_discarded');
    resolveSheet();
  }, [resolveSheet]);

  // Backdrop / back dismiss — stay on the canvas, reset the intent.
  const handleDiscardCancel = useCallback(() => {
    setDiscardVisible(false);
    setPendingAction(null);
    pendingProceedRef.current = null;
    sheetIntentRef.current = 'leave';
  }, []);

  // New-blank-canvas button. Enabled whenever the canvas isn't already blank.
  // Only route through the save/discard sheet when there are pending edits to
  // lose; an already-saved canvas has nothing to discard, so reset in place.
  const handleNewBlankCanvas = useCallback(() => {
    if (!hasUnsavedChanges) {
      resetCanvasToBlank();
      return;
    }
    sheetIntentRef.current = 'new';
    setDiscardVisible(true);
  }, [hasUnsavedChanges, resetCanvasToBlank]);

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
            <View style={styles.canvasWrap}>
              <OutfitCanvasSurface
                items={items}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                selectedId={selectedId}
                onSelect={handleSelect}
                onPositionChange={handlePositionChange}
                onScaleChange={handleScaleChange}
                onRotationChange={handleRotationChange}
                onImageLoad={handleItemImageLoad}
                showGrid
                itemTestIDPrefix="canvas-item"
                enablePinchZoom
              />
              {/* Adding-items status — shown while freshly-added images load.
                  Informational, so it never blocks canvas touches. */}
              {addStatusVisible ? (
                <View
                  style={styles.addingStatusWrap}
                  pointerEvents="none"
                  testID="canvas-adding-status"
                >
                  <View style={styles.addingStatus}>
                    <DotsLoader accessibilityLabel={t('outfitCanvas.adding')} />
                    <Text style={styles.addingStatusLabel}>
                      {t('outfitCanvas.adding')}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

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

            {/* Footer — 56×56 outline "new canvas" button (canvas glyph, distinct
              from the toolbar add "+"; starts a new blank canvas, disabled only
              when the canvas is already blank) ahead of the primary FILLED Save
              button, which carries the My Creations icon and shows a spinner
              while the save is in flight. */}
            <View style={styles.saveRow}>
              <PillButton
                testID="canvas-new-blank"
                onPress={handleNewBlankCanvas}
                disabled={items.length === 0}
                accessibilityLabel={t('outfitCanvas.a11y_new_canvas')}
                leading={
                  <IconNewCanvas
                    width={24}
                    height={24}
                    color={theme.colors.figmaText}
                  />
                }
                variant="outline"
                style={styles.newCanvasButton}
              />
              <PillButton
                testID="canvas-save"
                onPress={handleSave}
                disabled={!hasUnsavedChanges || items.length === 0}
                loading={isSaving}
                accessibilityLabel={t('outfitCanvas.a11y_save_outfit')}
                title={t('common.save')}
                trailing={<IconMyCreation width={24} height={24} />}
                variant="filled"
                style={styles.saveButton}
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

      {/* Naming step — opened by Save (and the discard sheet's Save); persists
          the creation with the entered name. */}
      <NameCreationSheet
        visible={nameSheetVisible}
        isBusy={isSaving}
        onBack={handleNameBack}
        onSubmit={handleNameSubmit}
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

      {/* Save-failure snackbar overlay — black InfoSnackbar (role="alert"),
          dismissible + auto-dismissing. Interactive (close button), so it must
          stay touchable (no pointerEvents="none"). */}
      {saveErrorVisible ? (
        <View
          style={[styles.saveErrorOverlay, { bottom: insets.bottom + 24 }]}
          testID="canvas-save-error-overlay"
        >
          <InfoSnackbar
            testID="canvas-save-error-snackbar"
            message={t('outfitCanvas.save_failed')}
            onClose={dismissSaveError}
          />
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
  // The InfoSnackbar stretches to its container width, so this overlay adds the
  // side margins (vs the success overlay, which centres a fixed-width card).
  saveErrorOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.m,
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
  // Relative wrapper so the "Adding…" status can anchor over the canvas card.
  canvasWrap: {
    position: 'relative',
  },
  // Full-width band pinned near the top of the canvas; centres the status pill.
  addingStatusWrap: {
    position: 'absolute',
    top: theme.spacing.m,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  addingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.chip,
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.uacDimension12,
    ...theme.ds.shadow.headerIcon,
  },
  addingStatusLabel: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaTextDark,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension12,
    paddingBottom: theme.spacing.m,
    paddingTop: theme.spacing.s,
  },
  // 56×56 outline icon button: override the PillButton's text padding so it's a
  // square, sitting ahead of the Save button.
  newCanvasButton: {
    width: 56,
    paddingHorizontal: 0,
  },
  // Primary Save button fills the remaining row width.
  saveButton: {
    flex: 1,
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
  confirmBtnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  confirmBtnLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: theme.colors.figmaPrimaryButtonText,
    letterSpacing: 0.15,
  },
});
