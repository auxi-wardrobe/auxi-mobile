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
    ...theme.typography.aliases.poppinsH4SemiBold,
    color: theme.colors.figmaTextDark,
    textAlign: 'center',
  },
  emptyBody: {
    ...theme.typography.aliases.poppinsBodySm,
    color: theme.colors.uacTextSubtle200,
    textAlign: 'center',
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
    ...theme.typography.aliases.poppinsBodySm,
    color: theme.colors.uacTextSubtle200,
  },
  // Detail header block
  detailName: {
    ...theme.typography.aliases.poppinsH4SemiBold,
    color: theme.colors.figmaTextDark,
    marginTop: theme.spacing.s,
  },
  detailMeta: {
    ...theme.typography.aliases.poppinsBodySm,
    color: theme.colors.uacTextSubtle200,
    marginTop: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaTextDark,
    marginTop: theme.spacing.l,
    marginBottom: theme.spacing.s,
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
    ...theme.typography.aliases.poppinsBodySm,
    color: theme.colors.uacTextSubtle200,
  },
  summaryValue: {
    ...theme.typography.aliases.poppinsBodySm,
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
    ...theme.typography.aliases.poppinsBodySm,
    color: theme.colors.figmaTextDark,
  },
  gapsItem: {
    ...theme.typography.aliases.poppinsBodySm,
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
  // Generating screen
  generatingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.l,
    gap: theme.spacing.m,
  },
  generatingTitle: {
    ...theme.typography.aliases.poppinsH4SemiBold,
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
    ...theme.typography.aliases.poppinsBodySm,
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
    ...theme.typography.aliases.poppinsH4SemiBold,
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
    ...theme.typography.aliases.poppinsSemiboldXsSm,
    color: theme.colors.uacTextBase,
    paddingHorizontal: theme.spacing.s,
    paddingTop: theme.spacing.s,
  },
  sheetHelper: {
    ...theme.typography.aliases.poppinsBodySm,
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
  deleteWrap: {
    marginTop: theme.spacing.l,
  },
  editDeleteGap: {
    height: theme.spacing.s,
  },
});
