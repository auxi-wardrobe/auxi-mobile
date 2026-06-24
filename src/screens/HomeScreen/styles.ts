import { StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';
import { motion } from '../../theme/motion';
import { HOME_VIEW_TOGGLE_FOOTER_HEIGHT } from '../../components/features/HomeViewToggleFooter';
import {
  CARD_ASPECT,
  GRID_CONTENT_PAD,
  GRID_GAP,
  OPTION_ACTIONS_HEIGHT,
  screenWidth,
  SHEET_PADDING,
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
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.figmaSurface,
    ...theme.ds.shadow.floatingButton,
  },
  // AI feedback affordance — 44px floating button, bottom-left of the footer,
  // vertically centred against the view-toggle footer.
  aiFeedbackFab: {
    position: 'absolute',
    left: SHEET_PADDING,
    bottom: (HOME_VIEW_TOGGLE_FOOTER_HEIGHT - 44) / 2,
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.l,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.figmaSurface,
    zIndex: theme.zIndex.sticky,
    ...theme.ds.shadow.floatingButton,
  },
  // 12×12 mint indicator dot over the top-right lobe of the header favourites
  // heart — signals "you have saved looks" without a count. Positioned within
  // the 44×44 button so it overlaps the 24×24 heart's upper-right curve.
  favDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.figmaFavouriteDot,
  },
  deckWrap: {
    flex: 1,
    paddingTop: 4,
  },
  // Static footer for the action row (Remix · dots · Refine). Sits below the
  // deck so the row holds still while only the card photo swipes beneath it.
  deckActionRow: {
    paddingHorizontal: SHEET_PADDING,
    paddingTop: theme.spacing.s,
  },
  aiDisclosureRow: {
    paddingHorizontal: SHEET_PADDING,
    paddingVertical: theme.spacing.xs,
    alignItems: 'center',
  },
  // Floating toast/snackbar layer (z-index tier 5). The info snackbars (AI
  // disclosure, "seen them all") float ON TOP of the content — absolutely
  // positioned so they never stack with / push the grid cards. Anchored just
  // below the header, inset 12px from the edges.
  noticeStack: {
    position: 'absolute',
    top: 76,
    left: SHEET_PADDING,
    right: SHEET_PADDING,
    zIndex: theme.zIndex.toast,
    gap: theme.spacing.s,
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
    gap: 4,
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
    flex: 1,
    width: screenWidth,
  },
  optionSheet: {
    flex: 1,
    backgroundColor: theme.colors.white,
    paddingTop: 0,
    paddingHorizontal: SHEET_PADDING,
    paddingBottom: 0,
    justifyContent: 'flex-start',
    gap: 8,
  },
  gridWrap: {
    gap: GRID_GAP,
    paddingVertical: 0,
  },
  gridWrapCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridWrapStart: {
    alignItems: 'stretch',
  },
  gridScroll: {
    flex: 1,
  },
  gridScrollContent: {
    paddingBottom: GRID_CONTENT_PAD,
    // Fill the scroll viewport so the grid (and its full-height tiles) can
    // stretch to the available height instead of hugging the top.
    flexGrow: 1,
  },
  // Stretch the grid + its rows to consume the full sheet height so tiles read
  // full-height and the action/wear cluster is pushed to the bottom.
  gridFill: {
    flex: 1,
  },
  cardRowFill: {
    flex: 1,
  },
  // Loading grid mirrors the loaded `twoByTwo` content padding so the
  // load→loaded swap is shift-free (the real grid lives in a ScrollView whose
  // contentContainer carries `gridScrollContent.paddingBottom`).
  loadingGrid: {
    paddingBottom: GRID_CONTENT_PAD,
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
    // Height-driven so a tile fills the full row height it's given (the grid
    // now stretches to fill the sheet — see gridFill/cardRowFill). aspectRatio
    // keeps the CEO-tracked 3:4 (width = height × 0.75); maxWidth caps the tile
    // to its cell so a tall row can't push the width past the column. Explicit
    // width/height overrides (cardFull, cardFixedSmall, hero rows) still win.
    height: '100%',
    maxWidth: '100%',
    alignSelf: 'center',
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
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.figmaCaptionPillBg,
  },
  loadingPillText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaTextDark,
  },
  // Real footer chrome previewed during loading, dimmed (Figma skeleton-first).
  loadingDim: {
    opacity: motion.opacity.subtle,
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
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.figmaCardTag,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTagText: {
    fontFamily: 'Poppins-Regular',
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
    // 12px gap between the button cluster and the view-toggle footer below.
    paddingBottom: theme.spacing.uacDimension12,
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
    borderColor: theme.colors.uacTextBase,
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
    borderRadius: 16,
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
