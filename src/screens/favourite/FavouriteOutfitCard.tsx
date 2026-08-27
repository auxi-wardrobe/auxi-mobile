import React, { useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { LoadableRemoteImage } from '../../components/features/LoadableRemoteImage';
import { resolveItemImage } from '../../utils/url';
import { HomeView } from '../../components/features/HomeViewToggleFooter';
import {
  COLLAGE_ASPECT,
  seedCanvasLayout,
} from '../../components/features/collage-seed-layout';
import { MOOD_CHIPS } from '../../components/features/mood-chips';
import { Favourite, FavouriteItem } from '../../services/favouriteService';
import { TileStatusBadge } from '../../components/features/TileStatusBadge';
import { resolveTileStatus } from '../../utils/tile-status';
import { ITEM_HIT_AREA_RATIO } from '../../components/features/canvas-hit-area';
import { TryOnFeedbackRow } from '../see-this-on-me/TryOnFeedbackRow';

type Props = {
  favourite: Favourite;
  view: HomeView;
  // Per-card date label (e.g. "6 May"), rendered as the first line of the
  // title block above the top divider (Figma `3539:22168`). The screen formats
  // it from `created_at` so the date repeats on every saved outfit.
  dateLabel?: string;
  /**
   * The saved "See on me" photo for THIS outfit (`tryOnResultStore`), when the
   * user already generated one. Present ⇒ the card leads with the try-on hero
   * (photo + scrollable item rail) instead of the plain tile grid; absent ⇒ the
   * card renders exactly as before.
   */
  tryOnImageUrl?: string | null;
  /** Outfit hash the try-on result is keyed on — passed to the feedback vote. */
  outfitHash?: string;
  /** Open an item's detail. Omit to keep tiles non-interactive. */
  onItemPress?: (itemId: string) => void;
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

const remoteUriFromSource = (source: ImageSourcePropType): string => {
  if (typeof source === 'number' || Array.isArray(source)) {
    return '';
  }
  return source.uri ?? '';
};

// AU-392 sweep fix (2026-07-30, qa-ui HIGH finding): the badge's reserved
// vertical footprint inside its anchor box — `TileStatusBadge`'s own
// `bottom: 8` + 24px pill height (`TileStatusBadge.tsx:22-36`).
const BADGE_ANCHOR_HEIGHT = 32;

// Clamp the badge anchor's top so it always stays fully inside the collage
// canvas, regardless of where the item's own frame was seeded. Items are
// intentionally allowed to bleed past the canvas edge (`collageSurface`'s
// `overflow: 'hidden'`, matching Figma `2850:13589`) — but a status badge
// bleeding off-canvas with it is illegible, not a stylistic bleed. Exported
// (pure, no RN deps) so the clamp math is unit-testable without a renderer.
//
// AU-392 designer FAIL fix (2026-07-30, Finding 2): anchor to the item's
// VISIBLE content bottom, not the raw frame bottom. Every garment PNG in the
// collage engine carries the same transparent padding baked in — the
// existing `ITEM_HIT_AREA_RATIO` (0.72, `canvas-hit-area.ts`, mirrored as
// `CONTENT_RATIO` in `collage-seed-layout.ts`) already models that as a
// centered content box inside each item's square frame for hit-testing and
// collision math. The earlier clip fix anchored to the raw frame bottom
// (`itemY + itemHeight`), which is correct only when the frame and the
// visible art coincide; when `resizeMode="contain"` letterboxes the art
// inside a frame sized by the generic layout formula (not the source image's
// real aspect ratio), that left the badge floating in the transparent
// padding below the garment (the blazer case). Reusing the SAME 0.72
// heuristic already established for this exact "frame vs. visible content"
// distinction keeps this DRY rather than inventing a new ratio.
const contentBottom = (itemY: number, itemHeight: number): number =>
  itemY + itemHeight * ((1 + ITEM_HIT_AREA_RATIO) / 2);

export const clampBadgeAnchorTop = (
  itemY: number,
  itemHeight: number,
  canvasHeight: number,
): number => {
  const naturalTop = contentBottom(itemY, itemHeight) - BADGE_ANCHOR_HEIGHT;
  const maxTop = Math.max(0, canvasHeight - BADGE_ANCHOR_HEIGHT);
  return Math.max(0, Math.min(naturalTop, maxTop));
};

// One saved outfit (Figma `2852:22063`), top→bottom: date → bold outfit title
// → filled mood/vibe-tag pill → 2-column 3:4 tile grid. The ⊖ remove /
// "Self visualization" actions are NO LONGER per-card — they live in the
// screen-level sticky `FavouriteActionBar` (CEO 2026-06-27) and act on the
// outfit currently snapped into view. Tile look mirrors the Home grid
// (`HomeScreen` card/cardImage styles; the status pill itself is the shared
// `TileStatusBadge`) so the two screens read identically.
//
// NO bulb/caption "why this" row here (designer rescan BLOCKER fix 1,
// 260619): that left-aligned tan pill belongs to Home + the separate
// `why this` screen, not the favourite card. The card hero is the centred
// title block; when `favourite.title` is empty (old favourites saved before
// the message was persisted) the card degrades cleanly — title line AND its
// flanking dividers are omitted, and NO canned caption is substituted.
//
// RARITY/STATUS TAG (CEO 2026-06-12 + AU-392 2026-07-15): the badge is
// data-driven, never the design's every-tile placeholder pill. AU-392 extends
// it from common-only to the full wardrobe rule via the shared
// `resolveTileStatus` — precedence `new > less_use > common("Macgie") > none`.
// Do NOT re-add an unconditional pill.
const Tile: React.FC<{
  item: FavouriteItem;
  testIDPrefix: string;
  onItemPress?: (itemId: string) => void;
  /** Overrides the grid tile's `flex: 1` sizing (the try-on rail sizes tiles to
   *  the rail width instead of splitting a row). The 3:4 aspect is unchanged. */
  style?: StyleProp<ViewStyle>;
}> = ({ item, testIDPrefix, onItemPress, style }) => {
  const { t } = useTranslation();
  const imageUrl = resolveItemImage(item);
  const status = resolveTileStatus(item);

  return (
    <TouchableOpacity
      style={[styles.tile, style]}
      testID={`${testIDPrefix}-tile-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={t('favourite.view_item_a11y')}
      activeOpacity={0.86}
      disabled={!onItemPress}
      onPress={onItemPress ? () => onItemPress(item.id) : undefined}
    >
      {imageUrl ? (
        <LoadableRemoteImage
          uri={imageUrl}
          resizeMode="cover"
          skeletonTestID={`${testIDPrefix}-image-skeleton-${item.id}`}
        />
      ) : (
        <View style={styles.tileFallback} />
      )}
      {status ? <TileStatusBadge status={status} itemId={item.id} /> : null}
    </TouchableOpacity>
  );
};

// Try-on hero (new Favourite layout, CEO 2026-08-27): once the user has run
// "See on me" on a saved outfit, its GRID card LEADS with that AI photo
// instead of making them re-enter the flow to see it — photo on the left, the
// outfit's own garment tiles in a rail on the right. Cards with no generated
// photo keep the existing full-width tile grid, and the COLLAGE view keeps its
// old design and behaviour throughout (there the photo is opened from the
// action bar, as before).
//
// SIZING. The photo takes 2/3 of the row and locks the try-on render's native
// 9:16 (the same ratio the See-on-me preview fits to), so it claims the right
// height on the FIRST layout pass — no measure-then-grow jump that would shift
// the list and its snap offsets. The rail takes the remaining third.
//
// RAIL. Tiles keep the grid's 3:4 aspect at rail width — they are never
// squashed to fit — so beyond ~2–3 garments the stack is taller than the
// photo. That is the design: the rail is a nested vertical ScrollView bounded
// to the PHOTO's height and the user scrolls WITHIN it to reach the rest (CEO
// 2026-08-27). That bound is the photo's own measured height (`onLayout`), the
// one number flex + aspectRatio can't hand us as a style; the rail mounts on
// the pass after it, since a ScrollView with no height cap would size to its
// content and stretch the row. `nestedScrollEnabled` keeps the inner scroll
// working on Android inside the screen's own snap-scrolling list.
const TRY_ON_ASPECT = 9 / 16; // width / height of the rendered try-on photo

const TryOnHero: React.FC<{
  imageUrl: string;
  items: FavouriteItem[];
  outfitHash: string;
  testIDPrefix: string;
  onItemPress?: (itemId: string) => void;
}> = ({ imageUrl, items, outfitHash, testIDPrefix, onItemPress }) => {
  const { t } = useTranslation();
  const [photoHeight, setPhotoHeight] = useState(0);

  const handlePhotoLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    // Re-measure only on a real height change (onLayout can fire repeatedly).
    setPhotoHeight(prev => (Math.abs(prev - h) > 0.5 ? h : prev));
  };

  return (
    <View style={styles.heroRow} testID={`${testIDPrefix}-try-on-hero`}>
      <View
        style={styles.heroPhoto}
        testID={`${testIDPrefix}-try-on-photo-frame`}
        onLayout={handlePhotoLayout}
      >
        <LoadableRemoteImage
          uri={imageUrl}
          resizeMode="cover"
          imageTestID={`${testIDPrefix}-try-on-photo`}
          skeletonTestID={`${testIDPrefix}-try-on-photo-skeleton`}
        />
        {/* Same thumbs control as the See-on-me result screen. */}
        <TryOnFeedbackRow
          testIDStem={`${testIDPrefix}-feedback`}
          resultUrl={imageUrl}
          outfitHash={outfitHash}
        />
      </View>

      {photoHeight > 0 ? (
        <ScrollView
          testID={`${testIDPrefix}-try-on-rail`}
          style={[styles.heroRail, { height: photoHeight }]}
          contentContainerStyle={styles.heroRailContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          accessibilityLabel={t('favourite.try_on_items_a11y')}
        >
          {items.map(item => (
            <Tile
              key={`${testIDPrefix}-rail-${item.id}`}
              item={item}
              testIDPrefix={testIDPrefix}
              onItemPress={onItemPress}
              style={styles.heroRailTile}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
};

// Collage view for a saved outfit: the SAME overlapping, hand-placed
// arrangement as the Home collage view, not a denser grid. Reuses the shared,
// `Item`-decoupled `seedCanvasLayout` (the seed table lifted from Figma section
// 2850:13589) so the favourite and Home collages render identically. Unlike
// Home's drag-to-play surface this is a static review render — tiles stay
// tappable (open ItemDetail) but aren't draggable, which also avoids fighting
// the list's snap-scroll.
//
// AU-392 D1 (2026-07-30, CEO/user): the status badge now renders here too —
// reversing the earlier "omitted to mirror the Home collage" call, since the
// Home collage shows it now as well (see `CollageSheetCanvas`).
//
// The surface sizes to its CONTAINER via `onLayout` (full content width, locked
// 3:4 via aspectRatio) — NOT a module-level `Dimensions.get()` read, which is
// unreliable on react-native-web (can be 0 at module-eval, collapsing the
// surface) and ignores container width / resize. Items are seeded from the
// measured width and re-seeded when it changes.
const CollageView: React.FC<{
  items: FavouriteItem[];
  testIDPrefix: string;
  onItemPress?: (itemId: string) => void;
}> = ({ items, testIDPrefix, onItemPress }) => {
  const { t } = useTranslation();
  const [surfaceWidth, setSurfaceWidth] = useState(0);

  const seeded = useMemo(
    () =>
      surfaceWidth > 0
        ? seedCanvasLayout(
            items.map(item => ({
              id: item.id,
              imageUri: resolveItemImage(item) || '',
              category: item.category,
              status: resolveTileStatus(item),
            })),
            surfaceWidth,
          )
        : [],
    [items, surfaceWidth],
  );

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    // Re-seed only on a real width change (onLayout can fire repeatedly).
    setSurfaceWidth(prev => (Math.abs(prev - w) > 0.5 ? w : prev));
  };

  if (items.length === 0) {
    return null;
  }

  // Canvas height in px — the surface locks a 3:4 aspect off its measured
  // width (see `collageSurface` style / `COLLAGE_ASPECT`).
  const canvasHeight = surfaceWidth * COLLAGE_ASPECT;

  return (
    <View
      style={styles.collageSurface}
      testID={`${testIDPrefix}-collage`}
      onLayout={handleLayout}
    >
      {seeded.map(node => (
        <TouchableOpacity
          key={node.id}
          testID={`${testIDPrefix}-tile-${node.id}`}
          accessibilityRole="button"
          accessibilityLabel={t('favourite.view_item_a11y')}
          activeOpacity={0.86}
          disabled={!onItemPress}
          onPress={onItemPress ? () => onItemPress(node.id) : undefined}
          style={[
            styles.collageItem,
            {
              left: node.x,
              top: node.y,
              width: node.width,
              height: node.height,
              zIndex: node.zIndex,
            },
          ]}
        >
          <LoadableRemoteImage
            uri={remoteUriFromSource(node.imageSource)}
            resizeMode="contain"
            skeletonTestID={`${testIDPrefix}-image-skeleton-${node.id}`}
          />
        </TouchableOpacity>
      ))}
      {/* Badges render as a separate anchor layer (not nested in the item's own
          frame box) so a bottom-seeded item's intentional edge-bleed never
          drags its badge off-canvas along with it — see
          `clampBadgeAnchorTop` above. `pointerEvents="none"` matches the
          existing collage/canvas badge overlays (visual-only, never steals
          the item's own tap). */}
      {seeded.map(node =>
        node.status ? (
          <View
            key={`${node.id}-badge`}
            pointerEvents="none"
            style={[
              styles.collageBadgeAnchor,
              {
                left: node.x,
                width: node.width,
                top: clampBadgeAnchorTop(node.y, node.height, canvasHeight),
                zIndex: node.zIndex,
              },
            ]}
          >
            <TileStatusBadge status={node.status} itemId={node.id} />
          </View>
        ) : null,
      )}
    </View>
  );
};

export const FavouriteOutfitCard: React.FC<Props> = ({
  favourite,
  view,
  dateLabel,
  tryOnImageUrl,
  outfitHash,
  onItemPress,
}) => {
  const { t } = useTranslation();
  const items = favourite.outfit_items ?? [];
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

  // Grid view chunks items into rows of 2 fixed 3:4 tiles. Collage view renders
  // the overlapping arrangement instead (see `CollageView` below), matching the
  // Home collage view — the favourite collage is no longer a denser grid.
  const PER_ROW = 2;
  const rows: FavouriteItem[][] = [];
  for (let i = 0; i < items.length; i += PER_ROW) {
    rows.push(items.slice(i, i + PER_ROW));
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

      {tryOnImageUrl && view !== 'collage' ? (
        // Grid view only: a generated "See on me" photo exists → lead with it.
        // COLLAGE VIEW IS UNCHANGED (CEO 2026-08-27) — it keeps the old
        // arrangement and the old behaviour, where the saved photo is opened
        // from the action bar's "See on me" instead of shown on the card.
        <TryOnHero
          imageUrl={tryOnImageUrl}
          items={items}
          outfitHash={outfitHash ?? ''}
          testIDPrefix={testIDPrefix}
          onItemPress={onItemPress}
        />
      ) : view === 'collage' ? (
        <CollageView
          items={items}
          testIDPrefix={testIDPrefix}
          onItemPress={onItemPress}
        />
      ) : (
        <View style={styles.grid}>
          {rows.map((row, rowIndex) => (
            <View key={`row-${favourite.id}-${rowIndex}`} style={styles.row}>
              {row.map(item => (
                <Tile
                  key={`${favourite.id}-${item.id}`}
                  item={item}
                  testIDPrefix={testIDPrefix}
                  onItemPress={onItemPress}
                />
              ))}
              {/* Pad the final row so a lone tile keeps its column width
                  instead of stretching full-bleed. */}
              {row.length < PER_ROW
                ? Array.from({ length: PER_ROW - row.length }).map((_, i) => (
                    <View
                      key={`pad-${favourite.id}-${rowIndex}-${i}`}
                      style={styles.tileSpacer}
                    />
                  ))
                : null}
            </View>
          ))}
        </View>
      )}
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
    backgroundColor: theme.colors.figmaDividerSubtle,
  },
  // Bold outfit title — Poppins SemiBold 24/32 (heading/h4), text/neutral/base.
  title: {
    ...theme.typography.aliases.interH4SemiBold,
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
  // Try-on hero: photo left, scrollable garment rail right (see `TryOnHero`).
  // `flex-start` so the rail can be shorter than the photo (it never stretches
  // the row) while the photo's aspect ratio sets the row's height.
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.s,
  },
  // 2/3 of the row (rail takes the remaining 1/3, Figma: 280 / 423), locked to
  // the try-on render's 9:16.
  heroPhoto: {
    flexGrow: 2,
    flexBasis: 0,
    aspectRatio: TRY_ON_ASPECT,
    borderRadius: theme.borderRadius.figmaTile,
    backgroundColor: theme.colors.figmaCardSurface,
    overflow: 'hidden',
  },
  heroRail: {
    flexGrow: 1,
    flexBasis: 0,
  },
  heroRailContent: {
    gap: theme.spacing.xs,
  },
  // Rail tiles drop the grid's `flex: 1` (they fill the rail's width) but keep
  // the same 3:4 aspect — the overflow is what the rail scrolls through.
  heroRailTile: {
    flex: undefined,
    width: '100%',
  },
  // Collage surface — mirrors `OutfitCanvasSurface`: cream tile, 12px radius,
  // overflow hidden so items hand-placed to bleed past the edge are clipped
  // (matching the Home collage view). Full container width with a locked 3:4
  // aspect (aspectRatio = width/height = 1 / COLLAGE_ASPECT) so it sizes from
  // layout, not a module-level Dimensions read.
  collageSurface: {
    width: '100%',
    aspectRatio: 1 / COLLAGE_ASPECT,
    backgroundColor: theme.colors.figmaCardSurface,
    borderRadius: theme.borderRadius.figmaTile,
    overflow: 'hidden',
  },
  collageItem: {
    position: 'absolute',
  },
  // Badge anchor box (AU-392 sweep fix): a slim, clamped-position sibling of
  // `collageItem`, height matches `BADGE_ANCHOR_HEIGHT` so `TileStatusBadge`'s
  // own `bottom: 8` resolves against this box, not the item's own frame.
  collageBadgeAnchor: {
    position: 'absolute',
    height: BADGE_ANCHOR_HEIGHT,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  tile: {
    flex: 1,
    aspectRatio: 3 / 4,
    // Home/Favourite tile parity (CEO 2026-06-19): 12px, matching the Home
    // outfit tiles, not the former square-ish 4px.
    borderRadius: theme.borderRadius.figmaTile,
    backgroundColor: theme.colors.figmaCardSurface,
    overflow: 'hidden',
  },
  tileSpacer: {
    flex: 1,
  },
  tileFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.figmaBackground,
  },
});
