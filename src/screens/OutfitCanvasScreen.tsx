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
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
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
const CANVAS_HEIGHT = SCREEN_WIDTH * 1.1;
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
const GridBackground = ({ width, height }: { width: number; height: number }) => (
  <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
    <Defs>
      <Pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <Circle cx="1" cy="1" r="1" fill="#C8CAD0" />
      </Pattern>
    </Defs>
    <Rect width={width} height={height} fill="url(#dots)" />
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
        const { item: it, onSelect: os, onPositionChange: opc } = propsRef.current;
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
  const [tags, setTags] = useState<string[]>(['Happy']);
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
    if (!canUndo) { return; }
    historyIndex.current -= 1;
    setItems(history.current[historyIndex.current]);
    setSelectedId(null);
  }, [canUndo]);

  const handleRedo = useCallback(() => {
    if (!canRedo) { return; }
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
    if (!selectedId) { return; }
    setItems(prev => {
      const maxZ = Math.max(...prev.map(it => it.zIndex));
      const next = prev.map(it =>
        it.id === selectedId ? { ...it, zIndex: Math.min(it.zIndex + 1, maxZ + 1) } : it,
      );
      pushHistory(next);
      return next;
    });
  }, [selectedId, pushHistory]);

  const handleLayerDown = useCallback(() => {
    if (!selectedId) { return; }
    setItems(prev => {
      const next = prev.map(it =>
        it.id === selectedId ? { ...it, zIndex: Math.max(it.zIndex - 1, 1) } : it,
      );
      pushHistory(next);
      return next;
    });
  }, [selectedId, pushHistory]);

  const handleDuplicate = useCallback(() => {
    if (!selectedId) { return; }
    setItems(prev => {
      const source = prev.find(it => it.id === selectedId);
      if (!source) { return prev; }
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
    if (!selectedId) { return; }
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
            style={[styles.headerIconBtn, !canUndo && styles.headerIconBtnDisabled]}
          >
            <IconCanvasUndo width={28} height={28} />
          </Pressable>
          <Pressable
            testID="canvas-header-redo"
            onPress={handleRedo}
            disabled={!canRedo}
            accessibilityLabel="Redo"
            style={[styles.headerIconBtn, !canRedo && styles.headerIconBtnDisabled]}
          >
            <IconCanvasRedo width={28} height={28} />
          </Pressable>
        </View>
      </View>

      {/* Canvas */}
      <Pressable
        testID="canvas-backdrop"
        onPress={() => setSelectedId(null)}
        style={styles.canvasWrapper}
      >
        <View
          style={[styles.canvas, { height: CANVAS_HEIGHT }]}
          pointerEvents="box-none"
        >
          <GridBackground width={SCREEN_WIDTH} height={CANVAS_HEIGHT} />
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
      </Pressable>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <ToolbarBtn
          testID="canvas-tool-add"
          onPress={handleAddItem}
          accessibilityLabel="Add item"
        >
          <IconCanvasAdd width={32} height={31} />
        </ToolbarBtn>
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
          onPress={() => { /* TODO: navigate to item picker */ }}
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
          accessibilityLabel="Save outfit"
          style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
        >
          <Text style={styles.saveBtnLabel}>Save</Text>
        </Pressable>
      </View>
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
  // Canvas
  canvasWrapper: {
    flex: 1,
  },
  canvas: {
    width: SCREEN_WIDTH,
    backgroundColor: '#F7F5F0',
    overflow: 'hidden',
  },
  draggableItem: {
    position: 'absolute',
  },
  selectedItem: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 4,
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
  // Tags
  tagsRow: {
    paddingVertical: theme.spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.figmaDivider,
  },
  tagsScroll: {
    paddingHorizontal: theme.spacing.m,
    gap: 8,
    alignItems: 'center',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.figmaSurfaceSoft,
    borderRadius: theme.borderRadius.round,
    paddingVertical: 5,
    paddingLeft: 12,
    paddingRight: 8,
  },
  tagChipLabel: {
    fontFamily: 'Manrope-Regular',
    fontSize: 13,
    color: theme.colors.figmaTextPrimary,
  },
  tagChipRemove: {
    marginLeft: 4,
  },
  tagChipX: {
    fontSize: 16,
    lineHeight: 18,
    color: theme.colors.figmaTextSecondary,
  },
  tagAddBtn: {
    width: 30,
    height: 30,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1.5,
    borderColor: theme.colors.figmaDivider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagInput: {
    height: 30,
    minWidth: 80,
    borderWidth: 1,
    borderColor: theme.colors.figmaDivider,
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: 10,
    fontSize: 13,
    color: theme.colors.figmaTextPrimary,
  },
  // Save button
  saveRow: {
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.m,
    paddingTop: theme.spacing.s,
  },
  saveBtn: {
    backgroundColor: theme.colors.figmaButton,
    borderRadius: theme.borderRadius.round,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnPressed: {
    opacity: 0.85,
  },
  saveBtnLabel: {
    fontFamily: 'ArchivoNarrow-SemiBold',
    fontSize: 16,
    color: theme.colors.white,
    letterSpacing: 0.15,
  },
});
