/**
 * Add-items flow for the Outfit Canvas: warms picked images (bounded prefetch),
 * lays out ONLY the new pieces through the collage engine (existing items keep
 * their hand-edited transforms), then drives the "Adding…" feedback until the
 * new images load. Owns its own adding-state, timing refs and mount guard;
 * operates on the lifted items state via the passed setItems/pushHistory.
 *
 * Behaviour preserved verbatim from OutfitCanvasScreen.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ImageSourcePropType } from 'react-native';
import { WardrobeItem } from '../../services/wardrobeService';
import { CanvasItemData } from '../../components/features/OutfitCanvasSurface';
import { addSeededItems } from '../../components/features/collage-seed-layout';
import { getImageUrl } from '../../utils/url';
import { CANVAS_WIDTH } from './canvas-dimensions';
import {
  ADD_IMAGE_TIMEOUT_MS,
  MIN_ADD_FEEDBACK_MS,
  delay,
  prefetchWithTimeout,
} from './canvas-helpers';

// Test image for canvas preview — fallback source for URI-less picks.
const testJeansImg = require('../../assets/images/test_jeans.png');

interface UseCanvasAddItemsParams {
  setItems: Dispatch<SetStateAction<CanvasItemData[]>>;
  pushHistory: (snapshot: CanvasItemData[]) => void;
  setPickerVisible: Dispatch<SetStateAction<boolean>>;
}

export function useCanvasAddItems({
  setItems,
  pushHistory,
  setPickerVisible,
}: UseCanvasAddItemsParams) {
  // IDs of items just added from the picker whose remote images haven't finished
  // loading yet. Each id clears on its image's onLoadEnd (and a safety timeout
  // clears the rest).
  const [addingIds, setAddingIds] = useState<string[]>([]);
  // The on-canvas "Adding…" status is its own flag (not just `addingIds > 0`) so
  // it can stay up for a minimum perceptible window even when cached images load
  // instantly — see the hide effect below. `addShownAtRef` stamps when it opened.
  const [addStatusVisible, setAddStatusVisible] = useState(false);
  const addShownAtRef = useRef(0);
  // Tracks whether the screen is still mounted so async flows (the picker's
  // prefetch await) can skip their trailing setState if it unmounted mid-flight.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
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
    [pushHistory, setItems, setPickerVisible],
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

  return { addStatusVisible, handlePickerConfirm, handleItemImageLoad };
}
