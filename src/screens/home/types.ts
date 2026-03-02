import { Item } from '../../types/item';

export type OutfitSheet = {
  items: Item[];
  outfitHash: string;
  stylingNote: string;
};

export type OutfitSheetWithGrid = OutfitSheet & {
  gridItems: Array<Item | null>;
};

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
