import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { resolveItemImage } from '../../utils/url';
import { OutfitCardCaption } from '../../components/features/OutfitCardCaption';
import { HomeView } from '../../components/features/HomeViewToggleFooter';
import { MOOD_CHIPS } from '../../components/features/mood-chips';
import IconMinusCircle from '../../assets/images/icon_minus_circle.svg';
import IconSparkle from '../../assets/images/icon_sparkle.svg';
import { Favourite, FavouriteItem } from '../../services/favouriteService';

type Props = {
  favourite: Favourite;
  view: HomeView;
  // Per-card date label (e.g. "6 May"), rendered as the first line of the
  // title block above the top divider (Figma `3539:22168`). The screen formats
  // it from `created_at` so the date repeats on every saved outfit.
  dateLabel?: string;
  onRemove: (id: string) => void;
  onSelfVisualization: (favourite: Favourite) => void;
};

// Mood-id → i18n labelKey, reusing the single mood vocab source
// (`mood-chips.ts`) so the favourite pill and the feedback chips stay in lock-
// step with the server vocab. Built once at module load.
// Key type is `string` (not the narrow MoodChipId union) so we can look up an
// arbitrary server-supplied mood id without a cast — unknown ids miss and fall
// back to the prettified-id path below.
const MOOD_LABEL_KEY_BY_ID = new Map<string, string>(
  MOOD_CHIPS.map(chip => [chip.id, chip.labelKey]),
);

// Resolve a saved mood id to its display label. Known ids resolve via the mood
// vocab i18n key (e.g. `confident` → "Confident"); unknown ids (older/extended
// server vocab the client hasn't shipped yet) fall back to a prettified id
// ("not_quite_me" → "Not quite me") so the pill never renders a raw token.
const moodLabel = (id: string, t: TFunction): string => {
  const labelKey = MOOD_LABEL_KEY_BY_ID.get(id);
  if (labelKey) {
    return t(labelKey);
  }
  const words = id.replace(/[_-]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : id;
};

// One saved outfit (Figma `2852:22063`), top→bottom: date → bold outfit title
// → filled mood/vibe-tag pill → caption (bulb/idea) row → 2-column 3:4 tile
// grid → ⊖ remove / "Self visualization" action row. Tile look mirrors the
// Home grid (`HomeScreen` card/cardImage/cardTag styles) so the two screens
// read identically.
//
// RARITY-TAG DIVERGENCE (intentional, CEO-confirmed 2026-06-12): the badge is
// data-driven — it renders ONLY for real common items (`is_common_item === true`).
// Figma `2852:22063` draws a "common" pill on EVERY tile, but that is placeholder
// content. Data-driven rarity is the correct, confirmed behaviour. Do NOT
// "fix" this to match the design's every-tile pill.
const Tile: React.FC<{ item: FavouriteItem; testIDPrefix: string }> = ({
  item,
  testIDPrefix,
}) => {
  const { t } = useTranslation();
  const imageUrl = resolveItemImage(item);
  const isCommon = item.is_common_item === true;

  return (
    <View style={styles.tile} testID={`${testIDPrefix}-tile-${item.id}`}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.tileImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.tileFallback} />
      )}
      {isCommon ? (
        <View style={styles.tag}>
          <Text style={styles.tagText} numberOfLines={1}>
            {t('favourite.common_badge')}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

export const FavouriteOutfitCard: React.FC<Props> = ({
  favourite,
  view,
  dateLabel,
  onRemove,
  onSelfVisualization,
}) => {
  const { t } = useTranslation();
  const items = favourite.outfit_items ?? [];
  const caption = favourite.outfit_context?.reasoning_human;
  const testIDPrefix = `favourite-card-${favourite.id}`;

  // Bold outfit title (Figma `3539:22165`) — rendered only when the backend
  // supplies one. The date is the first line of THIS card's title block
  // (Figma `3539:22168`); it repeats per saved outfit (CEO 2026-06-19),
  // replacing the former screen-level per-day group header.
  const title = favourite.title?.trim();
  // Filled vibe-tag pill (Figma `3539:22327`) — render the FIRST saved mood id,
  // mapped to its display label. Empty/missing `mood_tags` ⇒ no pill.
  const firstMoodId = favourite.mood_tags?.[0];
  const moodTagLabel = firstMoodId ? moodLabel(firstMoodId, t) : null;

  // Chunk items into rows of 2 (grid) or 3 (collage). Collage isn't separately
  // specced for the favourite tile (extraction Open-Q), so it reuses the same
  // 3:4 tiles in a denser flow — matching the Home footer's documented
  // pending-alt-view behaviour.
  const perRow = view === 'collage' ? 3 : 2;
  const rows: FavouriteItem[][] = [];
  for (let i = 0; i < items.length; i += perRow) {
    rows.push(items.slice(i, i + perRow));
  }

  return (
    <View style={styles.card} testID={testIDPrefix}>
      {dateLabel || title || moodTagLabel ? (
        <View style={styles.titleBlock}>
          {dateLabel ? (
            <Text style={styles.date} testID={`${testIDPrefix}-date`}>
              {dateLabel}
            </Text>
          ) : null}
          {title ? (
            <>
              {/* Full-width hairline above the bold title (Figma `3646:10000`). */}
              <View style={styles.titleDivider} />
              <Text
                style={styles.title}
                numberOfLines={2}
                testID={`${testIDPrefix}-title`}
              >
                {title}
              </Text>
              {/* Full-width hairline below the bold title (Figma `3646:9997`). */}
              <View style={styles.titleDivider} />
            </>
          ) : null}
          {moodTagLabel ? (
            <View style={styles.moodPill} testID={`${testIDPrefix}-mood-pill`}>
              <Text style={styles.moodPillText} numberOfLines={1}>
                {moodTagLabel}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <OutfitCardCaption caption={caption} testID={`${testIDPrefix}-caption`} />

      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${favourite.id}-${rowIndex}`} style={styles.row}>
            {row.map(item => (
              <Tile
                key={`${favourite.id}-${item.id}`}
                item={item}
                testIDPrefix={testIDPrefix}
              />
            ))}
            {/* Pad the final row so a lone tile keeps its column width
                instead of stretching full-bleed. */}
            {row.length < perRow
              ? Array.from({ length: perRow - row.length }).map((_, i) => (
                  <View
                    key={`pad-${favourite.id}-${rowIndex}-${i}`}
                    style={styles.tileSpacer}
                  />
                ))
              : null}
          </View>
        ))}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          testID={`favourite-remove-${favourite.id}`}
          accessibilityRole="button"
          accessibilityLabel={t('favourite.remove_a11y')}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.removeButton}
          onPress={() => onRemove(favourite.id)}
        >
          <IconMinusCircle
            width={24}
            height={24}
            color={theme.colors.figmaItemDetailDanger}
          />
        </TouchableOpacity>

        <TouchableOpacity
          testID={`favourite-self-visualization-${favourite.id}`}
          accessibilityRole="button"
          accessibilityLabel={t('favourite.self_visualization')}
          activeOpacity={0.7}
          style={styles.selfVizButton}
          onPress={() => onSelfVisualization(favourite)}
        >
          <Text style={styles.selfVizLabel} numberOfLines={1}>
            {t('favourite.self_visualization')}
          </Text>
          <IconSparkle
            width={24}
            height={24}
            color={theme.colors.figmaAiSparkle}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.m,
  },
  // Title + vibe-tag block (Figma `3539:22168`): centred column, 4px gap,
  // 8px vertical padding. date → divider → title → divider → mood chip.
  titleBlock: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.s,
  },
  // Per-card date — Inter Regular 12/16 (body/xs), text/neutral/base. First
  // line of the title block, above the top divider (CEO 2026-06-19).
  date: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  // Full-width 1px hairline flanking the bold title (Figma divider component
  // `3646:10000` / `3646:9997`). `alignSelf:'stretch'` spans the centred
  // title block to the card content width.
  titleDivider: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: theme.colors.figmaDivider,
  },
  // Bold outfit title — Poppins SemiBold 24/32 (heading/h4), text/neutral/base.
  title: {
    ...theme.typography.aliases.poppinsH4SemiBold,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  // Filled vibe-tag pill (Figma `3539:22327`): bg background/primary/subtle_100
  // (#e0d2c4 = figmaInsightPillBg), height 24, px 12, fully rounded.
  moodPill: {
    height: 24,
    paddingHorizontal: theme.spacing.uacDimension12,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.figmaInsightPillBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Pill label — Inter Regular 10/12 (body/xxs), text/primary/bold_700 (#070707).
  moodPillText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.figmaTextDark,
    textAlign: 'center',
  },
  grid: {
    gap: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  tile: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: theme.borderRadius.s,
    backgroundColor: theme.colors.figmaCardSurface,
    overflow: 'hidden',
  },
  tileSpacer: {
    flex: 1,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.figmaBackground,
  },
  // Rarity badge — centred, pinned 7px from the tile bottom (Figma I…;2595:10239).
  tag: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 7,
    minWidth: 59,
    paddingHorizontal: theme.spacing.uacDimension12,
    height: 15,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.figmaCardTag,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.white,
    textAlign: 'center',
  },
  // Action row (Frame 2031): ⊖ remove + "Self visualization" link, gap 24.
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.l,
  },
  removeButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfVizButton: {
    flex: 1,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.s,
    borderRadius: theme.borderRadius.round,
  },
  selfVizLabel: {
    ...theme.typography.aliases.poppinsButton,
    color: theme.colors.uacTextBase,
    flexShrink: 1,
  },
});
