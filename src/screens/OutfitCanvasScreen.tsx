import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
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
import { RouteProp, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { AppStackParamList } from '../types/navigation';
import { theme } from '../theme/theme';
import {
  CanvasItemData,
  OutfitCanvasSurface,
} from '../components/features/OutfitCanvasSurface';
import { wardrobeService, WardrobeItem } from '../services/wardrobeService';
import { CategoryTabs } from '../components/features/CategoryTabs';
import { getImageUrl } from '../utils/url';
import IconChevronLeft from '../assets/images/icon_chevron_left.svg';
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
// inset rounded card sitting inside the body's 24px horizontal padding
// (theme.spacing.l each side), aspect 3:4 (height = width × 4/3).
const CANVAS_WIDTH = SCREEN_WIDTH - 2 * theme.spacing.l;
const CANVAS_HEIGHT = (CANVAS_WIDTH * 4) / 3;
const ITEM_DEFAULT_SIZE = 160;

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
      duration: 280,
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
                  const uri = getImageUrl(item.image_url);
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
  // Seed from the real outfit passed by Home's Remix button; fall back to mock
  // items only when opened without params (deep-link / dev). Staggered so the
  // pieces don't stack exactly on top of each other.
  const initialItems = useRef<CanvasItemData[]>(
    route.params?.items?.length
      ? route.params.items.map((it, i) => ({
          id: it.id,
          imageSource: { uri: it.imageUrl },
          x: 20 + i * 24,
          y: 20 + i * 28,
          zIndex: i + 1,
          width: ITEM_DEFAULT_SIZE,
          height: ITEM_DEFAULT_SIZE,
          scale: 1,
          rotation: 0,
        }))
      : INITIAL_MOCK_ITEMS,
  ).current;
  const [items, setItems] = useState<CanvasItemData[]>(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>(['Low Energy', 'Calm']);
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);

  // Undo / redo
  const history = useRef<HistorySnapshot[]>([initialItems]);
  const historyIndex = useRef(0);

  const pushHistory = useCallback((snapshot: CanvasItemData[]) => {
    const newHistory = history.current.slice(0, historyIndex.current + 1);
    newHistory.push(snapshot);
    history.current = newHistory;
    historyIndex.current = newHistory.length - 1;
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

  const handleLayerUp = useCallback(() => {
    if (!selectedId) {
      return;
    }
    setItems(prev => {
      const maxZ = Math.max(...prev.map(it => it.zIndex));
      const next = prev.map(it =>
        it.id === selectedId
          ? { ...it, zIndex: Math.min(it.zIndex + 1, maxZ + 1) }
          : it,
      );
      pushHistory(next);
      return next;
    });
  }, [selectedId, pushHistory]);

  const handleLayerDown = useCallback(() => {
    if (!selectedId) {
      return;
    }
    setItems(prev => {
      const next = prev.map(it =>
        it.id === selectedId
          ? { ...it, zIndex: Math.max(it.zIndex - 1, 1) }
          : it,
      );
      pushHistory(next);
      return next;
    });
  }, [selectedId, pushHistory]);

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
  }, []);

  const handleConfirmTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
    }
    setTagInput('');
    setAddingTag(false);
  }, [tagInput, tags]);

  const handleSave = useCallback(() => {
    // TODO: persist outfit canvas to backend
    navigation.goBack();
  }, [navigation]);

  const actionDisabled = !selectedId;

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            testID="canvas-header-back"
            onPress={() => navigation.goBack()}
            accessibilityLabel={t('common.a11y_go_back')}
            style={styles.headerIconBtn}
          >
            <IconChevronLeft width={24} height={24} />
          </Pressable>

          <View style={styles.headerActions}>
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
          </View>
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

            {/* Save button */}
            <View style={styles.saveRow}>
              <Pressable
                testID="canvas-save"
                onPress={handleSave}
                accessibilityLabel={t('outfitCanvas.a11y_save_outfit')}
                style={({ pressed }) => [
                  styles.saveBtn,
                  pressed && styles.saveBtnPressed,
                ]}
              >
                <Text style={styles.saveBtnLabel}>{t('common.save')}</Text>
              </Pressable>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.m,
  },
  headerIconBtnDisabled: {
    opacity: 0.35,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  // Body — fills remaining height; Figma justify-between pins Save at bottom.
  // 24px (theme.spacing.l) horizontal inset matches the canvas card inset.
  body: {
    flex: 1,
    paddingHorizontal: theme.spacing.l,
    justifyContent: 'space-between',
  },
  // Top group — canvas card / add-row / tags stacked with 16px gap.
  topGroup: {
    gap: theme.spacing.m,
  },
  // Add-item button (circular, below canvas — Figma Group 36, 48×48).
  // Left-aligned, flush to the canvas card's left edge (body provides the
  // 24px horizontal inset; gap handled by topGroup).
  addRow: {
    flexDirection: 'row',
  },
  addItemBtn: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1.5,
    borderColor: theme.colors.uacBorderBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addItemBtnPressed: {
    backgroundColor: theme.colors.figmaCardSurface,
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
    opacity: 0.3,
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
  // Side inset = 24px (theme.spacing.l), supplied by the body padding so the
  // button aligns flush with the canvas card edges.
  saveRow: {
    paddingBottom: theme.spacing.m,
    paddingTop: theme.spacing.s,
  },
  saveBtn: {
    backgroundColor: theme.colors.transparent,
    borderWidth: 1.5,
    borderColor: theme.colors.uacBorderBase,
    borderRadius: theme.borderRadius.l,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnPressed: {
    backgroundColor: theme.colors.figmaCardSurface,
  },
  saveBtnLabel: {
    ...theme.typography.aliases.poppinsButton, // Poppins Medium 16/24
    color: theme.colors.figmaCtaLabel,
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
    zIndex: 100,
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
    fontFamily: 'ArchivoNarrow-SemiBold',
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
    fontFamily: 'Manrope-Regular',
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.figmaDivider,
  },
  confirmBtn: {
    backgroundColor: theme.colors.figmaButton,
    borderRadius: theme.borderRadius.round,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnLabel: {
    fontFamily: 'ArchivoNarrow-SemiBold',
    fontSize: 16,
    color: theme.colors.white,
    letterSpacing: 0.15,
  },
});
