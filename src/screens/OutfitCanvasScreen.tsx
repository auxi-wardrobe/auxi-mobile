import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  ImageSourcePropType,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';
import { AppStackParamList } from '../types/navigation';
import { theme } from '../theme/theme';
import IconChevronLeft from '../assets/images/icon_chevron_left.svg';
import IconCanvasUndo from '../assets/images/canvas-icons/icon_canvas_undo.svg';
import IconCanvasRedo from '../assets/images/canvas-icons/icon_canvas_redo.svg';
import IconCanvasAdd from '../assets/images/canvas-icons/icon_canvas_add.svg';
import IconCanvasLayerUp from '../assets/images/canvas-icons/icon_canvas_layer_up.svg';
import IconCanvasLayerDown from '../assets/images/canvas-icons/icon_canvas_layer_down.svg';
import IconCanvasDuplicate from '../assets/images/canvas-icons/icon_canvas_duplicate.svg';
import IconCanvasSwap from '../assets/images/canvas-icons/icon_canvas_swap.svg';
import IconCanvasDelete from '../assets/images/canvas-icons/icon_canvas_delete.svg';

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

type CanvasItemData = {
  id: string;
  imageSource: ImageSourcePropType;
  x: number;
  y: number;
  zIndex: number;
  width: number;
  height: number;
};

type HistorySnapshot = CanvasItemData[];

const INITIAL_MOCK_ITEMS: CanvasItemData[] = [
  {
    id: 'item-1',
    imageSource: testJeansImg,
    x: 10,
    y: 20,
    zIndex: 1,
    width: ITEM_DEFAULT_SIZE,
    height: ITEM_DEFAULT_SIZE,
  },
  {
    id: 'item-2',
    imageSource: testJeansImg,
    x: 160,
    y: 40,
    zIndex: 2,
    width: ITEM_DEFAULT_SIZE,
    height: ITEM_DEFAULT_SIZE,
  },
  {
    id: 'item-3',
    imageSource: testJeansImg,
    x: 180,
    y: 200,
    zIndex: 3,
    width: ITEM_DEFAULT_SIZE - 20,
    height: ITEM_DEFAULT_SIZE - 20,
  },
];

// --- Grid background ---
// Figma "remix" frame (node 2852:16582) uses a square LINE grid (graph-paper)
// at 16px spacing, not a dot pattern. Line tone = theme.colors.figmaCanvasGridLine.
const GRID_STEP = 16;
const GridBackground = ({
  width,
  height,
}: {
  width: number;
  height: number;
}) => (
  <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
    <Defs>
      <Pattern
        id="grid"
        x="0"
        y="0"
        width={GRID_STEP}
        height={GRID_STEP}
        patternUnits="userSpaceOnUse"
      >
        {/* top + left edge of each cell → continuous square grid */}
        <Line
          x1="0"
          y1="0"
          x2={GRID_STEP}
          y2="0"
          stroke={theme.colors.figmaCanvasGridLine}
          strokeWidth={1}
        />
        <Line
          x1="0"
          y1="0"
          x2="0"
          y2={GRID_STEP}
          stroke={theme.colors.figmaCanvasGridLine}
          strokeWidth={1}
        />
      </Pattern>
    </Defs>
    <Rect width={width} height={height} fill="url(#grid)" />
  </Svg>
);

// --- Draggable canvas item ---
interface DraggableItemProps {
  item: CanvasItemData;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
}

const DraggableItem: React.FC<DraggableItemProps> = ({
  item,
  isSelected,
  onSelect,
  onPositionChange,
}) => {
  const dragOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const hasMoved = useRef(false);
  // Keep latest props fresh inside the PanResponder closure (created only once)
  const propsRef = useRef({ item, onSelect, onPositionChange });
  propsRef.current = { item, onSelect, onPositionChange };

  // Reset offset only after the committed position has propagated via state
  useEffect(() => {
    dragOffset.setValue({ x: 0, y: 0 });
  }, [item.x, item.y, dragOffset]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 3 || Math.abs(gs.dy) > 3,
      onPanResponderGrant: () => {
        hasMoved.current = false;
      },
      onPanResponderMove: (_, gs) => {
        if (Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4) {
          hasMoved.current = true;
        }
        dragOffset.setValue({ x: gs.dx, y: gs.dy });
      },
      onPanResponderRelease: (_, gs) => {
        const {
          item: it,
          onSelect: os,
          onPositionChange: opc,
        } = propsRef.current;
        if (!hasMoved.current) {
          os(it.id);
          dragOffset.setValue({ x: 0, y: 0 });
        } else {
          opc(it.id, it.x + gs.dx, it.y + gs.dy);
          // dragOffset will be reset by useEffect once item.x/y updates
        }
      },
      onPanResponderTerminate: () => {
        dragOffset.setValue({ x: 0, y: 0 });
      },
    }),
  ).current;

  return (
    <Animated.View
      testID={`canvas-item-${item.id}`}
      style={[
        styles.draggableItem,
        {
          left: item.x,
          top: item.y,
          zIndex: item.zIndex,
          width: item.width,
          height: item.height,
          transform: dragOffset.getTranslateTransform(),
        },
        isSelected && styles.selectedItem,
      ]}
      {...panResponder.panHandlers}
    >
      <Image
        source={item.imageSource}
        style={{ width: item.width, height: item.height }}
        resizeMode="contain"
      />
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
}) => (
  <View style={styles.tagChip}>
    <Text style={styles.tagChipLabel}>{label}</Text>
    <Pressable
      testID={`canvas-tag-remove-${label}`}
      onPress={onRemove}
      hitSlop={8}
      style={styles.tagChipRemove}
      accessibilityLabel={`Remove tag ${label}`}
    >
      <Text style={styles.tagChipX}>×</Text>
    </Pressable>
  </View>
);

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
  const [items, setItems] = useState<CanvasItemData[]>(INITIAL_MOCK_ITEMS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>(['Low Energy', 'Calm']);
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Undo / redo
  const history = useRef<HistorySnapshot[]>([INITIAL_MOCK_ITEMS]);
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
    const maxZ = items.length > 0 ? Math.max(...items.map(it => it.zIndex)) : 0;
    const newItem: CanvasItemData = {
      id: `item-new-${Date.now()}`,
      imageSource: testJeansImg,
      x: 40,
      y: 40,
      zIndex: maxZ + 1,
      width: ITEM_DEFAULT_SIZE,
      height: ITEM_DEFAULT_SIZE,
    };
    setItems(prev => {
      const next = [...prev, newItem];
      pushHistory(next);
      return next;
    });
  }, [items, pushHistory]);

  // Tag actions
  const handleRemoveTag = useCallback((tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
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
  const sortedItems = [...items].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          testID="canvas-header-back"
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          style={styles.headerIconBtn}
        >
          <IconChevronLeft width={24} height={24} />
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable
            testID="canvas-header-undo"
            onPress={handleUndo}
            disabled={!canUndo}
            accessibilityLabel="Undo"
            style={[
              styles.headerIconBtn,
              !canUndo && styles.headerIconBtnDisabled,
            ]}
          >
            <IconCanvasUndo width={28} height={28} />
          </Pressable>
          <Pressable
            testID="canvas-header-redo"
            onPress={handleRedo}
            disabled={!canRedo}
            accessibilityLabel="Redo"
            style={[
              styles.headerIconBtn,
              !canRedo && styles.headerIconBtnDisabled,
            ]}
          >
            <IconCanvasRedo width={28} height={28} />
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
          <View
            style={[
              styles.canvas,
              { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
            ]}
            pointerEvents="box-none"
          >
            <GridBackground width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
            {sortedItems.map(item => (
              <DraggableItem
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                onSelect={handleSelect}
                onPositionChange={handlePositionChange}
              />
            ))}
          </View>

          {/* Add-item row — circular bordered "+" below the canvas (Figma Group 36) */}
          <View style={styles.addRow}>
            <Pressable
              testID="canvas-add-item"
              onPress={handleAddItem}
              accessibilityLabel="Add item"
              style={({ pressed }) => [
                styles.addItemBtn,
                pressed && styles.addItemBtnPressed,
              ]}
            >
              <IconCanvasAdd width={20} height={20} />
            </Pressable>
          </View>

          {/* Editing toolbar — Figma hides this in the static frame (Group 35 hidden);
          shown contextually only when an item is selected to preserve the
          approved layer/duplicate/swap/delete actions. */}
          {selectedId !== null && (
            <View style={styles.toolbar} testID="canvas-toolbar">
              <ToolbarBtn
                testID="canvas-tool-layer-up"
                onPress={handleLayerUp}
                disabled={actionDisabled}
                accessibilityLabel="Bring forward"
              >
                <IconCanvasLayerUp width={32} height={31} />
              </ToolbarBtn>
              <ToolbarBtn
                testID="canvas-tool-layer-down"
                onPress={handleLayerDown}
                disabled={actionDisabled}
                accessibilityLabel="Send backward"
              >
                <IconCanvasLayerDown width={32} height={31} />
              </ToolbarBtn>
              <ToolbarBtn
                testID="canvas-tool-duplicate"
                onPress={handleDuplicate}
                disabled={actionDisabled}
                accessibilityLabel="Duplicate item"
              >
                <IconCanvasDuplicate width={32} height={31} />
              </ToolbarBtn>
              <ToolbarBtn
                testID="canvas-tool-swap"
                onPress={() => {
                  /* TODO: navigate to item picker */
                }}
                disabled={actionDisabled}
                accessibilityLabel="Swap item"
              >
                <IconCanvasSwap width={32} height={31} />
              </ToolbarBtn>
              <ToolbarBtn
                testID="canvas-tool-delete"
                onPress={handleDelete}
                disabled={actionDisabled}
                accessibilityLabel="Delete item"
              >
                <IconCanvasDelete width={32} height={31} />
              </ToolbarBtn>
            </View>
          )}

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
                  placeholder="Tag name"
                  style={styles.tagInput}
                  accessibilityLabel="Tag name input"
                />
              ) : (
                <Pressable
                  testID="canvas-tag-add"
                  onPress={() => setAddingTag(true)}
                  accessibilityLabel="Add tag"
                  style={styles.tagAddBtn}
                >
                  <IconCanvasAdd width={14} height={14} />
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>

        {/* Save button — pinned at the bottom of the body (Figma justify-between) */}
        <View style={styles.saveRow}>
          <Pressable
            testID="canvas-save"
            onPress={handleSave}
            accessibilityLabel="Save outfit"
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && styles.saveBtnPressed,
            ]}
          >
            <Text style={styles.saveBtnLabel}>Save</Text>
          </Pressable>
        </View>
      </Pressable>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  // Canvas card — inset rounded card (Figma "Image 3:4"), width/height set
  // inline (CANVAS_WIDTH × 4/3). overflow:hidden clips items + grid to radius.
  canvas: {
    // Figma canvas card bg = background/primary/subtle_50 (#f2efec)
    backgroundColor: theme.colors.figmaCardSurface,
    borderRadius: theme.borderRadius.figmaTile,
    overflow: 'hidden',
  },
  draggableItem: {
    position: 'absolute',
  },
  selectedItem: {
    borderWidth: 2,
    borderColor: theme.colors.uacBorderBase,
    borderStyle: 'dashed',
    borderRadius: 4,
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
