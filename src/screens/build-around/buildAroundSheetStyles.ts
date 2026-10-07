import { StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';

// "How should we build your outfit?" sheet (Figma: "pop when click build
// around this" / "when click find the best" / "find the best"). Content only —
// the edge-to-edge panel, scrim and motion come from ContextualBottomSheet.

const ICON_CHIP = 28;
// Half the gutter between the 3-column style chips (cells pad, row un-pads).
const CHIP_HALF_GAP = theme.spacing.s / 2;

export const buildAroundSheetStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  headerIcon: {
    width: 24,
    height: 24,
    borderRadius: theme.ds.radius.full,
    backgroundColor: theme.ds.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.ds.color.ink,
  },
  intro: {
    ...theme.typography.aliases.interBodySm,
    color: theme.ds.color.ink,
    marginTop: theme.spacing.s,
  },
  options: {
    marginTop: theme.spacing.m,
    gap: theme.spacing.s,
  },
  // Every option sits in a card; only the selected one is filled, so the
  // content never shifts when the selection moves.
  optionCard: {
    borderRadius: theme.ds.radius.sm,
    paddingHorizontal: theme.spacing.uacDimension12,
  },
  optionCardOn: {
    backgroundColor: theme.ds.color.cream,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    paddingVertical: theme.spacing.m,
  },
  optionIcon: {
    width: ICON_CHIP,
    height: ICON_CHIP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.ds.color.ink,
  },
  optionDescription: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.ds.color.ink,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: theme.ds.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.figmaDivider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    backgroundColor: theme.ds.color.ink,
    borderColor: theme.ds.color.ink,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: theme.ds.radius.full,
    backgroundColor: theme.ds.color.white,
  },
  styleSection: {
    paddingBottom: theme.spacing.uacDimension12,
  },
  styleTitle: {
    ...theme.typography.aliases.interBodySm,
    color: theme.ds.color.ink,
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: theme.spacing.s,
    marginTop: theme.spacing.m,
    marginHorizontal: -CHIP_HALF_GAP,
  },
  chipCell: {
    width: '33.333%',
    paddingHorizontal: CHIP_HALF_GAP,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension12,
    marginTop: theme.spacing.l,
  },
  grow: { flex: 1 },
  // Loading / error body.
  stateBlock: {
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  stateTitle: {
    ...theme.typography.aliases.interH4SemiBold,
    color: theme.ds.color.ink,
    textAlign: 'center',
  },
  step: {
    ...theme.typography.aliases.interBodySm,
    color: theme.ds.color.ink,
    textAlign: 'center',
  },
  stateBody: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.ds.color.ink,
    textAlign: 'center',
  },
});
