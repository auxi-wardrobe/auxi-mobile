import { Outfit } from '../../services/recommendationService';
import { Item } from '../../types/item';
import { TryOnOutfitContext } from '../../types/navigation';
import { OPTION_SHEET_SNAP_INTERVAL } from './constants';
import { OutfitSheet, OutfitSheetWithGrid, SaveState } from './types';

export const buildGrid = (items: Item[]): Array<Item | null> =>
  Array.from({ length: 4 }, (_, index) => items[index] || null);

export const buildOutfitSheet = (outfit: Outfit): OutfitSheet => ({
  items: outfit.items || [],
  outfitHash: outfit.outfit_hash,
  stylingNote: outfit.styling_note || '',
});

export const buildGridOutfitSheet = (outfit: OutfitSheet): OutfitSheetWithGrid => ({
  ...outfit,
  gridItems: buildGrid(outfit.items),
});

export const buildTryOnContext = (outfit: OutfitSheet): TryOnOutfitContext => ({
  outfitHash: outfit.outfitHash,
  itemIds: outfit.items.map((item) => item.id),
  itemImageUrls: outfit.items.map((item) => item.image_url),
  stylingNote: outfit.stylingNote,
});

export const getSaveStateForOutfit = (
  outfit: OutfitSheet | null,
  saveStates: Record<string, SaveState>,
): SaveState => (outfit ? saveStates[outfit.outfitHash] || 'idle' : 'idle');

export const getSheetIndexFromOffset = (offsetY: number): number =>
  Math.round(offsetY / OPTION_SHEET_SNAP_INTERVAL);

export const clearTimeoutRef = (
  timeoutRef: { current: ReturnType<typeof setTimeout> | null },
): void => {
  if (!timeoutRef.current) {
    return;
  }
  clearTimeout(timeoutRef.current);
  timeoutRef.current = null;
};
