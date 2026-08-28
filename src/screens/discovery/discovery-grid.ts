import { Dimensions } from 'react-native';

// AU-457 Discovery — 2-column grid (no Figma this round, see plan.md
// "Workflow deviation"). Mirrors the wardrobe grid's floor-division rationale
// (`screens/wardrobe/wardrobe-grid.ts`): flooring keeps ≥1pt of row slack so
// 2 columns never collapse to 1 on an @2x device's 0.5pt pixel grid.
const { width: screenWidth } = Dimensions.get('window');

export const HORIZONTAL_PADDING = 16;
export const GRID_GAP = 12;
export const GRID_COLUMNS = 2;

export const TILE_WIDTH = Math.floor(
  (screenWidth - HORIZONTAL_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) /
    GRID_COLUMNS,
);
