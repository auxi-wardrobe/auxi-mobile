import { StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';
import { motion } from '../../theme/motion';
import { HOME_VIEW_TOGGLE_FOOTER_HEIGHT } from '../../components/features/HomeViewToggleFooter';
import {
  CARD_ASPECT,
  CARD_HEIGHT,
  GRID_AREA_H,
  GRID_CONTENT_PAD,
  GRID_GAP,
  OPTION_ACTIONS_HEIGHT,
  OPTION_SHEET_HEIGHT,
  screenWidth,
  SHEET_GAP,
  SHEET_PADDING,
  SHEET_PADDING_V,
  SMALL_CARD_HEIGHT,
  SMALL_CARD_WIDTH,
  WEAR_THIS_FOOTER_HEIGHT,
} from './constants';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaSurface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.figmaTile,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.figmaSurface,
    ...theme.ds.shadow.floatingButton,
  },
  heartButtonSaved: {
    borderWidth: 1.5,
    borderColor: theme.colors.figmaAction,
  },
  heartButtonError: {
    borderWidth: 1.5,
    borderColor: theme.colors.figmaRed,
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 24,
    gap: SHEET_GAP,
  },
  deckWrap: {
    flex: 1,
    paddingTop: 4,
  },
  aiDisclosureRow: {
    paddingHorizontal: SHEET_PADDING,
    paddingVertical: theme.spacing.xs,
    alignItems: 'center',
  },
  deckCue: {
    position: 'absolute',
    top: 16,
    zIndex: theme.zIndex.content,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.white,
    borderWidth: 1.5,
    borderColor: theme.colors.uacTextBase,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: theme.colors.uacTextBase,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  deckCueLike: {
    right: 24,
  },
  deckCueSkip: {
    left: 24,
  },
  deckCueSkipText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  outfitCell: {
    width: screenWidth,
  },
  optionSheet: {
    height: OPTION_SHEET_HEIGHT,
    backgroundColor: theme.colors.white,
    paddingTop: 12,
    paddingHorizontal: SHEET_PADDING,
    paddingBottom: 24,
    justifyContent: 'flex-start',
    gap: 8,
  },
  gridWrap: {
    gap: GRID_GAP,
    paddingVertical: SHEET_PADDING_V,
  },
  gridWrapCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridWrapStart: {
    alignItems: 'stretch',
  },
  gridScroll: {
    maxHeight: GRID_AREA_H,
  },
  gridScrollContent: {
    paddingBottom: GRID_CONTENT_PAD,
  },
  loadingCards: {
    gap: GRID_GAP,
  },
  cardRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
    justifyContent: 'center',
  },
  cardShell: {
    flex: 1,
  },
  cardShellFixed: {
    flex: 1,
  },
  cardShellNarrow: {
    flexGrow: 0,
    width: SMALL_CARD_WIDTH,
  },
  cardFull: {
    width: '100%',
    height: undefined,
    aspectRatio: CARD_ASPECT,
  },
  cardFixedSmall: {
    width: SMALL_CARD_WIDTH,
    height: SMALL_CARD_HEIGHT,
  },
  cardCellHidden: {
    opacity: 0,
  },
  card: {
    width: '100%',
    aspectRatio: CARD_ASPECT,
    borderRadius: theme.borderRadius.figmaTile,
    backgroundColor: theme.colors.figmaCardSurface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPlaceholder: {
    backgroundColor: 'transparent',
  },
  heroRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },
  heroCol: {
    flex: 2,
  },
  heroStackCol: {
    flex: 1,
    gap: GRID_GAP,
  },
  heroStackCell: {
    flex: 1,
  },
  yourPieceBadge: {
    position: 'absolute',
    top: theme.spacing.s,
    left: theme.spacing.s,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.figmaCardTag,
  },
  yourPieceBadgeText: {
    ...theme.typography.aliases.interSemiboldXs,
    color: theme.colors.uacTextPrimaryBase,
  },
  loadingPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    height: 32,
    maxWidth: 336,
    paddingHorizontal: theme.spacing.uacDimension12,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.figmaCaptionPillBg,
  },
  loadingPillText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaTextDark,
  },
  loadingSlotShell: {
    height: CARD_HEIGHT,
  },
  loadingFooterChrome: {
    opacity: motion.opacity.subtle,
    gap: theme.spacing.uacDimension8,
  },
  loadingWearThis: {
    minHeight: 56,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
  },
  loadingWearThisText: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.figmaCtaLabel,
  },
  placeholderCard: {
    backgroundColor: 'transparent',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.figmaBackground,
  },
  cardTag: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    alignItems: 'center',
  },
  cardTagPill: {
    height: 19,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.figmaCardTag,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTagText: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    lineHeight: 12,
    color: theme.colors.white,
    textAlign: 'center',
  },
  actionCluster: {
    gap: 12,
    alignItems: 'center',
  },
  primaryAction: {
    alignSelf: 'stretch',
  },
  wearThisFooter: {
    paddingHorizontal: SHEET_PADDING,
    paddingTop: theme.spacing.uacDimension8,
    paddingBottom: theme.spacing.uacDimension8,
  },
  primaryActionFull: {
    alignSelf: 'stretch',
    borderRadius: 16,
    borderColor: theme.colors.uacBorderBase,
  },
  primaryActionLabel: {
    color: theme.colors.figmaCtaLabel,
  },
  saveErrorText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaRed,
    textAlign: 'center',
  },
  secondaryAction: {
    height: 56,
  },
  secondaryActionText: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaAction,
  },
  errorState: {
    flex: 1,
    minHeight: 320,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorStateTitle: {
    ...theme.typography.aliases.poppinsButton,
    fontSize: 18,
    color: theme.colors.figmaText,
    textAlign: 'center',
  },
  errorStateBody: {
    ...theme.typography.aliases.poppinsBody,
    fontSize: 14,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
  errorStateRetry: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.figmaText,
  },
  errorStateRetryLabel: {
    ...theme.typography.aliases.poppinsButton,
    fontSize: 16,
    color: theme.colors.figmaText,
  },
  loadingMoreIndicator: {
    marginHorizontal: 24,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: theme.colors.figmaSurfaceSoft,
    borderWidth: 1,
    borderColor: theme.colors.figmaDivider,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loadingMoreText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaAction,
  },
  cycledHint: {
    marginHorizontal: SHEET_PADDING,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.figmaSurfaceSoft,
    alignSelf: 'center',
  },
  cycledHintText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
  },
  pinGeneratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: SHEET_PADDING,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.figmaCaptionPillBg,
    alignSelf: 'center',
  },
  pinGeneratingHeaderText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextPrimary,
  },
  pinBannerFloat: {
    position: 'absolute',
    left: SHEET_PADDING,
    right: SHEET_PADDING,
    bottom:
      HOME_VIEW_TOGGLE_FOOTER_HEIGHT +
      WEAR_THIS_FOOTER_HEIGHT +
      OPTION_ACTIONS_HEIGHT +
      theme.spacing.s,
    zIndex: theme.zIndex.sticky,
    borderRadius: 12,
    ...theme.ds.shadow.card,
  },
  pinGuestBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    backgroundColor: theme.colors.figmaCaptionPillBg,
    borderRadius: 12,
    gap: theme.spacing.s,
  },
  pinGuestText: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextPrimary,
    flexShrink: 1,
  },
  pinGuestCta: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.xs,
    borderRadius: 999,
    backgroundColor: theme.colors.figmaAction,
  },
  pinGuestCtaText: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.white,
  },
  moodBanner: {
    position: 'absolute',
    zIndex: theme.zIndex.toast,
    left: theme.spacing.m,
    right: theme.spacing.m,
    bottom: HOME_VIEW_TOGGLE_FOOTER_HEIGHT + theme.spacing.l,
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.m,
    borderRadius: 12,
    backgroundColor: theme.colors.figmaAction,
  },
  moodBannerText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaSurface,
    textAlign: 'center',
  },
});
