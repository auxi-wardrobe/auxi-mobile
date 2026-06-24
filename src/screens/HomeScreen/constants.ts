import { Dimensions } from 'react-native';
import { COLLAGE_ASPECT } from '../../components/features/collage-seed-layout';
import { HOME_VIEW_TOGGLE_FOOTER_HEIGHT } from '../../components/features/HomeViewToggleFooter';
import { OUTFITS_PER_SET } from '../../utils/groupOutfitsIntoSets';

export const { width: screenWidth, height: screenHeight } =
  Dimensions.get('window');

export const PIN_DONT_SHOW_STORAGE_KEY = '@auxi/pin/dont_show_confirm';
// Persisted so the "AI-generated — may be inaccurate" toast shows only the
// first time; afterwards the floating feedback button is the affordance.
export const AI_NOTICE_DISMISSED_KEY = '@auxi/ai_notice/dismissed';

export const GRID_GAP = 4;
export const SHEET_GAP = 4;
export const SHEET_PADDING = 12;
export const SHEET_PADDING_V = 8;
export const GRID_CONTENT_PAD = 8;
export const SMALL_CARD_WIDTH = 127.3;
export const SMALL_CARD_HEIGHT = 169.733;
export const CARD_ASPECT = 0.75;

export const OPTION_SHEET_VPAD = 36;
export const OPTION_ACTIONS_HEIGHT = 88;

export const MAX_CARD_WIDTH = Math.floor(
  (screenWidth - SHEET_PADDING * 2 - GRID_GAP) / 2,
);

export const APPROX_TOP_CHROME = 67;
export const APPROX_BOTTOM_SAFE = 34;
export const APPROX_TOP_SAFE = 59;
export const WEAR_THIS_FOOTER_HEIGHT = 72;

export const AVAILABLE_VIEWPORT =
  screenHeight -
  APPROX_TOP_SAFE -
  APPROX_BOTTOM_SAFE -
  APPROX_TOP_CHROME -
  HOME_VIEW_TOGGLE_FOOTER_HEIGHT -
  WEAR_THIS_FOOTER_HEIGHT;

// Tiles are full-width with a locked 3:4 aspect ratio, so the grid's natural
// height is two tile-heights (MAX_CARD_WIDTH / CARD_ASPECT) plus the row gap.
// Add the grid's own vertical padding so the sheet is tall enough to show the
// full-width tiles without scrolling on roomy screens.
export const COMPUTED_SHEET_HEIGHT = Math.round(
  (MAX_CARD_WIDTH / CARD_ASPECT) * 2 +
    GRID_GAP +
    SHEET_PADDING_V * 2 +
    GRID_CONTENT_PAD +
    OPTION_ACTIONS_HEIGHT +
    OPTION_SHEET_VPAD,
);
export const OPTION_SHEET_HEIGHT = Math.min(
  COMPUTED_SHEET_HEIGHT,
  AVAILABLE_VIEWPORT,
);

export const GRID_AREA_H =
  OPTION_SHEET_HEIGHT - OPTION_ACTIONS_HEIGHT - OPTION_SHEET_VPAD;
export const GRID_FIT_H = GRID_AREA_H - GRID_CONTENT_PAD - SHEET_PADDING_V * 2;
export const CARD_HEIGHT = Math.floor((GRID_FIT_H - GRID_GAP) / 2);
export const CARD_WIDTH = Math.round(CARD_HEIGHT * CARD_ASPECT);

export const COLLAGE_SURFACE_WIDTH = screenWidth - SHEET_PADDING * 2;
export const COLLAGE_SURFACE_HEIGHT = Math.round(
  COLLAGE_SURFACE_WIDTH * COLLAGE_ASPECT,
);

export const TARGET_AHEAD = OUTFITS_PER_SET;

// Progressive refinement: after this many distinct outfits are viewed within a
// tier (2 batches of 3), auto-generation pauses and the Refine sheet opens so
// the AI can gather a preference signal before producing more. Submitting
// feedback or skipping resets the tier and unlocks the next 6.
export const REFINE_AFTER_OUTFITS = 6;

export const MOOD_BANNER_DURATION_MS = 3000;
