import { StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';

// Result-screen additions on top of `makeItYoursStyles` (tiles, pager, dots).
export const buildAroundResultStyles = StyleSheet.create({
  // A piece the user doesn't own: its tile carries a "Discovery" badge in the
  // top-left corner, inset so it never touches the rounded edge.
  tileBadge: {
    position: 'absolute',
    top: theme.spacing.xs,
    left: theme.spacing.xs,
  },
  titleBlock: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
});
