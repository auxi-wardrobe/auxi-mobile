import React from 'react';
import {
  Image,
  ImageSourcePropType,
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { theme } from '../../theme/theme';

/**
 * Selection tile primitive — a 3:4 media card with a bottom-center caption pill.
 *
 * Two visual variants:
 *  - `legacy` (default): the original look used by `StylePreferenceScreen`
 *    (#DEDEDE bg, Manrope 8px label, rgba(39,42,50,*) pills). DO NOT change —
 *    it keeps the flag-OFF fallback flow pixel-stable.
 *  - `v2`: the onboarding-redesign look (Figma node 2849:8331) — `figmaCardSurface`
 *    (#f2efec) bg, radius 12 (`figmaTile`), caption pill `figmaCardTag`
 *    (rgba(18,18,18,0.75), per D5) with Inter 10/12 label (`interCaptionXxs`).
 *    Selected = 4px `uacTextBase` border; dimmed = opacity 0.5; an optional
 *    numbered pin badge (D6 — View + number, max-2 ranking) sits top-right.
 *
 * Keeping ONE primitive (extend, don't fork) per DRY; the variant prop walls
 * off the two token sets so neither flow drifts into the other.
 */
type SelectionCardVariant = 'legacy' | 'v2';

interface OnboardingSelectionCardProps {
  label: string;
  selected: boolean;
  dimmed?: boolean;
  /** Visual token set. Defaults to the legacy look for existing callers. */
  variant?: SelectionCardVariant;
  /** v2 only — 1-based pick order shown in a top-right pin badge (D6). */
  pinNumber?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

interface OnboardingSelectionFigureProps {
  source: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  /**
   * v2 tiles inset the flat-lay so the cream `figmaCardSurface` shows as a
   * margin (Figma "Image 3:4" insets the garment ~9.5% V / 18px H). Default
   * `false` keeps legacy full-bleed behaviour.
   */
  inset?: boolean;
  /** Defaults to `cover`; v2 flat-lays use `contain` to avoid cropping. */
  resizeMode?: 'cover' | 'contain';
}

export const OnboardingSelectionCard: React.FC<
  OnboardingSelectionCardProps
> = ({
  label,
  selected,
  dimmed,
  variant = 'legacy',
  pinNumber,
  style,
  children,
}) => {
  const isV2 = variant === 'v2';
  return (
    <View
      style={[
        styles.card,
        isV2 && styles.cardV2,
        selected && (isV2 ? styles.cardSelectedV2 : styles.cardSelected),
        dimmed && styles.cardDimmed,
        style,
      ]}
    >
      <View style={styles.artwork}>{children}</View>
      {isV2 && pinNumber != null ? (
        <View
          style={styles.pinBadge}
          accessibilityLabel={`Pinned #${pinNumber}`}
          testID={`onboarding-style-pin-${pinNumber}`}
        >
          <Text style={styles.pinBadgeText}>{pinNumber}</Text>
        </View>
      ) : null}
      <View style={styles.labelSlot}>
        <View
          style={[
            styles.labelPill,
            isV2 && styles.labelPillV2,
            !isV2 && selected && styles.labelPillSelected,
          ]}
        >
          <Text
            style={[
              styles.labelText,
              isV2 && styles.labelTextV2,
              !isV2 && selected && styles.labelTextSelected,
            ]}
          >
            {label}
          </Text>
        </View>
      </View>
    </View>
  );
};

export const OnboardingSelectionFigure: React.FC<
  OnboardingSelectionFigureProps
> = ({ source, style, imageStyle, inset = false, resizeMode = 'cover' }) => (
  <View style={[styles.figureFrame, inset && styles.figureFrameInset, style]}>
    <Image
      source={source}
      resizeMode={resizeMode}
      style={[styles.figureImage, imageStyle]}
    />
  </View>
);

const styles = StyleSheet.create({
  card: {
    aspectRatio: 183 / 244,
    backgroundColor: '#DEDEDE',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  // v2: 3:4 ratio + onboarding-redesign tile surface + 12px radius (figmaTile).
  cardV2: {
    aspectRatio: 3 / 4,
    backgroundColor: theme.colors.figmaCardSurface,
    borderRadius: theme.borderRadius.figmaTile,
    borderWidth: 4,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderWidth: 4,
    borderColor: theme.colors.figmaAction,
  },
  // v2 selected: 4px solid border = border/neutral/base (#1d1f23 → uacTextBase).
  cardSelectedV2: {
    borderColor: theme.colors.uacTextBase,
  },
  cardDimmed: {
    opacity: 0.5,
  },
  artwork: {
    ...StyleSheet.absoluteFillObject,
  },
  labelSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  labelPill: {
    minWidth: 69,
    height: 24, // chip size SM
    paddingHorizontal: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: 'rgba(39, 42, 50, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // v2 caption pill: rgba(18,18,18,0.75) (figmaCardTag, D5), full radius-8 chip
  // floated above the tile bottom (Figma Frame 2034 sits ~16px above the edge).
  labelPillV2: {
    backgroundColor: theme.colors.figmaCardTag,
    borderRadius: 8,
    marginBottom: theme.spacing.m,
  },
  labelPillSelected: {
    backgroundColor: 'rgba(39, 42, 50, 0.85)',
  },
  labelText: {
    // Chip size SM (24px height) → 10px font per chip sizing spec.
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    lineHeight: 12,
    color: '#87898B',
    textAlign: 'center',
  },
  // v2 caption label: Inter Regular 10/12 (interCaptionXxs), light on dark pill.
  labelTextV2: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.uacBackgroundNeutral50,
  },
  labelTextSelected: {
    color: theme.colors.white,
  },
  // v2 pin badge (D6): 34×34 dark rounded square, white order number, top-right.
  pinBadge: {
    position: 'absolute',
    top: theme.spacing.s,
    right: theme.spacing.s,
    width: 34,
    height: 34,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.uacTextBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBadgeText: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacBackgroundNeutral50,
  },
  figureFrame: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  // v2 inset: garment sits within the tile with cream margin (Figma "Image 3:4"
  // insets the flat-lay ~9.5% vertical / ~10% horizontal of the tile). Use
  // padding (not absolute %-insets) so the Image keeps a concrete flex box to
  // measure into — bare nested absoluteFill collapses the Image to 0×0 under
  // `resizeMode="contain"` and never paints (the blank-tile bug).
  figureFrameInset: {
    paddingVertical: '9.5%',
    paddingHorizontal: '10%',
  },
  // Concrete bounds: fill the (possibly inset-padded) frame. Without a definite
  // size, `resizeMode="contain"` has no box to fit the image into and renders
  // nothing even with a valid source.
  figureImage: {
    width: '100%',
    height: '100%',
  },
});
