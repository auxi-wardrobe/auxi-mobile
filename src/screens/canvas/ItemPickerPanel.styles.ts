/**
 * Styles for ItemPickerPanel. Extracted verbatim (was `pickerStyles` in
 * OutfitCanvasScreen) so the panel component stays focused.
 */
import { StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';
import { PICKER_GAP, PICKER_TILE, PICKER_TILE_HEIGHT } from './picker-constants';

export const pickerStyles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.figmaBackground,
    zIndex: theme.zIndex.sticky,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.m,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.figmaDivider,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: theme.colors.figmaTextPrimary,
  },
  body: {
    flex: 1,
    paddingTop: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  loading: {
    marginTop: 40,
    alignSelf: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PICKER_GAP,
  },
  tile: {
    width: PICKER_TILE,
    height: PICKER_TILE_HEIGHT,
    borderRadius: theme.borderRadius.m,
    overflow: 'hidden',
    backgroundColor: '#E8EBF0',
  },
  tileSelected: {
    borderRadius: 12,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileFallbackText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: theme.colors.figmaTextSecondary,
    fontFamily: 'Inter-Regular',
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.figmaDivider,
  },
  confirmBtn: {
    backgroundColor: theme.colors.figmaPrimaryButtonBg,
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  confirmBtnLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: theme.colors.figmaPrimaryButtonText,
    letterSpacing: 0.15,
  },
});
