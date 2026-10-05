import { StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';

// AU-458 Make It Yours panels (Figma section 5456:18648). The panel replaces
// the Discovery detail's body under the cover image; geometry from
// 5456:19150 (result), 5456:19480 (loading), 5456:19861 (no match):
// padding 16 + 12 top, 16 between blocks, title H4 SemiBold 24/32 centred.

/** Figma dimension/4 — gap between the outfit's 3:4 item tiles. */
const TILE_GAP = theme.spacing.xs;

/** Matches `DiscoveryItemStrip`'s THUMB_SIZE so owned pieces read at the same scale. */
const STRIP_TILE_WIDTH = 96;

export const makeItYoursStyles = StyleSheet.create({
  panel: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.m + theme.spacing.uacDimension12,
    alignItems: 'center',
    gap: theme.spacing.m,
  },
  title: {
    ...theme.typography.aliases.interH4SemiBold,
    color: theme.ds.color.ink,
    textAlign: 'center',
  },
  // Loading (5456:19658): mascot 80 → 8 → title → 8 → steps.
  loadingBlock: {
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  steps: {
    alignItems: 'center',
  },
  step: {
    ...theme.typography.aliases.interBodySm,
    color: theme.ds.color.ink,
    textAlign: 'center',
  },
  // Message states (no match / partial / no wardrobe / error).
  messageBlock: {
    alignItems: 'center',
    gap: theme.spacing.s,
    paddingHorizontal: theme.spacing.l,
  },
  messageTitle: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.ds.color.ink,
    textAlign: 'center',
  },
  messageBody: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.ds.color.ink,
    textAlign: 'center',
  },
  // Result (5456:19280): tiles → 8 → dots; prompt below.
  resultBlock: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  pager: {
    alignSelf: 'stretch',
  },
  page: {
    flexDirection: 'row',
    gap: TILE_GAP,
  },
  // "Discover more options" page after the last revealed outfit; the pager
  // sizes it to the outfit pages' height, the CTA sits centred in it.
  morePage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: theme.ds.radius.sm,
    backgroundColor: theme.ds.color.cream,
    overflow: 'hidden',
  },
  // Partial-state strip: fixed-width tiles (same 96 width as the Discovery
  // item strip) so any number of pieces scrolls instead of shrinking.
  stripContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  stripTile: {
    flex: 0,
    width: STRIP_TILE_WIDTH,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  // Figma 5456:21381: active 16px line (primary/bold_600), inactive 8px
  // lines (text/primary/bold_400), 8 apart, 4px round-capped.
  dots: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    marginTop: theme.spacing.s,
  },
  dot: {
    height: theme.spacing.xs,
    borderRadius: theme.ds.radius.full,
  },
  // #262421 (primary/bold_600) has no ds.* alias yet; figmaCtaLabel is the
  // same hex token.
  dotActive: {
    width: theme.spacing.m,
    backgroundColor: theme.colors.figmaCtaLabel,
  },
  dotInactive: {
    width: theme.spacing.s,
    backgroundColor: theme.ds.color.warm500,
  },
  prompt: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.ds.color.ink,
    textAlign: 'center',
  },
});
