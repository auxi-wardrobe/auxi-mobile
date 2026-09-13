import { StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';
import { GRID_GAP, HORIZONTAL_PADDING } from './discovery-grid';

// Shared styles for DiscoveryScreen + DiscoveryFeedStates — kept in one file
// so the screen itself stays under the 200-LOC guideline.
export const discoveryFeedStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  // First-load skeleton host — same two-column frame as the real grid.
  grid: {
    flexDirection: 'row',
    gap: GRID_GAP,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: theme.spacing.m,
  },
  // The feed sits above the in-flow AppNavFooter, so it must take the
  // remaining column height rather than sizing to its content.
  list: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: theme.spacing.m,
  },
  // Two independent columns side by side: tiles flow down each one at their
  // own height, which is what staggers the grid. `gap` gives the vertical
  // rhythm the packer assumes (GRID_GAP per tile, see `tileHeight`).
  masonry: {
    flexDirection: 'row',
    gap: GRID_GAP,
  },
  masonryColumn: {
    gap: GRID_GAP,
  },
  footerLoading: {
    marginTop: GRID_GAP,
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
});
