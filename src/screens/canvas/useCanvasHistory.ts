/**
 * Undo/redo + item-transform history for the Outfit Canvas. Owns the history
 * ref/index stack and the per-item transform handlers (position/scale/rotation/
 * layer/duplicate/delete). Operates on the `items`/`selectedId` state lifted in
 * the screen (passed in) so it does not change state ownership.
 *
 * Behaviour preserved verbatim from OutfitCanvasScreen:
 * - `canUndo`/`canRedo` are inline ref reads recomputed every render (NOT
 *   memoised) — refs don't trigger renders, so the enabled state is only fresh
 *   because the callers all `setItems`, forcing a re-render that re-reads them.
 * - Every history push marks the canvas dirty via `onDirty` (must be stable).
 * - Handler identities change at the same times as before (stable setters/
 *   pushHistory in deps are referentially stable).
 */
import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { CanvasItemData } from '../../components/features/OutfitCanvasSurface';
import { track } from '../../services/analytics';

type HistorySnapshot = CanvasItemData[];

interface UseCanvasHistoryParams {
  initialItems: CanvasItemData[];
  items: CanvasItemData[];
  selectedId: string | null;
  setItems: Dispatch<SetStateAction<CanvasItemData[]>>;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  /** Marks the canvas dirty on every history push. Must be referentially stable. */
  onDirty: () => void;
}

export function useCanvasHistory({
  initialItems,
  items,
  selectedId,
  setItems,
  setSelectedId,
  onDirty,
}: UseCanvasHistoryParams) {
  const history = useRef<HistorySnapshot[]>([initialItems]);
  const historyIndex = useRef(0);

  const pushHistory = useCallback(
    (snapshot: CanvasItemData[]) => {
      const newHistory = history.current.slice(0, historyIndex.current + 1);
      newHistory.push(snapshot);
      history.current = newHistory;
      historyIndex.current = newHistory.length - 1;
      // Every history push is a user edit → mark the canvas dirty.
      onDirty();
    },
    [onDirty],
  );

  const canUndo = historyIndex.current > 0;
  const canRedo = historyIndex.current < history.current.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo) {
      return;
    }
    historyIndex.current -= 1;
    setItems(history.current[historyIndex.current]);
    setSelectedId(null);
  }, [canUndo, setItems, setSelectedId]);

  const handleRedo = useCallback(() => {
    if (!canRedo) {
      return;
    }
    historyIndex.current += 1;
    setItems(history.current[historyIndex.current]);
    setSelectedId(null);
  }, [canRedo, setItems, setSelectedId]);

  // Item actions
  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(prev => (prev === id ? null : id));
    },
    [setSelectedId],
  );

  const handlePositionChange = useCallback(
    (id: string, x: number, y: number) => {
      setItems(prev => {
        const next = prev.map(it => (it.id === id ? { ...it, x, y } : it));
        pushHistory(next);
        return next;
      });
    },
    [setItems, pushHistory],
  );

  const handleScaleChange = useCallback(
    (id: string, scale: number) => {
      setItems(prev => {
        const next = prev.map(it => (it.id === id ? { ...it, scale } : it));
        pushHistory(next);
        return next;
      });
    },
    [setItems, pushHistory],
  );

  const handleRotationChange = useCallback(
    (id: string, rotation: number) => {
      setItems(prev => {
        const next = prev.map(it => (it.id === id ? { ...it, rotation } : it));
        pushHistory(next);
        return next;
      });
    },
    [setItems, pushHistory],
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
    [selectedId, items, setItems, pushHistory],
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
  }, [selectedId, setItems, pushHistory]);

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
  }, [selectedId, setItems, setSelectedId, pushHistory]);

  // Reset the history stack to a single blank snapshot. The caller owns
  // clearing items/selection/dirty so the SAME `blank` array is shared here and
  // in the caller's setItems (identical to the original inline reset).
  const resetHistory = useCallback((blank: CanvasItemData[]) => {
    history.current = [blank];
    historyIndex.current = 0;
  }, []);

  return {
    pushHistory,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    handleSelect,
    handlePositionChange,
    handleScaleChange,
    handleRotationChange,
    handleLayerUp,
    handleLayerDown,
    handleDuplicate,
    handleDelete,
    resetHistory,
  };
}
