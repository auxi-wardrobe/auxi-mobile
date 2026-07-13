import { StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';

/**
 * Shared styles for the Item Detail read/edit panels + attribute row.
 * Moved verbatim from ItemDetailScreen's StyleSheet (GH-364 de-bloat) so the
 * extracted components render pixel-identically. No token or value changes.
 */
export const itemDetailStyles = StyleSheet.create({
  // Figma "List items": pt 12, column gap 16, centred, text/neutral/base.
  titleBlock: {
    paddingTop: theme.spacing.uacDimension12,
    alignItems: 'center',
    gap: theme.spacing.m,
  },
  titleText: {
    ...theme.typography.aliases.poppinsH4SemiBold,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  dateText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
  },
  // AU-351: "Waiting for the right occasion" status — muted secondary text,
  // centred to match the title block. Token-styled (no hex).
  waitingStatus: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
  },
  // Figma "button group": column, gap 12, pt 16 (pb handled inline with the
  // safe-area inset).
  buttonGroup: {
    paddingTop: theme.spacing.m,
    gap: theme.spacing.uacDimension12,
  },
  // Primary CTA row: the optional square "Change" swap chip sits in front of
  // (left of) the "Build around this" pill, which flexes to fill the rest.
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension12,
  },
  // "Build around this" is now the primary (filled) button. It flexes to fill
  // the row whether or not the swap chip is present. Radius reuses
  // uacButtonCta=16; the filled variant owns its fill + border colour.
  ctaPrimary: {
    flex: 1,
    borderRadius: theme.borderRadius.uacButtonCta,
    paddingHorizontal: theme.spacing.uacButtonPaddingX,
  },
  // Square outline chip matching the primary pill's 56pt height/16 radius.
  swapButton: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.uacButtonCta,
    borderWidth: 1.5,
    borderColor: theme.colors.uacBorderBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    gap: 8,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLabel: {
    ...theme.typography.aliases.poppinsBodySm,
    color: theme.colors.figmaItemDetailRowText,
  },
  rowValue: {
    ...theme.typography.aliases.uacBodyMdSemibold,
    color: theme.colors.figmaItemDetailRowText,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.figmaItemDetailColorDotBorder,
  },
  actionBlock: {
    marginTop: 22,
    gap: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.uacDimension12,
  },
  iconOnlyButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAction: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  secondaryActionActive: {
    backgroundColor: theme.colors.figmaItemDetailLessUsedActive,
  },
  lessUsedText: {
    ...theme.typography.aliases.uacBodyMdMedium,
    color: theme.colors.uacTextBase,
  },
  lessUsedTextActive: {
    color: theme.colors.figmaItemDetailDanger,
  },
  editActionText: {
    ...theme.typography.aliases.uacBodyMdMedium,
    color: theme.colors.uacTextBase,
  },
  editActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  editCancelButton: {
    flex: 1,
    // Figma "Text button / size 56": match the Save pill's height + radius so
    // the two bottom buttons align. PillButton's `text` variant defaults to h40.
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 20,
  },
  editSaveButton: {
    flex: 1,
    borderRadius: 16,
  },
  disabledText: {
    opacity: 0.5,
  },
  skeletonTitle: {
    width: '100%',
    alignSelf: 'center',
  },
  skeletonDate: {
    width: '60%',
    alignSelf: 'center',
  },
});
