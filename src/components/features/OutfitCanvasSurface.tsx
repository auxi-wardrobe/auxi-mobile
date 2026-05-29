import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  ImageSourcePropType,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';
import { theme } from '../../theme/theme';

// Shared drag-drop canvas surface. Extracted from OutfitCanvasScreen so both
// the full Remix editor (with toolbar/undo/tags, owned by the screen) and the
// Home "collage-play" view reuse ONE drag-drop implementation (DRY).
//
// This component is PRESENTATIONAL/controlled: the parent owns the item array,
// selection and history. The surface only renders items + reports drag/select.

export type CanvasItemData = {
  id: string;
  // Accepts both require()'d local images and remote { uri } sources, so real
  // outfit item image URLs map straight to imageSource: { uri }.
  imageSource: ImageSourcePropType;
  x: number;
  y: number;
  zIndex: number;
  width: number;
  height: number;
};

// --- Grid background (graph-paper) ---
// Figma "remix" frame (2852:16582) uses a 16px square LINE grid. Only the full
// editor shows it; the collage-play view renders a plain cream tile (showGrid=false).
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
  testIDPrefix: string;
  onSelect?: (id: string) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
}

const DraggableItem: React.FC<DraggableItemProps> = ({
  item,
  isSelected,
  testIDPrefix,
  onSelect,
  onPositionChange,
}) => {
  const dragOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const hasMoved = useRef(false);
  // Keep latest props fresh inside the PanResponder closure (created once).
  const propsRef = useRef({ item, onSelect, onPositionChange });
  propsRef.current = { item, onSelect, onPositionChange };

  // Reset offset only after the committed position has propagated via state.
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
          os?.(it.id);
          dragOffset.setValue({ x: 0, y: 0 });
        } else {
          opc(it.id, it.x + gs.dx, it.y + gs.dy);
          // dragOffset reset by useEffect once item.x/y updates.
        }
      },
      onPanResponderTerminate: () => {
        dragOffset.setValue({ x: 0, y: 0 });
      },
    }),
  ).current;

  return (
    <Animated.View
      testID={`${testIDPrefix}-${item.id}`}
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

type SurfaceProps = {
  items: CanvasItemData[];
  width: number;
  height: number;
  onPositionChange: (id: string, x: number, y: number) => void;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  // Editor shows the graph-paper grid; collage-play uses a plain cream tile.
  showGrid?: boolean;
  // 'canvas-item' (editor) | 'home-collage-item' (collage-play).
  itemTestIDPrefix?: string;
  testID?: string;
};

export const OutfitCanvasSurface: React.FC<SurfaceProps> = ({
  items,
  width,
  height,
  onPositionChange,
  selectedId = null,
  onSelect,
  showGrid = false,
  itemTestIDPrefix = 'canvas-item',
  testID,
}) => {
  const sortedItems = [...items].sort((a, b) => a.zIndex - b.zIndex);
  return (
    <View
      testID={testID}
      style={[styles.surface, { width, height }]}
      pointerEvents="box-none"
    >
      {showGrid && <GridBackground width={width} height={height} />}
      {sortedItems.map(item => (
        <DraggableItem
          key={item.id}
          item={item}
          isSelected={selectedId === item.id}
          testIDPrefix={itemTestIDPrefix}
          onSelect={onSelect}
          onPositionChange={onPositionChange}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // Figma canvas card bg = background/primary/subtle_50 (#f2efec). overflow
  // hidden clips items that bleed past the rounded tile edge (collage layout
  // intentionally bleeds — matches Figma section 2850:13589).
  surface: {
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
});
