import { Item } from '../../types/item';
import { RecommendationMode } from '../../services/recommendationService';
import { MoodFeedbackOutfitRef } from '../../hooks/use-mood-feedback';

export type OutfitSheet = {
  items: Item[];
  outfitHash: string;
  caption?: string | null;
};

export type OutfitSheetWithGrid = OutfitSheet & {
  gridItems: Array<Item | null>;
};

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export type WearThisPayload = MoodFeedbackOutfitRef & {
  outfit: OutfitSheet | OutfitSheetWithGrid;
};

export type BuildViaV05Input = {
  mode?: RecommendationMode;
  style_feedback?: string;
  pinned_item_id?: string | null;
  current_outfit_hash?: string;
  __gen?: number;
  __tempApplyId?: number;
};

export type OutfitReveal = 'full' | 'light' | 'none';
