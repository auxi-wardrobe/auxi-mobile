import React, { useCallback, useEffect, useState } from 'react';
import { Item } from '../../types/item';
import {
  CanvasItemData,
  OutfitCanvasSurface,
} from './OutfitCanvasSurface';
import { seedFromOutfit } from './collage-seed-layout';

// Stateful wrapper around OutfitCanvasSurface for the Home "collage-play" view.
// Keeps HomeScreen thin: seeds the current outfit's items into Figma collage
// positions, owns local drag positions, and re-seeds when the outfit changes
// (e.g. after "Show another"). No editor toolbar — this is the lightweight
// "play" surface; deep editing lives in the full Remix canvas (OutfitCanvas).

type Props = {
  outfitItems: Array<Item | null>;
  surfaceWidth: number;
  surfaceHeight: number;
  testID?: string;
};

// Stable identity for "is this a different outfit?" — re-seed only when the set
// of item ids (or the surface width) changes, so in-progress drags survive
// re-renders but reset when the user rotates to another outfit.
const seedKey = (items: Array<Item | null>, width: number): string =>
  `${width}|${items.map(it => it?.id ?? '_').join(',')}`;

export const CollageSheetCanvas: React.FC<Props> = ({
  outfitItems,
  surfaceWidth,
  surfaceHeight,
  testID,
}) => {
  const [items, setItems] = useState<CanvasItemData[]>(() =>
    seedFromOutfit(outfitItems, surfaceWidth),
  );
  const key = seedKey(outfitItems, surfaceWidth);

  useEffect(() => {
    setItems(seedFromOutfit(outfitItems, surfaceWidth));
    // Re-seed keyed on the outfit identity, not the array reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const handlePositionChange = useCallback(
    (id: string, x: number, y: number) => {
      setItems(prev => prev.map(it => (it.id === id ? { ...it, x, y } : it)));
    },
    [],
  );

  return (
    <OutfitCanvasSurface
      testID={testID}
      items={items}
      width={surfaceWidth}
      height={surfaceHeight}
      onPositionChange={handlePositionChange}
      selectedId={null}
      showGrid={false}
      itemTestIDPrefix="home-collage-item"
    />
  );
};
