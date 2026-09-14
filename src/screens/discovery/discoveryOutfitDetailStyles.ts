import { StyleSheet } from 'react-native';
import { HEADER_ICON_INSET } from '../../components/layout/Header';
import { theme } from '../../theme/theme';

/** Hairline gutter between the hero cover and each screen edge (design spec). */
export const COVER_SIDE_GUTTER = 1;

/** Ratio used only until the real image reports its own (avoids a 0-height frame). */
export const COVER_FALLBACK_RATIO = 3 / 4;

// Shared styles for DiscoveryOutfitDetailScreen + its extracted
// subcomponents (DiscoveryDetailStates, DiscoveryOutfitSummary) — kept in one
// file so the screen file itself stays under the 200-LOC guideline.
export const discoveryOutfitDetailStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.l,
  },
  stateTitle: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
    textAlign: 'center',
  },
  stateBody: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    maxWidth: 280,
  },
  retryWrap: {
    marginTop: theme.spacing.l,
  },
  // No top padding — the cover is the first thing under the status bar, with
  // the back chip floating on top of it (no header bar on this screen).
  scrollContent: {
    paddingBottom: theme.spacing.l,
  },
  // Floating back chip over the hero image: the canonical 44×44
  // `TopIconButton`, absolutely positioned at the sticky tier so it stays
  // tappable above the scrolling cover. `left` is `HEADER_ICON_INSET` (12,
  // exported by the canonical `Header`) — NOT an eyeballed spacing token: the
  // chip has to land on the same pixel as every other back button in the app,
  // including this screen's own empty-state `Header.BackTitle`, so it doesn't
  // jump when the outfit finishes loading.
  //
  // NO `top` here, on purpose — it is set at runtime as
  // `insets.top + HEADER_ICON_INSET` by the screen. An absolutely-positioned
  // child with an explicit `top` is laid out from its parent's padding-box
  // edge, so the `SafeAreaView edges={['top']}` padding that pushes a normal
  // header down does NOT move this chip: a static `top: 12` put it under the
  // status bar / Dynamic Island, ~47–59px above every other back button.
  floatingBack: {
    position: 'absolute',
    left: HEADER_ICON_INSET,
    zIndex: theme.zIndex.sticky,
  },
  // Hero cover — edge-to-edge but for a 1px hairline gutter each side (design
  // call: the image reads as the top of the screen, not as a card inset from
  // it). NO fixed `aspectRatio` here: the frame adopts the uploaded image's own
  // ratio, measured at runtime in `DiscoveryOutfitSummary`, so a tall or a
  // square composite is never cropped. `overflow: hidden` keeps the image
  // inside the rounded corners.
  coverFrame: {
    marginHorizontal: COVER_SIDE_GUTTER,
    borderRadius: theme.borderRadius.l,
    overflow: 'hidden',
    backgroundColor: theme.colors.figmaCardSurface,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.l,
  },
  coverFallbackText: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.m,
  },
  title: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaTextDark,
  },
  description: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    marginTop: theme.spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.m,
  },
  pill: {
    minHeight: 24,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.figmaCardTag,
    paddingHorizontal: theme.spacing.s,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.uacBackgroundNeutral50,
    textTransform: 'capitalize',
  },
  // Sticky CTA — house treatment per header-footer-rules.md §3b: blur + white
  // tint overlay, z-index tier `sticky`, bottom safe-area respected.
  stickyCta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: theme.zIndex.sticky,
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.s,
    alignItems: 'center',
  },
  stickyCtaTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.figmaBlurTintWhite80,
  },
  ctaButton: {
    alignSelf: 'stretch',
  },
  ctaHint: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
});
