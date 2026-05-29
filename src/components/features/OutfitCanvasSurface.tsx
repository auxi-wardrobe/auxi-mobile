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

// Hold duration (ms) before an item becomes draggable in `longPress` mode.
const LONG_PRESS_MS = 180;
// Movement (px) that counts as a real drag/swipe (vs a tap jitter).
const MOVE_THRESHOLD = 6;

// How an item starts dragging:
// - 'immediate' (editor): claim the touch on press — there's no scroll to fight.
// - 'longPress' (collage): the item lives inside Home's paging ScrollView, so a
//   quick swipe must page/scroll while a press-and-hold picks the item up to
//   drag. This is how we DISAMBIGUATE swipe vs drag-drop.
export type DragActivation = 'immediate' | 'longPress';

// --- Draggable canvas item ---
interface DraggableItemProps {
  item: CanvasItemData;
  isSelected: boolean;
  testIDPrefix: string;
  dragActivation: DragActivation;
  onSelect?: (id: string) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
}

const DraggableItem: React.FC<DraggableItemProps> = ({
  item,
  isSelected,
  testIDPrefix,
  dragActivation,
  onSelect,
  onPositionChange,
}) => {
  const dragOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  // 0 → 1 "lifted" cue (scale up) while an armed drag is in progress.
  const lift = useRef(new Animated.Value(0)).current;
  const hasMoved = useRef(false);
  // In longPress mode the item is NOT draggable until the hold timer arms it;
  // in immediate mode it is always armed. `armed` gates whether a move on this
  // item captures the gesture (drag) or falls through to the ScrollView (swipe).
  const armed = useRef(dragActivation === 'immediate');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep latest props fresh inside the PanResponder closure (created once).
  const propsRef = useRef({ item, onSelect, onPositionChange, dragActivation });
  propsRef.current = { item, onSelect, onPositionChange, dragActivation };

  // Reset offset only after the committed position has propagated via state.
  useEffect(() => {
    dragOffset.setValue({ x: 0, y: 0 });
  }, [item.x, item.y, dragOffset]);

  const clearTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const setLifted = (on: boolean) => {
    Animated.spring(lift, {
      toValue: on ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      // START — claim immediately only in immediate mode. In longPress mode we
      // decline the touch (so a swipe can scroll) and start the hold timer that
      // arms dragging if the finger stays put.
      onStartShouldSetPanResponder: () => {
        if (propsRef.current.dragActivation === 'immediate') {
          armed.current = true;
          return true;
        }
        armed.current = false;
        clearTimer();
        longPressTimer.current = setTimeout(() => {
          armed.current = true;
        }, LONG_PRESS_MS);
        return false;
      },
      // MOVE (capture phase) — once armed, capture the move BEFORE the native
      // ScrollView so the drag wins. While not armed, a real move means the user
      // is swiping: cancel the hold timer and let the ScrollView scroll.
      onMoveShouldSetPanResponderCapture: (_, gs) => {
        if (armed.current) {
          return true;
        }
        if (Math.abs(gs.dx) > MOVE_THRESHOLD || Math.abs(gs.dy) > MOVE_THRESHOLD) {
          clearTimer();
        }
        return false;
      },
      onMoveShouldSetPanResponder: () => armed.current,
      onPanResponderGrant: () => {
        hasMoved.current = false;
        setLifted(true);
      },
      onPanResponderMove: (_, gs) => {
        if (
          Math.abs(gs.dx) > MOVE_THRESHOLD ||
          Math.abs(gs.dy) > MOVE_THRESHOLD
        ) {
          hasMoved.current = true;
        }
        dragOffset.setValue({ x: gs.dx, y: gs.dy });
      },
      onPanResponderRelease: (_, gs) => {
        clearTimer();
        setLifted(false);
        const {
          item: it,
          onSelect: os,
          onPositionChange: opc,
          dragActivation: da,
        } = propsRef.current;
        if (!hasMoved.current) {
          os?.(it.id);
          dragOffset.setValue({ x: 0, y: 0 });
        } else {
          opc(it.id, it.x + gs.dx, it.y + gs.dy);
          // dragOffset reset by useEffect once item.x/y updates.
        }
        armed.current = da === 'immediate';
      },
      onPanResponderTerminate: () => {
        clearTimer();
        setLifted(false);
        dragOffset.setValue({ x: 0, y: 0 });
        armed.current = propsRef.current.dragActivation === 'immediate';
      },
      // Don't yield an in-progress armed drag back to the ScrollView.
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  // Cleanup the hold timer if the item unmounts mid-press.
  useEffect(() => clearTimer, []);

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
          transform: [
            ...dragOffset.getTranslateTransform(),
            {
              scale: lift.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.06],
              }),
            },
          ],
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
  // 'immediate' (editor, default) | 'longPress' (collage, inside a ScrollView).
  dragActivation?: DragActivation;
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
  dragActivation = 'immediate',
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
          dragActivation={dragActivation}
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
