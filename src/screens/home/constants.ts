import { Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

export const GRID_GAP = 4;
export const SHEET_GAP = 4;
export const SHEET_PADDING = 12;
export const CARD_WIDTH = Math.floor((screenWidth - SHEET_PADDING * 2 - GRID_GAP) / 2);
export const OPTION_SHEET_HEIGHT = Math.round(CARD_WIDTH * (8 / 3) + 140);
export const OPTION_SHEET_SNAP_INTERVAL = OPTION_SHEET_HEIGHT + SHEET_GAP;
export const SNACKBAR_DURATION_MS = 2200;
export const MAX_DUPLICATE_PREFETCH_RETRIES = 3;
