// useDiscoveryMasonry — cover aspect ratios + column assignment for the
// Discovery feed's Pinterest layout (AU-457).
//
// The feed contract carries no image dimensions (`composite_image_url` is just
// a URL), so "height follows whatever the admin uploaded" has to be measured
// on the client. `Image.getSize` reads the real pixel size off the network
// image; the browser/native image cache then makes the subsequent <Image>
// render a cache hit, so the measurement costs one fetch, not two.
//
// Sizes are resolved BEFORE a tile is placed, never after. Placing a tile at a
// guessed height and correcting it later would reshuffle every tile below it
// (see `packMasonry` — greedy packing is prefix-stable only while the placed
// heights are final), which in a feed means the thing under your thumb moves
// as you reach for it.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'react-native';
import {
  DEFAULT_TILE_RATIO,
  clampTileRatio,
  packMasonry,
  type MasonryLayout,
} from './discovery-grid';

interface Sizeable {
  id: string;
  composite_image_url: string | null;
}

/**
 * A cover that never answers must not stall the feed behind it — `getSize`
 * has no timeout of its own and a dead CDN edge can hang for the socket's
 * lifetime. After this the tile is placed at the fallback ratio.
 */
const SIZE_TIMEOUT_MS = 4000;

export interface UseDiscoveryMasonry<T> extends MasonryLayout<T> {
  /** True while the leading unplaced item is still being measured. */
  sizing: boolean;
}

export const useDiscoveryMasonry = <T extends Sizeable>(
  items: T[],
): UseDiscoveryMasonry<T> => {
  // id -> width/height. Keyed by outfit id (not array position) so a filter
  // change or a re-fetch reuses what is already measured instead of blanking
  // the grid.
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const requestedRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    items.forEach(item => {
      if (requestedRef.current.has(item.id)) {
        return;
      }
      requestedRef.current.add(item.id);

      const settle = (ratio: number) => {
        if (!mountedRef.current) {
          return;
        }
        setRatios(prev =>
          prev[item.id] === undefined
            ? { ...prev, [item.id]: clampTileRatio(ratio) }
            : prev,
        );
      };

      const url = item.composite_image_url;
      if (!url) {
        settle(DEFAULT_TILE_RATIO);
        return;
      }

      const timer = setTimeout(() => settle(DEFAULT_TILE_RATIO), SIZE_TIMEOUT_MS);
      timers.push(timer);
      Image.getSize(
        url,
        (width, height) => {
          clearTimeout(timer);
          settle(height > 0 ? width / height : DEFAULT_TILE_RATIO);
        },
        () => {
          clearTimeout(timer);
          // Failed to size — the card falls back to its placeholder frame,
          // which needs a height like any other tile.
          settle(DEFAULT_TILE_RATIO);
        },
      );
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [items]);

  const layout = useMemo(
    () => packMasonry(items, item => ratios[item.id]),
    [items, ratios],
  );

  return { ...layout, sizing: layout.placed < items.length };
};
