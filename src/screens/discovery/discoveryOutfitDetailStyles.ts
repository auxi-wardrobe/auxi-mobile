import { StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';

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
  scrollContent: {
    paddingBottom: theme.spacing.l,
  },
  coverFrame: {
    width: '100%',
    aspectRatio: 3 / 4,
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
