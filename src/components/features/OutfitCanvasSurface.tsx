import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  ImageSourcePropType,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';
import { theme } from '../../theme/theme';
import { motion } from '../../theme/motion';

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
  scale?: number;
  rotation?: number;
  // Raw item category, carried so the editor can re-seed the layout via the
  // collage engine when items are added (newly added items follow the same rule).
  category?: string;
  // Originating wardrobe item id (the `id` above is a synthetic per-instance
  // key). Carried so a saved creation can launch Self Visualization / try-on,
  // which needs real wardrobe item ids. Absent for mock/seeded items.
  wardrobeItemId?: string;
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
  // Fired on a discrete TAP (press-release without a drag). Unlike `onSelect`
  // — which only fires on release in `immediate` drag mode — this is an RNGH
  // Tap gesture, so it also fires in `longPress` mode (the Home collage), where
  // the drag PanResponder declines a plain tap and `onSelect` never runs.
  onTap?: (id: string) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  onScaleChange?: (id: string, scale: number) => void;
  onRotationChange?: (id: string, rotation: number) => void;
  // Fired true when a drag is armed/active, false when it ends. Lets the parent
  // disable its ScrollView so a native scroll can't steal the in-progress drag.
  onDragActiveChange?: (active: boolean) => void;
  // Fired when this item's image finishes loading (success or failure). Lets the
  // parent clear a per-item "adding…" status once freshly-added remote images
  // have decoded onto the canvas.
  onImageLoad?: (id: string) => void;
  enablePinchZoom?: boolean;
}

const DraggableItem: React.FC<DraggableItemProps> = ({
  item,
  isSelected,
  testIDPrefix,
  dragActivation,
  onSelect,
  onTap,
  onPositionChange,
  onScaleChange,
  onRotationChange,
  onDragActiveChange,
  onImageLoad,
  enablePinchZoom = false,
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
  
  // Pinch zoom and rotation state
  const scale = useRef(new Animated.Value(item.scale || 1)).current;
  const rotation = useRef(new Animated.Value(item.rotation || 0)).current;
  const baseScale = useRef(item.scale || 1);
  const baseRotation = useRef(item.rotation || 0);
  
  // Keep latest props fresh inside the PanResponder / gesture closures (created
  // once).
  const propsRef = useRef({
    item,
    onSelect,
    onTap,
    onPositionChange,
    dragActivation,
    onDragActiveChange,
    onScaleChange,
    onRotationChange,
  });
  propsRef.current = {
    item,
    onSelect,
    onTap,
    onPositionChange,
    dragActivation,
    onDragActiveChange,
    onScaleChange,
    onRotationChange,
  };

  // Reset offset only after the committed position has propagated via state.
  useEffect(() => {
    dragOffset.setValue({ x: 0, y: 0 });
  }, [item.x, item.y, dragOffset]);

  // Reset scale and rotation when item props change
  useEffect(() => {
    scale.setValue(item.scale || 1);
    rotation.setValue(item.rotation || 0);
    baseScale.current = item.scale || 1;
    baseRotation.current = item.rotation || 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.scale, item.rotation]);

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
      stiffness: motion.spring.soft.stiffness,
      damping: motion.spring.soft.damping,
    }).start();
  };

  // Pinch gesture using new Gesture API
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      baseScale.current = item.scale || 1;
    })
    .onUpdate((event) => {
      const newScale = baseScale.current * event.scale;
      const clampedScale = Math.max(0.5, Math.min(3, newScale));
      scale.setValue(clampedScale);
    })
    .onEnd((event) => {
      const newScale = baseScale.current * event.scale;
      const clampedScale = Math.max(0.5, Math.min(3, newScale));
      scale.setValue(clampedScale);
      baseScale.current = clampedScale;
      propsRef.current.onScaleChange?.(item.id, clampedScale);
    });

  // Rotation gesture using new Gesture API
  const rotationGesture = Gesture.Rotation()
    .onStart(() => {
      baseRotation.current = item.rotation || 0;
    })
    .onUpdate((event) => {
      // Multiply by 4 to increase rotation sensitivity
      const newRotation = baseRotation.current + (event.rotation * 50);
      rotation.setValue(newRotation);
    })
    .onEnd((event) => {
      // Multiply by 4 to increase rotation sensitivity
      const newRotation = baseRotation.current + (event.rotation * 50);
      rotation.setValue(newRotation);
      baseRotation.current = newRotation;
      propsRef.current.onRotationChange?.(item.id, newRotation);
    });

  // Combine pinch and rotation gestures to work simultaneously
  const combinedGesture = Gesture.Simultaneous(pinchGesture, rotationGesture);

  // Discrete tap → open the item (e.g. its detail). A recognized tap requires
  // little movement, so it never competes with a hold-drag: a quick tap fires
  // this while the longPress PanResponder stays inert; a press-and-drag moves
  // past the tap slop and this fails, leaving the drag to the PanResponder.
  const tapGesture = Gesture.Tap()
    .maxDuration(500)
    .onEnd((_event, success) => {
      if (success) {
        propsRef.current.onTap?.(propsRef.current.item.id);
      }
    });

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
        // New touch begins → make sure paging scroll is re-enabled (heals any
        // leak from an armed-but-not-dragged previous touch).
        propsRef.current.onDragActiveChange?.(false);
        clearTimer();
        longPressTimer.current = setTimeout(() => {
          armed.current = true;
          // Item picked up → freeze the parent ScrollView so the drag can't be
          // stolen by a native scroll.
          propsRef.current.onDragActiveChange?.(true);
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
        if (
          Math.abs(gs.dx) > MOVE_THRESHOLD ||
          Math.abs(gs.dy) > MOVE_THRESHOLD
        ) {
          clearTimer();
        }
        return false;
      },
      onMoveShouldSetPanResponder: () => armed.current,
      onPanResponderGrant: () => {
        hasMoved.current = false;
        setLifted(true);
        // Covers immediate mode (no arm step) + idempotent for longPress.
        propsRef.current.onDragActiveChange?.(true);
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
        propsRef.current.onDragActiveChange?.(false);
      },
      onPanResponderTerminate: () => {
        clearTimer();
        setLifted(false);
        dragOffset.setValue({ x: 0, y: 0 });
        armed.current = propsRef.current.dragActivation === 'immediate';
        propsRef.current.onDragActiveChange?.(false);
      },
      // Don't yield an in-progress armed drag back to the ScrollView.
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  // Cleanup the hold timer if the item unmounts mid-press.
  useEffect(() => clearTimer, []);

  const renderItem = () => (
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
              scale: enablePinchZoom
                ? Animated.multiply(
                    scale,
                    lift.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.06],
                    })
                  )
                : lift.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.06],
                  }),
            },
            {
              rotate: enablePinchZoom
                ? rotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  })
                : '0deg',
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
        onLoadEnd={() => onImageLoad?.(item.id)}
      />
    </Animated.View>
  );

  if (enablePinchZoom) {
    // Editor: pinch/rotate. Compose the tap in too when a handler is supplied
    // so the two don't fight (tap loses to an active pinch by design).
    const gesture = onTap
      ? Gesture.Simultaneous(combinedGesture, tapGesture)
      : combinedGesture;
    return <GestureDetector gesture={gesture}>{renderItem()}</GestureDetector>;
  }

  // Collage-play (Home): no pinch, but a tap opens the item's detail.
  if (onTap) {
    return (
      <GestureDetector gesture={tapGesture}>{renderItem()}</GestureDetector>
    );
  }

  return renderItem();
};

type SurfaceProps = {
  items: CanvasItemData[];
  width: number;
  height: number;
  onPositionChange: (id: string, x: number, y: number) => void;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  // Tap an item (press-release, no drag) — used by the Home collage to open the
  // item's detail. See DraggableItemProps.onTap for why this is separate from
  // onSelect. Omit it to keep items non-tappable (the full Remix editor does).
  onItemTap?: (id: string) => void;
  onScaleChange?: (id: string, scale: number) => void;
  onRotationChange?: (id: string, rotation: number) => void;
  // Editor shows the graph-paper grid; collage-play uses a plain cream tile.
  showGrid?: boolean;
  // 'canvas-item' (editor) | 'home-collage-item' (collage-play).
  itemTestIDPrefix?: string;
  // 'immediate' (editor, default) | 'longPress' (collage, inside a ScrollView).
  dragActivation?: DragActivation;
  // Notifies the parent when a drag is armed/active so it can freeze its scroll.
  onDragActiveChange?: (active: boolean) => void;
  // Notifies the parent when an item's image has finished loading.
  onImageLoad?: (id: string) => void;
  testID?: string;
  enablePinchZoom?: boolean;
};

export const OutfitCanvasSurface: React.FC<SurfaceProps> = ({
  items,
  width,
  height,
  onPositionChange,
  selectedId = null,
  onSelect,
  onItemTap,
  onScaleChange,
  onRotationChange,
  showGrid = false,
  itemTestIDPrefix = 'canvas-item',
  dragActivation = 'immediate',
  onDragActiveChange,
  onImageLoad,
  testID,
  enablePinchZoom = false,
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
          onTap={onItemTap}
          onPositionChange={onPositionChange}
          onScaleChange={onScaleChange}
          onRotationChange={onRotationChange}
          onDragActiveChange={onDragActiveChange}
          onImageLoad={onImageLoad}
          enablePinchZoom={enablePinchZoom}
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
    borderRadius: 4,
  },
});
