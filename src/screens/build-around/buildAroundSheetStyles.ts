import { StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';

// "How should we build your outfit?" sheet (Figma: "pop when click build
// around this" / "when click find the best" / "find the best"). Content only —
// the edge-to-edge panel, scrim and motion come from ContextualBottomSheet.

const ICON_CHIP = 28;

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
    marginTop: theme.spacing.s,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    paddingVertical: theme.spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.figmaDivider,
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
  styleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    marginTop: theme.spacing.m,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
    marginTop: theme.spacing.m,
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
