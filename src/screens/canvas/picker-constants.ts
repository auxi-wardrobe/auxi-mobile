/**
 * Item-picker layout constants + category mapping, shared by ItemPickerPanel and
 * its stylesheet. Extracted verbatim from OutfitCanvasScreen so the picker panel
 * is self-contained.
 */
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Offscreen-right resting X for the panel's slide animation (panel is full width).
export const PICKER_PANEL_OFFSCREEN_X = SCREEN_WIDTH;

export const PICKER_COLUMNS = 3;
export const PICKER_GAP = 4;
export const PICKER_TILE =
  (SCREEN_WIDTH - 32 - PICKER_GAP * (PICKER_COLUMNS - 1)) / PICKER_COLUMNS;
export const PICKER_TILE_HEIGHT = PICKER_TILE * (4 / 3);

export const PICKER_FILTER_TABS = [
  'All',
  'Tops',
  'Bottoms',
  'Shoes',
  'One-piece',
  'AC',
] as const;
export type PickerFilterTab = (typeof PICKER_FILTER_TABS)[number];

export const resolvePickerCategory = (
  tab: PickerFilterTab,
): string | undefined => {
  switch (tab) {
    case 'Tops':
      return 'top';
    case 'Bottoms':
      return 'bottom';
    case 'Shoes':
      return 'shoes';
    case 'One-piece':
      return 'one_piece';
    case 'AC':
      return 'accessory';
    default:
      return undefined;
  }
};
