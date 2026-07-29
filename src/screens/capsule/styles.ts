import { StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';

/**
 * Shared Capsule Wardrobe styles. Tokens only — no literal hex/spacing
 * (theme.colors / theme.spacing / theme.typography.aliases / theme.borderRadius).
 */
export const capsuleStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  body: {
    flex: 1,
    paddingHorizontal: theme.spacing.m,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.xxl,
  },
  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.l,
    gap: theme.spacing.m,
  },
  emptyTitle: {
    ...theme.typography.aliases.interH4SemiBold,
    color: theme.colors.figmaTextDark,
    textAlign: 'center',
  },
  emptyBody: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.uacTextSubtle200,
    textAlign: 'center',
  },
  // Empty item grid (a freshly created capsule has no pieces yet — the user
  // adds them via the header +). Lives inside the detail ScrollView, so it
  // pads rather than flex-centres.
  emptyItems: {
    alignItems: 'center',
    gap: theme.spacing.s,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.l,
  },
  // List card
  card: {
    backgroundColor: theme.colors.figmaCardSurface,
    borderRadius: theme.borderRadius.figmaTile,
    padding: theme.spacing.m,
    marginTop: theme.spacing.m,
    gap: theme.spacing.xs,
  },
  cardTitle: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaTextDark,
  },
  cardMeta: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.uacTextSubtle200,
  },
  // Detail header block
  detailName: {
    ...theme.typography.aliases.interH4SemiBold,
    color: theme.colors.figmaTextDark,
    marginTop: theme.spacing.s,
  },
  detailMeta: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.uacTextSubtle200,
    marginTop: theme.spacing.xs,
  },
  // Item grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
  },
  // Summary panel
  summaryPanel: {
    backgroundColor: theme.colors.figmaCardSurface,
    borderRadius: theme.borderRadius.figmaTile,
    padding: theme.spacing.m,
    marginTop: theme.spacing.m,
    gap: theme.spacing.s,
  },
  summaryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryToggleText: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaTextDark,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  summaryLabel: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.uacTextSubtle200,
  },
  summaryValue: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextDark,
  },
  // Gaps banner
  gapsBanner: {
    backgroundColor: theme.colors.figmaInsightPillBg,
    borderRadius: theme.borderRadius.figmaTile,
    padding: theme.spacing.m,
    marginTop: theme.spacing.m,
    gap: theme.spacing.xs,
  },
  gapsText: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextDark,
  },
  gapsItem: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.uacTextSubtle100,
  },
  // Form
  fieldLabel: {
    ...theme.typography.aliases.uacBodyMdMedium,
    color: theme.colors.figmaTextDark,
    marginTop: theme.spacing.l,
    marginBottom: theme.spacing.s,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: theme.spacing.s,
  },
  flex1: { flex: 1 },
  footerCta: {
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.s,
    paddingBottom: theme.spacing.m,
  },
  // Two-up footer (Cancel · Next) — the build-method step.
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.s,
    paddingBottom: theme.spacing.m,
  },
  footerRowSecondary: { flex: 1 },
  footerRowPrimary: { flex: 1.4 },
  // Build-method step (name row + the two build options)
  methodNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    paddingVertical: theme.spacing.m,
  },
  methodName: {
    ...theme.typography.aliases.interH4SemiBold,
    color: theme.colors.figmaTextDark,
    flex: 1,
  },
  // Bare 44×44 tap target for the rename pencil / commit tick (no header chip).
  methodNameEdit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
    paddingVertical: theme.spacing.m,
  },
  methodOptionBody: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  methodOptionTitle: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaTextDark,
  },
  methodOptionDesc: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.uacTextSubtle200,
  },
  // "Coming soon" pill under the AI option's description.
  methodBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.figmaSnackbarSuccessBg,
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  methodBadgeText: {
    ...theme.typography.aliases.uacBodyXsMedium,
    color: theme.colors.figmaTextDark,
  },
  // Generating screen
  generatingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.l,
    gap: theme.spacing.m,
  },
  generatingTitle: {
    ...theme.typography.aliases.interH4SemiBold,
    color: theme.colors.figmaTextDark,
    textAlign: 'center',
    marginTop: theme.spacing.l,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    alignSelf: 'stretch',
    paddingVertical: theme.spacing.xs,
  },
  stepText: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.uacTextSubtle200,
  },
  stepTextActive: {
    color: theme.colors.figmaTextDark,
  },
  leaveWrap: {
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.xl,
  },
  // Item detail
  itemDetailImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.borderRadius.figmaTile,
    backgroundColor: theme.colors.figmaCardSurface,
  },
  itemDetailName: {
    ...theme.typography.aliases.interH4SemiBold,
    color: theme.colors.figmaTextDark,
    marginTop: theme.spacing.m,
  },
  itemDetailActions: {
    flexDirection: 'row',
    gap: theme.spacing.s,
    marginTop: theme.spacing.l,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Sheet
  sheetTitle: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.uacTextBase,
    paddingHorizontal: theme.spacing.s,
    paddingTop: theme.spacing.s,
  },
  sheetHelper: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.uacTextSubtle200,
    paddingHorizontal: theme.spacing.s,
    paddingBottom: theme.spacing.s,
  },
  sheetLoading: {
    height: 160,
  },
  sheetScroll: {
    maxHeight: 360,
  },
  sheetConfirm: {
    paddingTop: theme.spacing.s,
  },
  // Edit · Delete sit side by side (equal halves) at the foot of the detail.
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    marginTop: theme.spacing.l,
  },
  detailAction: {
    flex: 1,
  },
});
