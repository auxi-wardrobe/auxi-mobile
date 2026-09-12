import { StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';

// Landing-page styles. Every value comes from `theme` tokens — no literal hex
// (CLAUDE.md). Horizontal rhythm: one 24px screen gutter (`uacBodyPadding`)
// applied by the scroll content, sections never add a second one.
export const GUTTER = theme.spacing.uacBodyPadding;
/** Today's-picks garment tile: 3 across the gutter-inset row. */
export const PICK_TILE_GAP = theme.spacing.uacDimension12;
/** Discovery strip card aspect (portrait lookbook shot). */
export const DISCOVERY_CARD_RATIO = 3 / 4;

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: GUTTER,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.s,
  },
  greeting: {
    ...theme.typography.aliases.uacH4Bold,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
    marginTop: theme.spacing.l,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.m,
    gap: theme.spacing.m,
  },
  weatherRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  weatherCondition: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
  },
  weatherDetail: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextSubtle100,
    marginTop: theme.spacing.xs,
  },
  weatherPlaceholder: {
    height: 40,
    justifyContent: 'center',
  },

  // ── Section scaffolding ─────────────────────────────────────────────────
  section: {
    marginTop: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...theme.typography.aliases.uacBodyMdMedium,
    color: theme.colors.uacTextBase,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  sectionAction: {
    ...theme.typography.aliases.uacBodyMdRegular,
    color: theme.colors.uacTextSubtle100,
  },

  // ── Today's picks ───────────────────────────────────────────────────────
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.s,
    marginTop: theme.spacing.m,
  },
  chip: {
    backgroundColor: theme.colors.figmaCaptionPillBg,
    borderRadius: theme.borderRadius.m,
    paddingHorizontal: theme.spacing.uacDimension12,
    paddingVertical: theme.spacing.s,
  },
  chipText: {
    ...theme.typography.aliases.uacBodyMdRegular,
    color: theme.colors.uacTextBase,
  },
  pickRow: {
    flexDirection: 'row',
    gap: PICK_TILE_GAP,
    marginTop: theme.spacing.m,
  },
  pickTile: {
    flex: 1,
    aspectRatio: 0.78,
    backgroundColor: theme.colors.figmaCardSurface,
    borderRadius: theme.borderRadius.figmaTile,
    overflow: 'hidden',
  },
  pickTileImage: {
    width: '100%',
    height: '100%',
  },
  pickTileEmpty: {
    flex: 1,
    aspectRatio: 0.78,
    backgroundColor: theme.colors.figmaCardSurface,
    borderRadius: theme.borderRadius.figmaTile,
  },
  pickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.m,
  },
  pickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
    minWidth: 96,
  },
  pickActionEnd: {
    justifyContent: 'flex-end',
  },
  pickActionText: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaCtaLabel,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.figmaDotInactive,
  },
  dotActive: {
    width: 20,
    backgroundColor: theme.colors.figmaChipBg,
  },

  // ── Empty / error states shared by the two feed sections ────────────────
  stateBox: {
    marginTop: theme.spacing.m,
    backgroundColor: theme.colors.figmaCardSurface,
    borderRadius: theme.borderRadius.figmaTile,
    padding: theme.spacing.l,
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  stateTitle: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  stateBody: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextSubtle100,
    textAlign: 'center',
  },
  stateCta: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaCtaLabel,
    marginTop: theme.spacing.xs,
  },

  // ── Discovery strip ─────────────────────────────────────────────────────
  discoveryRow: {
    flexDirection: 'row',
    gap: PICK_TILE_GAP,
    marginTop: theme.spacing.m,
  },
  discoveryCard: {
    flex: 1,
    aspectRatio: DISCOVERY_CARD_RATIO,
    backgroundColor: theme.colors.figmaCardSurface,
    borderRadius: theme.borderRadius.figmaTile,
    overflow: 'hidden',
  },
  discoveryImage: {
    width: '100%',
    height: '100%',
  },

  // ── Popular features ────────────────────────────────────────────────────
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PICK_TILE_GAP,
    marginTop: theme.spacing.m,
  },
  featureTile: {
    // Exactly three per row: a 30% basis leaves room for the two 12px gaps
    // (3 × 30% + 24px fits any phone width; a 4th never does), then flexGrow
    // shares the remainder so the row fills the gutter edge to edge.
    flexBasis: '30%',
    flexGrow: 1,
    minHeight: 96,
    backgroundColor: theme.colors.figmaCardSurface,
    borderRadius: theme.borderRadius.figmaTile,
    padding: theme.spacing.m,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.s,
  },
  featureLabel: {
    ...theme.typography.aliases.uacBodyMdRegular,
    color: theme.colors.uacTextBase,
    flexShrink: 1,
  },
});
