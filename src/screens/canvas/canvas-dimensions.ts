/**
 * Canvas card dimensions, shared by the screen and its extracted hooks.
 * Pure derived constants — extracted verbatim from OutfitCanvasScreen.
 *
 * Figma "remix" frame (node 2852:16582): the canvas card "Image 3:4" is an inset
 * rounded card sitting inside the body's 12px horizontal padding
 * (theme.spacing.uacDimension12 each side), aspect 3:4 (height = width × 4/3).
 */
import { Dimensions } from 'react-native';
import { theme } from '../../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CANVAS_WIDTH = SCREEN_WIDTH - 2 * theme.spacing.uacDimension12;
export const CANVAS_HEIGHT = (CANVAS_WIDTH * 4) / 3;
