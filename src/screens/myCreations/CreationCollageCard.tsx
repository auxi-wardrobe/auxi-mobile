import React, { useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme/theme';
import { COLLAGE_ASPECT } from '../../components/features/collage-seed-layout';
import IconMinusCircle from '../../assets/images/icon_minus_circle.svg';
import IconCalendarAdd from '../../assets/images/icon_calendar_add.svg';
import IconSparkle from '../../assets/images/icon_sparkle.svg';
import { Creation } from '../../services/creationsService';
import { formatDateLabel } from '../favourite/group-by-date';

type Props = {
  creation: Creation;
  onRemove: (id: string) => void;
  /**
   * Add this creation to the Schedule (calendar) page. When provided, a
   * calendar-add button renders next to Remove. Omit it (e.g. when the card is
   * itself rendered ON the Schedule page) to hide the button.
   */
  onSchedule?: (creation: Creation) => void;
  /**
   * Launch Self Visualization / virtual try-on for this creation. When provided,
   * a sparkle button renders in the action row. The parent omits it when the
   * creation has no recoverable wardrobe item ids (older saves), so the button
   * never launches a try-on that would fail.
   */
  onVisualize?: (creation: Creation) => void;
};

// A saved creation rendered as a static collage card. Visually mirrors the
// Favourite page's collage view (`FavouriteOutfitCard` → `CollageView`): the
// same cream 3:4 surface, 12px radius, overflow-clipped overlapping items, with
// the per-card date line + tag pills above and a ⊖ remove action below.
//
// Unlike the favourite collage — which RE-SEEDS positions from `seedCanvasLayout`
// — a creation IS the user's own canvas arrangement, so we replay their saved
// transforms verbatim, only rescaling by (surfaceWidth / canvasWidth) since the
// card is narrower than the editor. scale/rotation are reapplied as the editor
// did (RN transforms are centre-anchored), so the card matches what was saved.
export const CreationCollageCard: React.FC<Props> = ({
  creation,
  onRemove,
  onSchedule,
  onVisualize,
}) => {
  const { t } = useTranslation();
  const [surfaceWidth, setSurfaceWidth] = useState(0);
  const testIDPrefix = `creation-card-${creation.id}`;

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setSurfaceWidth(prev => (Math.abs(prev - w) > 0.5 ? w : prev));
  };

  // Rescale the editor-space transforms to this card's width. Guard against a
  // missing/zero canvasWidth (older/garbled records) by falling back to 1:1.
  const factor =
    surfaceWidth > 0 && creation.canvasWidth > 0
      ? surfaceWidth / creation.canvasWidth
      : 0;

  const dateLabel = formatDateLabel(creation.created_at);

  return (
    <View style={styles.card} testID={testIDPrefix}>
      <View style={styles.titleBlock}>
        {creation.name ? (
          <Text
            style={styles.name}
            numberOfLines={2}
            testID={`${testIDPrefix}-name`}
          >
            {creation.name}
          </Text>
        ) : null}
        {dateLabel ? (
          <Text style={styles.date} testID={`${testIDPrefix}-date`}>
            {dateLabel}
          </Text>
        ) : null}
        {creation.tags.length > 0 ? (
          <View style={styles.tagsRow}>
            {creation.tags.map(tag => (
              <View
                key={tag}
                style={styles.moodPill}
                testID={`${testIDPrefix}-tag-${tag}`}
              >
                <Text style={styles.moodPillText} numberOfLines={1}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View
        style={styles.collageSurface}
        testID={`${testIDPrefix}-collage`}
        onLayout={handleLayout}
      >
        {factor > 0
          ? creation.items.map(item => (
              <View
                key={item.id}
                testID={`${testIDPrefix}-tile-${item.id}`}
                style={[
                  styles.collageItem,
                  {
                    left: item.x * factor,
                    top: item.y * factor,
                    width: item.width * factor,
                    height: item.height * factor,
                    zIndex: item.zIndex,
                    transform: [
                      { scale: item.scale ?? 1 },
                      { rotate: `${item.rotation ?? 0}deg` },
                    ],
                  },
                ]}
              >
                <Image
                  source={{ uri: item.imageUri }}
                  style={styles.collageImage}
                  resizeMode="contain"
                />
              </View>
            ))
          : null}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          testID={`creation-remove-${creation.id}`}
          accessibilityRole="button"
          accessibilityLabel={t('myCreations.remove_a11y')}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.removeButton}
          onPress={() => onRemove(creation.id)}
        >
          <IconMinusCircle
            width={24}
            height={24}
            color={theme.colors.figmaItemDetailDanger}
          />
        </TouchableOpacity>

        {/* Self Visualization / try-on (sparkle). Rendered only when the screen
            supplies an `onVisualize` handler — omitted when the creation has no
            recoverable wardrobe ids, so it can't launch a try-on that'd fail. */}
        {onVisualize ? (
          <TouchableOpacity
            testID={`creation-visualize-${creation.id}`}
            accessibilityRole="button"
            accessibilityLabel={t('myCreations.self_visualization')}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.visualizeButton}
            onPress={() => onVisualize(creation)}
          >
            <IconSparkle
              width={24}
              height={24}
              color={theme.colors.figmaAiSparkle}
            />
          </TouchableOpacity>
        ) : null}

        {/* Add this creation to the Schedule (calendar-with-plus). Rendered only
            when the screen supplies an `onSchedule` handler. */}
        {onSchedule ? (
          <TouchableOpacity
            testID={`creation-schedule-${creation.id}`}
            accessibilityRole="button"
            accessibilityLabel={t('myCreations.add_to_schedule')}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.scheduleButton}
            onPress={() => onSchedule(creation)}
          >
            <IconCalendarAdd
              width={24}
              height={24}
              color={theme.colors.uacTextBase}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.m,
  },
  titleBlock: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.s,
  },
  // Creation name — Poppins SemiBold 24/32, #1d1f23 (rgb(29,31,35)), centred at
  // the top of the card. Same alias the Favourite page title uses.
  name: {
    ...theme.typography.aliases.poppinsH4SemiBold,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  date: {
    ...theme.typography.aliases.uacBodyXsRegular,
    color: theme.colors.uacTextBase,
    textAlign: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  // Filled vibe-tag pill — same token treatment as the favourite mood pill.
  moodPill: {
    height: 24,
    paddingHorizontal: theme.spacing.uacDimension12,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.figmaInsightPillBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodPillText: {
    ...theme.typography.aliases.interCaptionXxs,
    color: theme.colors.figmaTextDark,
    textAlign: 'center',
  },
  // Collage surface — identical look to FavouriteOutfitCard.collageSurface:
  // full-width cream tile, locked 3:4, items clipped to the rounded bounds.
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
  collageImage: {
    width: '100%',
    height: '100%',
  },
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
  scheduleButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualizeButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
