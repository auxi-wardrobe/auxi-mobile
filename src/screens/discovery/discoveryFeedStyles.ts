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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: theme.spacing.m,
  },
  gridContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: theme.spacing.m,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
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
